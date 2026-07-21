# RDChecklist — Next.js + Supabase

Base real do sistema RDChecklist: autenticação de verdade (Supabase Auth), banco
Postgres com as regras de permissão (RLS), tempo real, e deploy contínuo via
GitHub + Vercel.

> **Estado atual:** Login, Primeiro Acesso, Dashboard, Novo Evento (wizard),
> Detalhe do Evento, Checklist (com tempo real via Supabase Realtime),
> Checklists (lista geral), Relatórios (com PDF), Gerenciar Usuários (com
> criação de conta via Server Action segura), Painel Admin, Central de
> Auditoria e Histórico — todas funcionando com dados reais do Supabase.
> Ainda não portado do protótipo original: Capas de Malote (etiquetas PDF
> Pimaco 6288) e edição de usuário/perfil próprio.

---

## 1. Criar o projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) → **New project**
2. Anote a senha do banco (você não vai precisar dela no dia a dia, mas guarde)
3. Espere o projeto terminar de provisionar (~2 min)
4. Vá em **SQL Editor** → **New query**, cole todo o conteúdo do arquivo
   [`supabase/schema.sql`](./supabase/schema.sql) deste projeto, e clique em **Run**
5. Vá em **Authentication → Providers** e confirme que **Email** está habilitado
6. Para desenvolvimento, você pode desabilitar "Confirm email" em
   **Authentication → Settings**

## 2. Pegar as chaves do projeto

Em **Project Settings → API**, copie:
- **Project URL**
- **anon public** (ou "Publishable key", nome novo do Supabase) key
- **service_role** key (aba "Legacy anon, service_role API keys") — ⚠️ **secreta**,
  usada só no servidor para a Server Action de criar usuários

## 3. Configurar o projeto localmente

```bash
npm install
cp .env.example .env.local
```

Edite `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-aqui
SUPABASE_SERVICE_ROLE_KEY=sua-chave-secreta-aqui
```

```bash
npm run dev
```

## 4. Criar sua primeira conta (owner)

1. No **Supabase Dashboard → Authentication → Users → Add user**, crie seu
   usuário com e-mail e senha (marque "Auto Confirm User")
2. No **SQL Editor**, rode (trocando pelo seu e-mail):
   ```sql
   update public.profiles
   set role = 'owner', must_change_password = false, password_created = true
   where email = 'seuemail@empresa.com';
   ```
3. Faça login pela tela `/login` — a partir daqui, use a tela **Usuários** para
   convidar o restante da equipe.

## 5. Subir para o GitHub

```bash
git init
git add .
git commit -m "RDChecklist — base Next.js + Supabase"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/rdchecklist.git
git push -u origin main
```

## 6. Deploy na Vercel

1. [vercel.com/new](https://vercel.com/new) → importe o repositório
2. Em **Environment Variables**, adicione as **três** chaves:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` ⚠️ (marque como "Secret"/sensível se a Vercel oferecer essa opção)
3. **Deploy**

## 7. Próximos passos

- Capas de Malote (etiquetas PDF Pimaco 6288) — a lógica de `renderCoverPage`
  do protótipo original é portável quase 1:1 (usa `jspdf`, já incluído)
- Tela de perfil próprio (nome/cargo/unidade editáveis pelo usuário)

## Estrutura

```
supabase/schema.sql              → schema completo + RLS
src/lib/supabase/                → clientes (browser, server, middleware, admin)
src/lib/audit.ts                 → logAudit() fire-and-forget
src/lib/roleCatalog.ts           → catálogo de cargos/itens do wizard
src/lib/ui.tsx                   → StatusBadge, ProgressBar
src/types/database.ts            → tipos TypeScript das 5 entidades
src/app/login/                   → login real
src/app/primeiro-acesso/         → criação de senha obrigatória
src/app/(app)/                   → shell protegido (sidebar) + todas as telas internas
  ├── page.tsx                   → Dashboard
  ├── novo-evento/                → wizard de criação de evento
  ├── evento/[id]/                → detalhe do evento
  ├── checklist/[id]/             → conferência de itens (tempo real)
  ├── checklists/                 → lista geral de malotes
  ├── relatorios/ + relatorio/[id]/ → relatório + PDF
  ├── usuarios/                    → gestão de usuários (Server Actions)
  ├── admin/                       → CRUD de eventos
  ├── audit/                       → Central de Auditoria (owner)
  └── historico/                   → Histórico de Registros
```

