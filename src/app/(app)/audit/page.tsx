import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function AuditPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: myProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (myProfile?.role !== 'owner') {
    return (
      <div className="px-8 py-8">
        <h1 className="font-display text-xl font-bold mb-2">Acesso restrito</h1>
        <p className="text-muted-fg text-sm">Apenas o owner acessa a Central de Auditoria.</p>
      </div>
    );
  }

  const { data: logs } = await supabase
    .from('audit_logs')
    .select('*')
    .order('data_hora', { ascending: false })
    .limit(300);

  const today = (logs ?? []).filter(
    (l) => new Date(l.data_hora).toDateString() === new Date().toDateString()
  );
  const logins = today.filter((l) => l.acao === 'Login').length;
  const alteracoes = today.filter((l) => ['Criou', 'Atualizou', 'Deletou'].includes(l.acao)).length;
  const falhas = today.filter((l) => l.resultado === 'Falha').length;
  const alertas = today.filter((l) => l.resultado === 'Alerta').length;

  return (
    <div className="px-8 py-8">
      <h1 className="font-display text-2xl font-bold mb-1">Central de Auditoria</h1>
      <p className="text-muted-fg text-sm mb-5">Monitoramento completo de logs em tempo real.</p>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <StatCard label="Ações hoje" value={today.length} />
        <StatCard label="Logins hoje" value={logins} />
        <StatCard label="Alterações" value={alteracoes} />
        <StatCard label="Alertas" value={alertas} />
        <StatCard label="Falhas" value={falhas} />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left font-mono-label text-[10.5px] text-muted-fg border-b border-border">
              <th className="p-3">Data/Hora</th>
              <th className="p-3">Usuário</th>
              <th className="p-3">Ação</th>
              <th className="p-3">Módulo</th>
              <th className="p-3">Resultado</th>
            </tr>
          </thead>
          <tbody>
            {(logs ?? []).map((l) => (
              <tr key={l.id} className="border-b border-border">
                <td className="p-3 whitespace-nowrap text-xs">{new Date(l.data_hora).toLocaleString('pt-BR')}</td>
                <td className="p-3 text-xs">{l.nome_usuario}</td>
                <td className="p-3 text-xs">{l.acao}</td>
                <td className="p-3">
                  <span className="font-mono-label text-[10px] px-2 py-0.5 rounded-full bg-muted">{l.modulo}</span>
                </td>
                <td className="p-3">
                  <ResultBadge resultado={l.resultado} />
                </td>
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

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="font-mono-label text-[11px] text-muted-fg mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function ResultBadge({ resultado }: { resultado: string }) {
  const map: Record<string, string> = {
    Sucesso: 'bg-green/15 text-green',
    Alerta: 'bg-amber/15 text-amber',
    Falha: 'bg-destructive/15 text-destructive',
  };
  return (
    <span className={`font-mono-label text-[10px] px-2 py-0.5 rounded-full ${map[resultado] ?? 'bg-muted'}`}>
      {resultado}
    </span>
  );
}
