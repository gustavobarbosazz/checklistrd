'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { StatusBadge, ProgressBar } from '@/lib/ui';

export default function ChecklistsPage() {
  const supabase = createClient();
  const [malotes, setMalotes] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('malotes')
        .select('*, events(name, location, date)')
        .order('updated_at', { ascending: false });
      setMalotes(data ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = malotes.filter((m) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.events?.name?.toLowerCase().includes(q) ||
      m.events?.location?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="px-8 py-8">
      <h1 className="font-display text-2xl font-bold mb-1">Checklists</h1>
      <p className="text-muted-fg text-sm mb-5">Todos os malotes de todos os eventos.</p>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Pesquisar malote, evento ou unidade..."
        className="w-full max-w-md rounded-lg border border-border bg-muted px-3 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 mb-5"
      />

      {loading ? (
        <div className="text-muted-fg text-sm">Carregando…</div>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {filtered.map((m) => {
            const pct = m.total_items ? Math.round((m.checked_items / m.total_items) * 100) : 0;
            return (
              <Link key={m.id} href={`/checklist/${m.id}`} className="rounded-xl border border-border bg-card p-4 block">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <div>
                    <div className="text-sm font-bold">{m.name}</div>
                    <div className="text-[11px] text-muted-fg">{m.events?.name}</div>
                  </div>
                  <StatusBadge status={m.status} />
                </div>
                <ProgressBar pct={pct} />
                <div className="text-[11px] text-muted-fg mt-1.5">
                  {m.checked_items}/{m.total_items} itens · {m.events?.location}
                </div>
              </Link>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-16 text-muted-fg border border-border rounded-xl">
              Nenhum malote encontrado.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
