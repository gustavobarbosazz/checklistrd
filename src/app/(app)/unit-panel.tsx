'use client';

import { useState } from 'react';
import Link from 'next/link';
import { StatusBadge } from '@/lib/ui';
import { andarLabel } from '@/lib/roleCatalog';

export default function UnitPanel({ event, onClose }: { event: any; onClose: () => void }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const malotes = event.malotes ?? [];

  const total = malotes.length;
  const pendentes = malotes.filter((m: any) => m.status !== 'completed').length;
  const concluidos = malotes.filter((m: any) => m.status === 'completed').length;

  const byRole: Record<string, any[]> = {};
  malotes.forEach((m: any) => {
    byRole[m.tipo] = byRole[m.tipo] ?? [];
    byRole[m.tipo].push(m);
  });

  function toggle(role: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/55" onClick={onClose} />
      <div className="relative w-full max-w-[560px] bg-card h-full overflow-y-auto border-l border-border">
        {/* Header */}
        <div className="p-6 pb-5" style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', color: 'var(--primary-fg)' }}>
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-1.5 text-xs opacity-90 mb-1">
                <PinIcon /> {event.location}
              </div>
              <h2 className="text-xl font-bold">{event.name}</h2>
              <div className="flex items-center gap-1.5 text-xs opacity-90 mt-1.5">
                <CalendarIcon /> {new Date(event.date).toLocaleDateString('pt-BR')}
              </div>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-black/10">
              <CloseIcon />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4">
            <MiniStat label="Total" value={total} />
            <MiniStat label="Pendentes" value={pendentes} />
            <MiniStat label="Concluídos" value={concluidos} />
          </div>
        </div>

        {/* Coordinator row */}
        <div className="px-6 py-3 bg-muted flex items-center gap-2 text-sm">
          <UserIcon />
          <span className="text-muted-fg">Coord.:</span>
          <span className="font-semibold">{event.coordinator_email ?? '—'}</span>
        </div>

        {/* Malote list */}
        <div className="p-4">
          <div className="font-mono-label text-[11px] text-muted-fg mb-2 px-2">
            LISTA DE MALOTES ({total})
          </div>

          <div className="flex flex-col gap-2">
            {Object.keys(byRole)
              .sort()
              .map((role) => {
                const items = byRole[role];
                const isOpen = expanded.has(role);
                const allDone = items.every((m) => m.status === 'completed');
                const status = allDone ? 'completed' : items.some((m) => m.status !== 'pending') ? 'in_progress' : 'pending';

                return (
                  <div key={role} className="rounded-lg bg-muted overflow-hidden">
                    <button
                      onClick={() => toggle(role)}
                      className="w-full flex justify-between items-center px-3 py-2.5 text-left"
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <BoxIcon />
                        {role} <span className="text-muted-fg font-normal">({items.length})</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <StatusBadge status={status} />
                        <ChevronIcon open={isOpen} />
                      </span>
                    </button>

                    {isOpen && (
                      <div className="px-3 pb-2 flex flex-col gap-2">
                        {items
                          .slice()
                          .sort((a, b) => (a.andar ?? '').localeCompare(b.andar ?? ''))
                          .map((m) => {
                            const pct = m.total_items ? Math.round((m.checked_items / m.total_items) * 100) : 0;
                            const done = m.status === 'completed';
                            return (
                              <Link
                                key={m.id}
                                href={`/checklist/${m.id}`}
                                className="bg-card rounded-lg p-3 flex items-center gap-3 hover:border-primary/30 border border-transparent"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className={`text-sm font-medium truncate ${done ? 'line-through text-muted-fg' : ''}`}>
                                    {m.category === 'por_andar' ? andarLabel(m.andar) : m.name}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                      <div
                                        className="h-full"
                                        style={{
                                          width: `${pct}%`,
                                          background: pct === 100 ? 'var(--green)' : pct > 50 ? 'var(--primary)' : 'var(--amber)',
                                        }}
                                      />
                                    </div>
                                    <span className="text-[11px] text-muted-fg flex-shrink-0">{pct}%</span>
                                  </div>
                                </div>
                                <StatusBadge status={m.status} />
                                <ChevronRightIcon />
                              </Link>
                            );
                          })}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border sticky bottom-0 bg-card">
          <Link
            href={`/evento/${event.id}`}
            className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 font-semibold text-sm"
            style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
          >
            <ExternalIcon /> Abrir página completa da unidade
          </Link>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-black/15 rounded-lg p-2.5 text-center">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[10.5px] opacity-90">{label}</div>
    </div>
  );
}

function PinIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
function CalendarIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a7 7 0 0 1 7-7h2a7 7 0 0 1 7 7v1" />
    </svg>
  );
}
function BoxIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21 8-9-5-9 5 9 5 9-5z" />
      <path d="M3 8v8l9 5 9-5V8M12 13v8" />
    </svg>
  );
}
function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-muted-fg transition-transform"
      style={{ transform: open ? 'rotate(180deg)' : 'none' }}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-fg flex-shrink-0">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
function ExternalIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <path d="M15 3h6v6M10 14 21 3" />
    </svg>
  );
}
