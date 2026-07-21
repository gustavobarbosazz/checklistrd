import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { StatusBadge, ProgressBar } from '@/lib/ui';
import { andarLabel } from '@/lib/roleCatalog';

export default async function EventoDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const supabase = await createClient();

  const { data: event } = await supabase.from('events').select('*').eq('id', id).single();
  const { data: malotes } = await supabase
    .from('malotes')
    .select('*')
    .eq('event_id', id)
    .order('tipo');

  if (!event) {
    return <div className="px-8 py-8 text-muted-fg text-sm">Evento não encontrado.</div>;
  }

  const list = malotes ?? [];
  const totalItems = list.reduce((a, m) => a + m.total_items, 0);
  const checked = list.reduce((a, m) => a + m.checked_items, 0);
  const progress = totalItems ? Math.round((checked / totalItems) * 100) : 0;

  const byRole: Record<string, typeof list> = {};
  list.forEach((m) => {
    byRole[m.tipo] = byRole[m.tipo] ?? [];
    byRole[m.tipo].push(m);
  });
  const roleGroups = Object.keys(byRole).filter((r) => byRole[r][0]?.category === 'por_andar');
  const generalRoles = Object.keys(byRole).filter((r) => byRole[r][0]?.category === 'geral');

  return (
    <div className="px-8 py-8">
      <Link href="/" className="text-muted-fg text-sm hover:text-fg">
        ← Voltar
      </Link>
      <h1 className="font-display text-2xl font-bold mt-2">{event.name}</h1>
      <p className="text-muted-fg text-sm mb-5">
        {event.location} · {new Date(event.date).toLocaleDateString('pt-BR')}
      </p>

      <div className="mb-8">
        <ProgressBar pct={progress} />
        <div className="text-xs text-muted-fg mt-1.5">
          {checked}/{totalItems} itens conferidos ({progress}%)
        </div>
      </div>

      <h2 className="font-bold text-base mb-3">Por Cargo</h2>
      <div className="flex flex-col gap-2 mb-8">
        {roleGroups.length === 0 && <div className="text-muted-fg text-sm">Nenhum cargo com andar.</div>}
        {roleGroups.map((role) => {
          const items = byRole[role];
          const t = items.reduce((a, m) => a + m.total_items, 0);
          const c = items.reduce((a, m) => a + m.checked_items, 0);
          const pct = t ? Math.round((c / t) * 100) : 0;
          const status = items.every((m) => m.status === 'completed')
            ? 'completed'
            : items.some((m) => m.status !== 'pending')
              ? 'in_progress'
              : 'pending';
          return (
            <details key={role} className="rounded-xl border border-border bg-card">
              <summary className="p-4 cursor-pointer flex justify-between items-center list-none">
                <span className="text-sm font-bold">
                  {role} <span className="text-muted-fg font-normal">({items.length} andares)</span>
                </span>
                <span className="flex items-center gap-2">
                  <StatusBadge status={status} />
                  <span className="text-xs text-muted-fg">{pct}%</span>
                </span>
              </summary>
              <div className="px-4 pb-4">
                <ProgressBar pct={pct} />
                <div className="flex flex-wrap gap-2 mt-3">
                  {items.map((m) => (
                    <Link
                      key={m.id}
                      href={`/checklist/${m.id}`}
                      className="rounded-lg border border-border px-3 py-1.5 text-xs hover:border-primary/40 flex items-center gap-1.5"
                    >
                      {andarLabel(m.andar)} <StatusBadge status={m.status} />
                    </Link>
                  ))}
                </div>
              </div>
            </details>
          );
        })}
      </div>

      <h2 className="font-bold text-base mb-3">Materiais Gerais</h2>
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
        {generalRoles.length === 0 && <div className="text-muted-fg text-sm">Nenhum material geral.</div>}
        {generalRoles.flatMap((role) => byRole[role]).map((m) => {
          const pct = m.total_items ? Math.round((m.checked_items / m.total_items) * 100) : 0;
          return (
            <Link key={m.id} href={`/checklist/${m.id}`} className="rounded-xl border border-border bg-card p-4 block">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-bold">{m.name}</span>
                <StatusBadge status={m.status} />
              </div>
              <ProgressBar pct={pct} />
              <div className="text-[11px] text-muted-fg mt-1.5">
                {m.checked_items}/{m.total_items} itens
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
