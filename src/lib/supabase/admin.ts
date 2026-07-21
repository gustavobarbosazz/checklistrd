import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente ADMIN — usa a service_role key, que ignora RLS e pode criar usuários.
 * NUNCA importe este arquivo em um Client Component ("use client") nem exponha
 * essa chave com prefixo NEXT_PUBLIC_. Use apenas dentro de Server Actions ou
 * Route Handlers (código que roda só no servidor).
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
