'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { deleteEvent } from './actions';

export default function AdminClient({ initialEvents }: { initialEvents: any[] }) {
  const [events, setEvents] = useState(initialEvents);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="px-8 py-8">
      <h1 className="font-display text-2xl font-bold mb-1">Painel de Administração</h1>
      <p className="text-muted-fg text-sm mb-5">
        Edite ou exclua eventos. A exclusão remove também os malotes e itens (em cascata).
      </p>

      <div className="flex flex-col gap-2">
        {events.map((ev) => (
          <div key={ev.id} className="rounded-xl border border-border bg-card p-4 flex justify-between items-center">
            <div>
              <Link href={`/evento/${ev.id}`} className="text-sm font-bold hover:text-primary">
                {ev.name}
              </Link>
              <div className="text-[11px] text-muted-fg">{ev.malotes?.length ?? 0} malote(s)</div>
            </div>

            {confirming === ev.id ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-destructive">Confirma exclusão?</span>
                <button
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      await deleteEvent(ev.id, ev.name);
                      setEvents((prev) => prev.filter((e) => e.id !== ev.id));
                      setConfirming(null);
                    })
                  }
                  className="text-xs rounded-lg px-3 py-1.5 text-white"
                  style={{ background: 'var(--destructive)' }}
                >
                  Confirmar
                </button>
                <button onClick={() => setConfirming(null)} className="text-xs rounded-lg border border-border px-3 py-1.5">
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirming(ev.id)}
                className="text-xs rounded-lg border border-border px-3 py-1.5 hover:bg-muted"
              >
                Excluir
              </button>
            )}
          </div>
        ))}
        {events.length === 0 && (
          <div className="text-center py-16 text-muted-fg border border-border rounded-xl">Nenhum evento cadastrado.</div>
        )}
      </div>
    </div>
  );
}
