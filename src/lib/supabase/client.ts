import { createBrowserClient } from '@supabase/ssr';

// Cliente para uso em Client Components ("use client").
// Observação: não usamos o generic <Database> aqui de propósito — o tipo
// gerado à mão em src/types/database.ts não bate 100% com o formato que o
// @supabase/supabase-js espera para inferência automática, o que já causou
// um erro de build. Preferimos tipar explicitamente (import type { Profile }
// etc.) nos pontos onde os dados são usados, em vez de depender da inferência
// genérica do cliente.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
