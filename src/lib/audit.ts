import { createClient } from '@/lib/supabase/client';
import type { AuditModulo, AuditResultado } from '@/types/database';

interface LogAuditParams {
  acao: string;
  modulo: AuditModulo;
  itemAfetado?: string;
  unidade?: string;
  valorAnterior?: string;
  valorNovo?: string;
  detalhes?: string;
  resultado?: AuditResultado;
}

/**
 * Fire-and-forget: nunca bloqueia a UI nem lança erro visível.
 * Uso: logAudit({ acao: 'Conferiu item', modulo: 'Checklists', ... })
 */
export function logAudit(params: LogAuditParams) {
  const supabase = createClient();

  (async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email, role')
        .eq('id', user.id)
        .single();

      await supabase.from('audit_logs').insert({
        usuario_id: user.id,
        nome_usuario: profile?.full_name ?? user.email,
        email_usuario: profile?.email ?? user.email,
        perfil_usuario: profile?.role ?? 'user',
        acao: params.acao,
        modulo: params.modulo,
        item_afetado: params.itemAfetado ?? '',
        unidade: params.unidade ?? '',
        valor_anterior: params.valorAnterior ?? '',
        valor_novo: params.valorNovo ?? '',
        detalhes: params.detalhes ?? '',
        resultado: params.resultado ?? 'Sucesso',
      });
    } catch (err) {
      // Fire-and-forget de verdade: nunca deixa a auditoria quebrar a UI.
      console.warn('logAudit falhou (não bloqueia a interface):', err);
    }
  })();
}
