import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

function inferAcaoTag(acao: string) {
  const a = (acao || '').toLowerCase();
  if (a.includes('login') || a.includes('logout')) return 'Login';
  if (a.includes('criou') || a.includes('convidou')) return 'Criou';
  if (a.includes('deletou') || a.includes('exclui')) return 'Deletou';
  if (a.includes('acessou') || a.includes('visualizou')) return 'Acessou';
  if (a.includes('atualizou') || a.includes('conferiu') || a.includes('desmarcou') || a.includes('concluiu')) return 'Atualizou';
  return 'Outro';
}

export default async function HistoricoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!myProfile || !['admin', 'owner'].includes(myProfile.role)) {
    return (
      <div className="px-8 py-8">
        <h1 className="font-display text-xl font-bold mb-2">Acesso restrito</h1>
        <p className="text-muted-fg text-sm">Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  const { data: logs } = await supabase
    .from('audit_logs')
    .select('*')
    .order('data_hora', { ascending: false })
    .limit(300);

  return (
    <div className="px-8 py-8">
      <h1 className="font-display text-2xl font-bold mb-1">Histórico de Registros</h1>
      <p className="text-muted-fg text-sm mb-5">Tabela de atividades do sistema.</p>

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left font-mono-label text-[10.5px] text-muted-fg border-b border-border">
              <th className="p-3">Data/Hora</th>
              <th className="p-3">Colaborador</th>
              <th className="p-3">Módulo</th>
              <th className="p-3">Ação</th>
              <th className="p-3">Descrição</th>
            </tr>
          </thead>
          <tbody>
            {(logs ?? []).map((l) => (
              <tr key={l.id} className="border-b border-border">
                <td className="p-3 whitespace-nowrap text-xs">{new Date(l.data_hora).toLocaleString('pt-BR')}</td>
                <td className="p-3 text-xs">
                  <div className="font-semibold">{l.nome_usuario}</div>
                  <div className="text-muted-fg text-[10.5px]">{l.email_usuario}</div>
                </td>
                <td className="p-3">
                  <span className="font-mono-label text-[10px] px-2 py-0.5 rounded-full bg-muted">{l.modulo}</span>
                </td>
                <td className="p-3 text-xs">{inferAcaoTag(l.acao)}</td>
                <td className="p-3 text-xs text-muted-fg max-w-xs truncate">{l.detalhes}</td>
              </tr>
            ))}
            {(!logs || logs.length === 0) && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-fg">
                  Nenhum registro encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
