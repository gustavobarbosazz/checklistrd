'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  deleteEvent,
  createUnidade,
  updateUnidade,
  deleteUnidade,
  createCargo,
  updateCargo,
  deleteCargo,
} from './actions';
import { andarLabel, sortByAndar } from '@/lib/roleCatalog';
import type { UnidadeRow, CargoRow } from '@/types/database';

type Tab = 'eventos' | 'unidades' | 'cargos';

// Andares disponíveis pra montar/editar uma unidade (não precisa ser sequencial —
// cada unidade escolhe quais quiser, na ordem que quiser).
const ALL_ANDARES = ['terreo', '1o', '2o', '3o', '4o', '5o', '6o', '7o', '8o'];

export default function AdminClient({
  initialEvents,
  initialUnidades,
  initialCargos,
}: {
  initialEvents: any[];
  initialUnidades: UnidadeRow[];
  initialCargos: CargoRow[];
}) {
  const [tab, setTab] = useState<Tab>('eventos');

  return (
    <div className="px-8 py-8">
      <h1 className="font-display text-2xl font-bold mb-1">Configurações</h1>
      <p className="text-muted-fg text-sm mb-5">Eventos, unidades e cargos — tudo editável por aqui.</p>

      <div className="flex gap-2 mb-6">
        {(
          [
            ['eventos', 'Eventos'],
            ['unidades', 'Unidades'],
            ['cargos', 'Cargos'],
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

      {tab === 'eventos' && <EventosTab initialEvents={initialEvents} />}
      {tab === 'unidades' && <UnidadesTab initialUnidades={initialUnidades} />}
      {tab === 'cargos' && <CargosTab initialCargos={initialCargos} />}
    </div>
  );
}

// ============================================================
// EVENTOS
// ============================================================
function EventosTab({ initialEvents }: { initialEvents: any[] }) {
  const [events, setEvents] = useState(initialEvents);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-muted-fg mb-1">A exclusão remove também os malotes e itens do evento (em cascata).</p>
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
  );
}

// ============================================================
// UNIDADES
// ============================================================
function UnidadesTab({ initialUnidades }: { initialUnidades: UnidadeRow[] }) {
  const [unidades, setUnidades] = useState(initialUnidades);
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [nome, setNome] = useState('');
  const [andares, setAndares] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  function startEdit(u?: UnidadeRow) {
    setEditingId(u ? u.id : 'new');
    setNome(u?.nome ?? '');
    setAndares(u?.andares ?? []);
    setError('');
  }

  function toggleAndar(a: string) {
    setAndares((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  }

  function handleSave() {
    if (!nome.trim()) {
      setError('Dê um nome para a unidade.');
      return;
    }
    startTransition(async () => {
      const result =
        editingId === 'new'
          ? await createUnidade(nome.trim(), andares)
          : await updateUnidade(editingId!, nome.trim(), andares);
      if (result?.error) {
        setError(result.error);
        return;
      }
      window.location.reload();
    });
  }

  return (
    <div>
      {editingId ? (
        <div className="rounded-xl border border-border bg-card p-5 max-w-lg mb-6">
          <h3 className="text-sm font-bold mb-3">{editingId === 'new' ? 'Nova unidade' : 'Editar unidade'}</h3>
          {error && (
            <div className="text-xs rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2 text-destructive mb-3">
              {error}
            </div>
          )}
          <label className="font-mono-label text-[11px] text-muted-fg block mb-1.5">Nome</label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex: Unidade III"
            className="w-full rounded-lg border border-border bg-muted px-3 py-2 outline-none focus:border-primary mb-3"
          />
          <label className="font-mono-label text-[11px] text-muted-fg block mb-1.5">Andares desta unidade</label>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mb-4">
            {ALL_ANDARES.map((a) => (
              <label
                key={a}
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs cursor-pointer"
                style={{
                  borderColor: andares.includes(a) ? 'var(--primary)' : 'var(--border)',
                  background: andares.includes(a) ? 'var(--accent)' : 'var(--card)',
                }}
              >
                <input type="checkbox" checked={andares.includes(a)} onChange={() => toggleAndar(a)} className="accent-primary" />
                {andarLabel(a)}
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isPending}
              className="rounded-lg px-4 py-2 text-xs font-bold disabled:opacity-60"
              style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
            >
              {isPending ? 'salvando…' : 'Salvar'}
            </button>
            <button onClick={() => setEditingId(null)} className="rounded-lg border border-border px-4 py-2 text-xs font-semibold">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => startEdit()}
          className="rounded-lg px-4 py-2 font-mono-label text-xs font-bold mb-5"
          style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
        >
          + nova unidade
        </button>
      )}

      <div className="flex flex-col gap-2">
        {unidades
          .slice()
          .sort((a, b) => a.ordem - b.ordem)
          .map((u) => (
            <div key={u.id} className="rounded-xl border border-border bg-card p-4 flex justify-between items-center gap-3">
              <div>
                <div className="text-sm font-bold">{u.nome}</div>
                <div className="text-[11px] text-muted-fg">
                  {u.andares.length ? sortByAndar(u.andares, (a) => a).map(andarLabel).join(', ') : 'Sem andares'}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => startEdit(u)} className="text-xs rounded-lg border border-border px-3 py-1.5 hover:bg-muted">
                  Editar
                </button>
                <button
                  onClick={() =>
                    startTransition(async () => {
                      await deleteUnidade(u.id);
                      setUnidades((prev) => prev.filter((x) => x.id !== u.id));
                    })
                  }
                  className="text-xs rounded-lg border border-border px-3 py-1.5 hover:bg-muted"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        {unidades.length === 0 && (
          <div className="text-center py-16 text-muted-fg border border-border rounded-xl">Nenhuma unidade cadastrada.</div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// CARGOS
// ============================================================
function CargosTab({ initialCargos }: { initialCargos: CargoRow[] }) {
  const [cargos, setCargos] = useState(initialCargos);
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [nome, setNome] = useState('');
  const [tier, setTier] = useState('');
  const [temAndar, setTemAndar] = useState(false);
  const [itensText, setItensText] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  function startEdit(c?: CargoRow) {
    setEditingId(c ? c.id : 'new');
    setNome(c?.nome ?? '');
    setTier(c?.tier ?? '');
    setTemAndar(c?.tem_andar ?? false);
    setItensText((c?.itens ?? []).join('\n'));
    setError('');
  }

  function handleSave() {
    if (!nome.trim() || !tier.trim()) {
      setError('Preencha o nome e a camada (tier) do cargo.');
      return;
    }
    const itens = itensText
      .split('\n')
      .map((i) => i.trim())
      .filter(Boolean);
    if (itens.length === 0) {
      setError('Liste ao menos um item (um por linha).');
      return;
    }
    startTransition(async () => {
      const result =
        editingId === 'new'
          ? await createCargo(nome.trim(), tier.trim(), temAndar, itens)
          : await updateCargo(editingId!, nome.trim(), tier.trim(), temAndar, itens);
      if (result?.error) {
        setError(result.error);
        return;
      }
      window.location.reload();
    });
  }

  const byTier: Record<string, CargoRow[]> = {};
  cargos.forEach((c) => {
    byTier[c.tier] = byTier[c.tier] ?? [];
    byTier[c.tier].push(c);
  });

  return (
    <div>
      {editingId ? (
        <div className="rounded-xl border border-border bg-card p-5 max-w-lg mb-6">
          <h3 className="text-sm font-bold mb-3">{editingId === 'new' ? 'Novo cargo' : 'Editar cargo'}</h3>
          {error && (
            <div className="text-xs rounded-lg border border-destructive/35 bg-destructive/10 px-3 py-2 text-destructive mb-3">
              {error}
            </div>
          )}
          <div className="flex flex-col gap-3">
            <div>
              <label className="font-mono-label text-[11px] text-muted-fg block mb-1.5">Nome do cargo</label>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Fiscal de Corredor"
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="font-mono-label text-[11px] text-muted-fg block mb-1.5">Camada (agrupamento no wizard)</label>
              <input
                value={tier}
                onChange={(e) => setTier(e.target.value)}
                placeholder="Ex: Sala (por andar)"
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 outline-none focus:border-primary"
              />
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
              <input type="checkbox" checked={temAndar} onChange={(e) => setTemAndar(e.target.checked)} className="accent-primary" />
              Esse cargo tem malote por andar (em vez de um malote geral único)
            </label>
            <div>
              <label className="font-mono-label text-[11px] text-muted-fg block mb-1.5">Itens do malote (um por linha)</label>
              <textarea
                value={itensText}
                onChange={(e) => setItensText(e.target.value)}
                rows={6}
                placeholder={'Coletes\nCrachás\nPasta de documentos'}
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 outline-none focus:border-primary text-sm resize-none"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSave}
              disabled={isPending}
              className="rounded-lg px-4 py-2 text-xs font-bold disabled:opacity-60"
              style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
            >
              {isPending ? 'salvando…' : 'Salvar'}
            </button>
            <button onClick={() => setEditingId(null)} className="rounded-lg border border-border px-4 py-2 text-xs font-semibold">
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => startEdit()}
          className="rounded-lg px-4 py-2 font-mono-label text-xs font-bold mb-5"
          style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
        >
          + novo cargo
        </button>
      )}

      {Object.keys(byTier).map((tierName) => (
        <div key={tierName} className="mb-5">
          <div className="font-mono-label text-[11px] text-muted-fg mb-2">{tierName}</div>
          <div className="flex flex-col gap-2">
            {byTier[tierName].map((c) => (
              <div key={c.id} className="rounded-xl border border-border bg-card p-4 flex justify-between items-center gap-3">
                <div>
                  <div className="text-sm font-bold">
                    {c.nome} {c.tem_andar && <span className="text-[10px] text-muted-fg font-normal">(por andar)</span>}
                  </div>
                  <div className="text-[11px] text-muted-fg">{c.itens.join(', ')}</div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => startEdit(c)} className="text-xs rounded-lg border border-border px-3 py-1.5 hover:bg-muted">
                    Editar
                  </button>
                  <button
                    onClick={() =>
                      startTransition(async () => {
                        await deleteCargo(c.id);
                        setCargos((prev) => prev.filter((x) => x.id !== c.id));
                      })
                    }
                    className="text-xs rounded-lg border border-border px-3 py-1.5 hover:bg-muted"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {cargos.length === 0 && (
        <div className="text-center py-16 text-muted-fg border border-border rounded-xl">Nenhum cargo cadastrado.</div>
      )}
    </div>
  );
}
