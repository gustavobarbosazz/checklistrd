# RDChecklist — Next.js + Supabase

Base real do sistema RDChecklist: autenticação de verdade (Supabase Auth), banco
Postgres com as regras de permissão (RLS), e deploy contínuo via GitHub + Vercel.

> **Estado atual deste scaffold:** login, primeiro acesso e dashboard estão
> funcionando de ponta a ponta com dados reais do Supabase. As demais telas
> (wizard de evento, checklist, capas de malote em PDF, relatórios, admin,
> auditoria) ainda precisam ser portadas do protótipo — a estrutura, o schema
> e os padrões já estão prontos para isso.

---

## 1. Criar o projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) → **New project**
2. Anote a senha do banco (você não vai precisar dela no dia a dia, mas guarde)
3. Espere o projeto terminar de provisionar (~2 min)
4. Vá em **SQL Editor** → **New query**, cole todo o conteúdo do arquivo
   [`supabase/schema.sql`](./supabase/schema.sql) deste projeto, e clique em **Run**
   - Isso cria as 5 tabelas (`profiles`, `events`, `malotes`, `malote_items`, `audit_logs`),
     as políticas de RLS, e liga o tempo real (Realtime) nas tabelas
5. Vá em **Authentication → Providers** e confirme que **Email** está habilitado
6. Vá em **Authentication → Settings** e, para desenvolvimento, você pode
   desabilitar "Confirm email" (assim consegue logar assim que criar a conta,
   sem precisar clicar em um link de confirmação)

## 2. Pegar as chaves do projeto

Em **Project Settings → API**, copie:
- **Project URL**
- **anon public key**

## 3. Configurar o projeto localmente

```bash
# instale as dependências
npm install

# copie o arquivo de exemplo e cole suas chaves
cp .env.example .env.local
```

Edite `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

```bash
npm run dev
```
Acesse `http://localhost:3000` — você deve cair na tela de login.

## 4. Criar sua primeira conta (owner)

Como o cadastro principal é por convite (admin convida usuário), mas ainda não
existe nenhum admin, o primeiro usuário precisa ser criado manualmente:

1. Na tela de login, use a opção de registro do Supabase (ou, mais simples: no
   **Supabase Dashboard → Authentication → Users → Add user**, crie seu usuário
   com e-mail e senha)
2. No **SQL Editor**, rode (trocando pelo seu e-mail):
   ```sql
   update public.profiles
   set role = 'owner', must_change_password = false, password_created = true
   where email = 'seuemail@empresa.com';
   ```
3. Faça login normalmente pela tela `/login`

A partir daqui, esse usuário (owner) pode usar a tela de Usuários para convidar
os demais — assim que essa tela for portada do protótipo.

## 5. Subir para o GitHub

```bash
git init
git add .
git commit -m "RDChecklist — base Next.js + Supabase"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/rdchecklist.git
git push -u origin main
```

(Crie o repositório vazio antes em [github.com/new](https://github.com/new) —
não marque nenhuma opção de inicialização, para não conflitar com o `git push`.)

## 6. Deploy na Vercel

1. Acesse [vercel.com/new](https://vercel.com/new) e importe o repositório que
   você acabou de subir
2. A Vercel detecta Next.js automaticamente — não precisa mexer em build settings
3. Em **Environment Variables**, adicione as mesmas duas chaves do `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Clique em **Deploy**

Pronto — toda vez que você der `git push` na branch `main`, a Vercel re-implanta
automaticamente.

## 7. Próximos passos (portar o restante do protótipo)

Sugestão de ordem, do mais simples ao mais dependente:
1. `/checklists` — lista de malotes com toggle de itens (reaproveita `malote_items`)
2. `/novo-evento` — wizard de 3 etapas (o catálogo de cargos/itens já está
   documentado; vira uma constante em `src/lib/roleCatalog.ts`)
3. `/evento/[id]` e `/checklist/[id]`
4. Capas de malote em PDF — `jspdf` já está no `package.json`, a lógica de
   `renderCoverPage` do protótipo é portável quase 1:1 (roda no client)
5. `/usuarios`, `/admin`, `/historico`, `/audit` — todas leem/escrevem via
   `createClient()` do Supabase, com RLS já cuidando das permissões no banco

## Estrutura

```
supabase/schema.sql        → schema completo + RLS (rode isso primeiro)
src/lib/supabase/          → clientes Supabase (browser, server, middleware)
src/lib/audit.ts           → logAudit() fire-and-forget
src/types/database.ts      → tipos TypeScript das 5 entidades
src/app/login/             → tela de login real
src/app/primeiro-acesso/   → criação de senha obrigatória no 1º acesso
src/app/(app)/             → shell protegido (sidebar + dashboard)
```
