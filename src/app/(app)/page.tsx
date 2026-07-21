import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: events } = await supabase
    .from('events')
    .select('*, malotes(id, status, total_items, checked_items)')
    .order('updated_at', { ascending: false });

  const allMalotes = (events ?? []).flatMap((e: any) => e.malotes ?? []);
  const totalUnidades = events?.length ?? 0;
  const totalMalotes = allMalotes.length;
  const pendentes = allMalotes.filter((m: any) => m.status !== 'completed').length;
  const concluidos = allMalotes.filter((m: any) => m.status === 'completed').length;

  return (
    <div className="px-8 py-8">
      <div className="flex justify-between items-start flex-wrap gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">RDChecklist</h1>
          <p className="text-muted-fg text-sm">Controle de processos, malotes e unidades</p>
        </div>
        <Link
          href="/novo-evento"
          className="rounded-lg px-4 py-2 font-mono-label text-xs font-bold"
          style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
        >
          + novo evento
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard label="Total de Unidades" value={totalUnidades} />
        <StatCard label="Total de Malotes" value={totalMalotes} />
        <StatCard label="Pendentes" value={pendentes} />
        <StatCard label="Concluídos" value={concluidos} />
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {(events ?? []).map((ev: any) => {
          const malotes = ev.malotes ?? [];
          const t = malotes.reduce((a: number, m: any) => a + (m.total_items ?? 0), 0);
          const c = malotes.reduce((a: number, m: any) => a + (m.checked_items ?? 0), 0);
          const pct = t ? Math.round((c / t) * 100) : 0;
          return (
            <Link
              key={ev.id}
              href={`/evento/${ev.id}`}
              className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-colors"
            >
              <div className="font-bold text-sm mb-1">{ev.name}</div>
              <div className="text-muted-fg text-xs mb-3">{ev.location}</div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full"
                  style={{ width: `${pct}%`, background: 'var(--primary)' }}
                />
              </div>
              <div className="text-[11px] text-muted-fg mt-2">
                {malotes.length} malote(s) · {pct}%
              </div>
            </Link>
          );
        })}
        {(!events || events.length === 0) && (
          <div className="col-span-full text-center py-16 text-muted-fg border border-border rounded-xl">
            Nenhum evento cadastrado ainda.{' '}
            <Link href="/novo-evento" className="text-primary font-semibold">
              Criar o primeiro evento
            </Link>
          </div>
        )}
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
