-- ============================================================
-- RDChecklist — Migração: andares 6º/7º/8º + observação do malote
-- Rode isso no SQL Editor do Supabase (não precisa rodar o schema.sql inteiro de novo)
-- ============================================================

-- 1) Adiciona os novos andares (6o, 7o, 8o) ao enum de Malote.andar
alter table public.malotes drop constraint if exists malotes_andar_check;
alter table public.malotes add constraint malotes_andar_check
  check (andar in ('terreo','1o','2o','3o','4o','5o','6o','7o','8o','geral'));

-- 2) Campo de observação do MALOTE (diferente da observação por item, que já existia)
alter table public.malotes add column if not exists observacao text;
