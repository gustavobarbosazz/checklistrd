-- ============================================================
-- RDChecklist — Schema Supabase (Postgres)
-- Rode este arquivo inteiro em: Supabase Dashboard > SQL Editor > New query > Run
-- ============================================================

-- ---------- EXTENSÕES ----------
create extension if not exists "pgcrypto";

-- ============================================================
-- 1) PROFILES (estende auth.users da Supabase Auth)
--    A Supabase Auth já cuida de email/senha/hash/sessão.
--    Esta tabela guarda os campos de negócio: role, cargo, unidade, etc.
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'user' check (role in ('user','admin','owner')),
  cargo text,
  unidade text,
  status text not null default 'active' check (status in ('active','inactive')),
  must_change_password boolean not null default true,
  password_created boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Cria automaticamente um profile quando alguém é criado em auth.users
-- (equivalente ao antigo "base44.users.inviteUser" + flags do primeiro acesso)
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, must_change_password, password_created)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)),
    coalesce((new.raw_user_meta_data->>'must_change_password')::boolean, true),
    coalesce((new.raw_user_meta_data->>'password_created')::boolean, false)
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Helper: papel do usuário logado (usado nas policies abaixo)
create or replace function public.my_role()
returns text as $$
  select role from public.profiles where id = auth.uid();
$$ language sql stable security definer;

create or replace function public.is_admin()
returns boolean as $$
  select public.my_role() in ('admin','owner');
$$ language sql stable security definer;

-- ============================================================
-- 2) EVENTS
-- ============================================================
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  date date not null,
  location text not null,
  coordinator_email text,
  status text not null default 'planning' check (status in ('planning','in_progress','completed')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 3) MALOTES
-- ============================================================
create table if not exists public.malotes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  tipo text not null,               -- cargo (ex.: "Fiscal de Sala")
  category text not null check (category in ('geral','por_andar')),
  andar text not null check (andar in ('terreo','1o','2o','3o','4o','5o','geral')),
  responsavel_email text,
  status text not null default 'pending' check (status in ('pending','in_progress','completed')),
  progress int not null default 0,
  total_items int not null default 0,
  checked_items int not null default 0,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 4) MALOTE_ITEMS
-- ============================================================
create table if not exists public.malote_items (
  id uuid primary key default gen_random_uuid(),
  malote_id uuid not null references public.malotes(id) on delete cascade,
  name text not null,
  quantity text not null default '1',
  checked boolean not null default false,
  observation text,
  checked_by uuid references public.profiles(id),
  checked_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ============================================================
-- 5) AUDIT_LOGS (imutável)
-- ============================================================
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  data_hora timestamptz not null default now(),
  usuario_id uuid references public.profiles(id),
  nome_usuario text,
  email_usuario text,
  perfil_usuario text,
  acao text not null,
  modulo text not null check (modulo in ('Autenticação','Usuários','Checklists','Sistema','Dashboard','Eventos','Malotes','Relatórios')),
  item_afetado text,
  unidade text,
  valor_anterior text,
  valor_novo text,
  detalhes text,
  resultado text not null default 'Sucesso' check (resultado in ('Sucesso','Falha','Alerta'))
);

-- ============================================================
-- ÍNDICES
-- ============================================================
create index if not exists idx_malotes_event on public.malotes(event_id);
create index if not exists idx_items_malote on public.malote_items(malote_id);
create index if not exists idx_audit_data on public.audit_logs(data_hora desc);
create index if not exists idx_audit_usuario on public.audit_logs(usuario_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.malotes enable row level security;
alter table public.malote_items enable row level security;
alter table public.audit_logs enable row level security;

-- ---------- PROFILES ----------
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles_update_self_or_admin" on public.profiles;
create policy "profiles_update_self_or_admin" on public.profiles
  for update to authenticated using (id = auth.uid() or public.is_admin());

-- ---------- EVENTS ----------
drop policy if exists "events_select_all" on public.events;
create policy "events_select_all" on public.events
  for select to authenticated using (true);

drop policy if exists "events_insert_authenticated" on public.events;
create policy "events_insert_authenticated" on public.events
  for insert to authenticated with check (true);

drop policy if exists "events_update_owner_or_admin" on public.events;
create policy "events_update_owner_or_admin" on public.events
  for update to authenticated using (
    created_by = auth.uid()
    or coordinator_email = (select email from public.profiles where id = auth.uid())
    or public.is_admin()
  );

drop policy if exists "events_delete_owner_or_admin" on public.events;
create policy "events_delete_owner_or_admin" on public.events
  for delete to authenticated using (created_by = auth.uid() or public.is_admin());

-- ---------- MALOTES ----------
drop policy if exists "malotes_select_all" on public.malotes;
create policy "malotes_select_all" on public.malotes
  for select to authenticated using (true);

drop policy if exists "malotes_insert_authenticated" on public.malotes;
create policy "malotes_insert_authenticated" on public.malotes
  for insert to authenticated with check (true);

drop policy if exists "malotes_update_authenticated" on public.malotes;
create policy "malotes_update_authenticated" on public.malotes
  for update to authenticated using (true);

drop policy if exists "malotes_delete_owner_or_admin" on public.malotes;
create policy "malotes_delete_owner_or_admin" on public.malotes
  for delete to authenticated using (created_by = auth.uid() or public.is_admin());

-- ---------- MALOTE_ITEMS ----------
drop policy if exists "items_select_all" on public.malote_items;
create policy "items_select_all" on public.malote_items
  for select to authenticated using (true);

drop policy if exists "items_insert_authenticated" on public.malote_items;
create policy "items_insert_authenticated" on public.malote_items
  for insert to authenticated with check (true);

drop policy if exists "items_update_authenticated" on public.malote_items;
create policy "items_update_authenticated" on public.malote_items
  for update to authenticated using (true);

drop policy if exists "items_delete_owner_or_admin" on public.malote_items;
create policy "items_delete_owner_or_admin" on public.malote_items
  for delete to authenticated using (created_by = auth.uid() or public.is_admin());

-- ---------- AUDIT_LOGS (criação livre, leitura só admin/owner, imutável) ----------
drop policy if exists "audit_insert_authenticated" on public.audit_logs;
create policy "audit_insert_authenticated" on public.audit_logs
  for insert to authenticated with check (true);

drop policy if exists "audit_select_admin_owner" on public.audit_logs;
create policy "audit_select_admin_owner" on public.audit_logs
  for select to authenticated using (public.is_admin());

-- Sem policy de update/delete em audit_logs = ninguém pode alterar ou apagar (imutável).

-- ============================================================
-- REALTIME (liga as tabelas às subscrições em tempo real do Supabase)
-- ============================================================
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.malotes;
alter publication supabase_realtime add table public.malote_items;
alter publication supabase_realtime add table public.audit_logs;

-- ============================================================
-- PRIMEIRO OWNER (rode manualmente depois de criar sua conta pelo app)
-- ============================================================
-- 1. Crie sua conta normalmente pela tela de login/registro do app.
-- 2. Depois rode (trocando o e-mail):
--
-- update public.profiles set role = 'owner', must_change_password = false, password_created = true
-- where email = 'seuemail@empresa.com';
