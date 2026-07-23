-- ============================================================
-- RDChecklist — Migração 003: Unidades e Cargos configuráveis pelo site
-- Rode isso no SQL Editor do Supabase (depois da migração 002)
-- ============================================================

-- ---------- UNIDADES ----------
create table if not exists public.unidades (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  andares text[] not null default '{}',
  ordem int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.unidades enable row level security;

drop policy if exists "unidades_select_all" on public.unidades;
create policy "unidades_select_all" on public.unidades for select to authenticated using (true);

drop policy if exists "unidades_write_admin" on public.unidades;
create policy "unidades_write_admin" on public.unidades for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- CARGOS ----------
create table if not exists public.cargos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tier text not null default 'Geral',
  tem_andar boolean not null default false,
  itens text[] not null default '{}',
  ordem int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cargos enable row level security;

drop policy if exists "cargos_select_all" on public.cargos;
create policy "cargos_select_all" on public.cargos for select to authenticated using (true);

drop policy if exists "cargos_write_admin" on public.cargos;
create policy "cargos_write_admin" on public.cargos for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- SEED: mesmos dados que já estavam fixos no código ----------
insert into public.unidades (nome, andares, ordem) values
  ('Unidade I', array['1o','2o','3o','4o','5o'], 1),
  ('Unidade II', array['3o','5o','6o','7o','8o'], 2)
on conflict do nothing;

insert into public.cargos (nome, tier, tem_andar, itens, ordem) values
  ('Coordenação Geral', 'Coordenação (sem andar)', false,
    array['Coletes','Crachás','Pasta de documentos','Guardanapo','Envelope de segurança','Lacres de malotes','Kits salas','Grampeador','Canetas'], 1),
  ('Subcoordenação Geral', 'Coordenação (sem andar)', false,
    array['Coletes','Crachás','Pasta de documentos','Buchinhas de cabelo','Copos','Envelopes de segurança','Grampeador','Canetas','Atas'], 2),
  ('Itinerante Geral', 'Coordenação (sem andar)', false,
    array['Coletes extras','Envelopes de segurança tamanho G','Envelopes de segurança tamanho M','Crachás','Copos'], 3),
  ('Organizador Geral', 'Coordenação (sem andar)', false,
    array['Coletes','Copos','Lacres de malote','Envelopes de segurança','Guardanapos','Pasta de documentos','Grampeador','Detector de metal extra','Bateria extra','Buchinhas de cabelo','Colete extra','Crachás (Itinerante, Extra e Fiscal de Apoio)','Envelope do itinerante'], 4),
  ('Subcoordenador por andar', 'Liderança por andar', true,
    array['Colete','Crachá','Lista de presença','Canetas','Ata','Pasta de documentos'], 5),
  ('Itinerante por andar', 'Liderança por andar', true,
    array['10 Coletes','Envelope de segurança','Ata de sala','Pasta de documentos'], 6),
  ('Fiscal Líder de Sala', 'Sala (por andar)', true,
    array['Coletes','Crachás','Envelopes de segurança','Etiquetas de pertences','Pasta de informações da sala'], 7),
  ('Fiscal Extra', 'Sala (por andar)', true,
    array['Kit padrão (definir itens)'], 8),
  ('Fiscal de Sala', 'Sala (por andar)', true,
    array['Kit padrão (definir itens)'], 9),
  ('Fiscal Detector e Sanitário', 'Operacional (por andar)', true,
    array['4 Coletes','Crachás','2 Luvas M','2 Luvas G','6 Sacos de lixo G','6 Sacos de lixo M','2 Detectores de metal'], 10),
  ('Equipe de Apoio', 'Operacional (por andar)', true,
    array['Kit padrão (definir itens)'], 11),
  ('Porteiro', 'Operacional (por andar)', true,
    array['Ata','Colete','Crachá','Pasta de documentos'], 12),
  ('Tablets', 'Equipamentos (sem andar)', false,
    array['Tablets de facial','Protocolo'], 13),
  ('Materiais Extras', 'Equipamentos (sem andar)', false,
    array['Coletes extras','Detectores extras','Envelopes de segurança extra','Baterias e pilhas extras','Relógios extras'], 14),
  ('Rádios de Comunicação', 'Equipamentos (sem andar)', false,
    array['Rádios de comunicação','Protocolo de entrega/devolução'], 15)
on conflict do nothing;
