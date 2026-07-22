'use client';

import { useState } from 'react';
import Link from 'next/link';
import { StatusBadge, ProgressBar } from '@/lib/ui';
import { createClient } from '@/lib/supabase/client';
import { downloadSingleLabel } from '@/lib/pdfLabel';
import { logAudit } from '@/lib/audit';
import UnitPanel from './unit-panel';

type Tab = 'malotes' | 'capas' | 'pendencias' | 'relatorios';

function unitStatus(malotes: any[]) {
  if (malotes.length === 0) return 'pending';
  if (malotes.every((m) => m.status === 'completed')) return 'completed';
  if (malotes.some((m) => m.status !== 'pending')) return 'in_progress';
  return 'pending';
}

export default function DashboardClient({ events }: { events: any[] }) {
  const [tab, setTab] = useState<Tab>('malotes');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed'>('all');
  const [panelEvent, setPanelEvent] = useState<any>(null);

  const allMalotes = events.flatMap((e) => (e.malotes ?? []).map((m: any) => ({ ...m, event: e })));
  const totalUnidades = events.length;
  const totalMalotes = allMalotes.length;
  const pendentes = allMalotes.filter((m) => m.status !== 'completed').length;
  const concluidos = allMalotes.filter((m) => m.status === 'completed').length;

  const enrichedEvents = events
    .map((ev) => {
      const malotes = ev.malotes ?? [];
      const t = malotes.reduce((a: number, m: any) => a + (m.total_items ?? 0), 0);
      const c = malotes.reduce((a: number, m: any) => a + (m.checked_items ?? 0), 0);
      const pct = t ? Math.round((c / t) * 100) : 0;
      const status = unitStatus(malotes);
      return { ev, malotes, pct, status };
    })
    .filter(({ ev, status }) => {
      if (statusFilter !== 'all' && status !== statusFilter) return false;
      if (search && !ev.name.toLowerCase().includes(search.toLowerCase()) && !ev.location.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      return true;
    });

  return (
    <div className="px-8 py-8">
      <div className="flex justify-between items-start flex-wrap gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">RDChecklist</h1>
          <p className="text-muted-fg text-sm">Controle de processos, malotes e unidades</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.location.reload()}
            className="rounded-lg px-3 py-2 border border-border text-sm"
          >
            ↻
          </button>
          <Link
            href="/novo-evento"
            className="rounded-lg px-4 py-2 font-mono-label text-xs font-bold"
            style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
          >
            + novo evento
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total de Unidades" value={totalUnidades} />
        <StatCard label="Total de Malotes" value={totalMalotes} />
        <StatCard label="Pendentes" value={pendentes} />
        <StatCard label="Concluídos" value={concluidos} />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        {(
          [
            ['malotes', 'Malotes'],
            ['capas', 'Capas de Malote'],
            ['pendencias', 'Pendências'],
            ['relatorios', 'Relatórios'],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="rounded-lg px-4 py-2 text-sm font-semibold"
            style={
              tab === key
                ? { background: 'var(--primary)', color: 'var(--primary-fg)' }
                : { background: 'var(--muted)', color: 'var(--muted-fg)' }
            }
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'malotes' && (
        <>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar processo, unidade ou malote..."
            className="w-full rounded-lg border border-border bg-muted px-3 py-2.5 outline-none focus:border-primary mb-4"
          />
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            <span className="text-xs text-muted-fg font-semibold">Status:</span>
            {(
              [
                ['all', 'Todos'],
                ['pending', 'Pendente'],
                ['in_progress', 'Em andamento'],
                ['completed', 'Concluído'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold"
                style={
                  statusFilter === key
                    ? { background: 'var(--primary)', color: 'var(--primary-fg)' }
                    : { background: 'var(--muted)', color: 'var(--muted-fg)' }
                }
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {enrichedEvents.map(({ ev, malotes, pct, status }) => (
              <div key={ev.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex justify-between items-start gap-2 mb-3">
                  <div>
                    <div className="font-bold text-sm">{ev.name}</div>
                    <div className="text-muted-fg text-xs">{ev.location}</div>
                  </div>
                  <StatusBadge status={status} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <MiniStatBox label="Malotes" value={malotes.length} />
                  <MiniStatBox label="Pendentes" value={malotes.filter((m: any) => m.status !== 'completed').length} color="var(--amber)" />
                  <MiniStatBox label="Concluídos" value={malotes.filter((m: any) => m.status === 'completed').length} color="var(--green)" />
                </div>
                <ProgressBar pct={pct} />
                <div className="text-[11px] text-muted-fg mt-1.5 mb-3">
                  Atualizado em {new Date(ev.updated_at ?? ev.created_at).toLocaleString('pt-BR')} · {pct}%
                </div>
                <button
                  onClick={() => setPanelEvent(ev)}
                  className="w-full rounded-lg py-2 font-semibold text-sm"
                  style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
                >
                  Acessar unidade
                </button>
              </div>
            ))}
            {enrichedEvents.length === 0 && (
              <div className="col-span-full text-center py-16 text-muted-fg border border-border rounded-xl">
                {events.length === 0 ? (
                  <>
                    Nenhum evento cadastrado ainda.{' '}
                    <Link href="/novo-evento" className="text-primary font-semibold">
                      Criar o primeiro evento
                    </Link>
                  </>
                ) : (
                  'Nenhuma unidade encontrada para os filtros atuais.'
                )}
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'capas' && <CapasTabContent malotes={allMalotes} />}
      {tab === 'pendencias' && <PendenciasTabContent malotes={allMalotes.filter((m) => m.status !== 'completed')} />}
      {tab === 'relatorios' && <RelatoriosTabContent events={events} />}

      {panelEvent && (
        <UnitPanel
          event={{ ...panelEvent, malotes: allMalotes.filter((m) => m.event.id === panelEvent.id) }}
          onClose={() => setPanelEvent(null)}
        />
      )}
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

function MiniStatBox({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-muted rounded-lg p-2">
      <div className="text-sm font-bold" style={color ? { color } : undefined}>
        {value}
      </div>
      <div className="text-[10px] text-muted-fg">{label}</div>
    </div>
  );
}

function CapasTabContent({ malotes }: { malotes: any[] }) {
  const supabase = createClient();
  async function handleDownload(m: any) {
    const { data: items } = await supabase.from('malote_items').select('name, quantity').eq('malote_id', m.id);
    await downloadSingleLabel(m, m.event, items ?? []);
    logAudit({ acao: 'Exportou', modulo: 'Malotes', itemAfetado: m.name, detalhes: 'Etiqueta PDF baixada', resultado: 'Sucesso' });
  }
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
      {malotes.map((m) => (
        <div key={m.id} className="rounded-xl border border-border bg-card p-4">
          <div className="flex justify-between items-start gap-2 mb-2">
            <span className="text-sm font-bold">{m.name}</span>
            <StatusBadge status={m.status} />
          </div>
          <div className="text-[11px] text-muted-fg mb-3">{m.event?.name}</div>
          <div className="flex gap-2">
            <Link href="/capas" className="flex-1 text-xs text-center rounded-lg border border-border py-1.5 hover:bg-muted">
              Ver na lista completa
            </Link>
            <button
              onClick={() => handleDownload(m)}
              className="flex-1 text-xs rounded-lg py-1.5 font-semibold"
              style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
            >
              Baixar PDF
            </button>
          </div>
        </div>
      ))}
      {malotes.length === 0 && (
        <div className="col-span-full text-center py-16 text-muted-fg border border-border rounded-xl">
          Nenhum malote cadastrado.
        </div>
      )}
    </div>
  );
}

function PendenciasTabContent({ malotes }: { malotes: any[] }) {
  return (
    <div className="flex flex-col gap-2">
      {malotes.map((m) => {
        const pct = m.total_items ? Math.round((m.checked_items / m.total_items) * 100) : 0;
        return (
          <Link
            key={m.id}
            href={`/checklist/${m.id}`}
            className="rounded-xl border border-border bg-card p-4 flex justify-between items-center gap-3"
          >
            <div>
              <div className="text-sm font-bold">{m.name}</div>
              <div className="text-[11px] text-muted-fg">{m.event?.name}</div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={m.status} />
              <span className="text-[11px] text-muted-fg">{pct}%</span>
            </div>
          </Link>
        );
      })}
      {malotes.length === 0 && (
        <div className="text-center py-16 text-muted-fg border border-border rounded-xl">
          Nenhuma pendência. 🎉
        </div>
      )}
    </div>
  );
}

function RelatoriosTabContent({ events }: { events: any[] }) {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
      {events.map((ev) => (
        <Link key={ev.id} href={`/relatorio/${ev.id}`} className="rounded-xl border border-border bg-card p-4 flex justify-between items-center">
          <div>
            <div className="text-sm font-bold">{ev.name}</div>
            <div className="text-[11px] text-muted-fg">
              {ev.location} · {new Date(ev.date).toLocaleDateString('pt-BR')}
            </div>
          </div>
          <span className="text-muted-fg">→</span>
        </Link>
      ))}
      {events.length === 0 && (
        <div className="col-span-full text-center py-16 text-muted-fg border border-border rounded-xl">
          Nenhum evento cadastrado.
        </div>
      )}
    </div>
  );
}
