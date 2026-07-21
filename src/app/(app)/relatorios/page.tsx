import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function RelatoriosPage() {
  const supabase = await createClient();
  const { data: events } = await supabase.from('events').select('*').order('date', { ascending: false });

  return (
    <div className="px-8 py-8">
      <h1 className="font-display text-2xl font-bold mb-1">Relatórios</h1>
      <p className="text-muted-fg text-sm mb-5">Selecione um evento para ver o relatório de conferência.</p>

      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {(events ?? []).map((ev) => (
          <Link
            key={ev.id}
            href={`/relatorio/${ev.id}`}
            className="rounded-xl border border-border bg-card p-4 flex justify-between items-center"
          >
            <div>
              <div className="text-sm font-bold">{ev.name}</div>
              <div className="text-[11px] text-muted-fg">
                {ev.location} · {new Date(ev.date).toLocaleDateString('pt-BR')}
              </div>
            </div>
            <span className="text-muted-fg">→</span>
          </Link>
        ))}
        {(!events || events.length === 0) && (
          <div className="col-span-full text-center py-16 text-muted-fg border border-border rounded-xl">
            Nenhum evento cadastrado.
          </div>
        )}
      </div>
    </div>
  );
}
