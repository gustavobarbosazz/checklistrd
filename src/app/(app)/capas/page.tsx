'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { logAudit } from '@/lib/audit';
import { StatusBadge } from '@/lib/ui';
import { downloadSingleLabel, downloadBatchLabels } from '@/lib/pdfLabel';

export default function CapasDeMalotePage() {
  const supabase = createClient();
  const [malotes, setMalotes] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [itemsByMalote, setItemsByMalote] = useState<Record<string, any[]>>({});
  const [search, setSearch] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: ev } = await supabase.from('events').select('*').order('date', { ascending: false });
      const { data: mal } = await supabase.from('malotes').select('*, events(name, location, date)').order('tipo');
      setEvents(ev ?? []);
      setMalotes(mal ?? []);
      setLoading(false);
    })();
  }, []);

  async function ensureItemsLoaded(maloteId: string) {
    if (itemsByMalote[maloteId]) return itemsByMalote[maloteId];
    const { data } = await supabase.from('malote_items').select('*').eq('malote_id', maloteId);
    setItemsByMalote((prev) => ({ ...prev, [maloteId]: data ?? [] }));
    return data ?? [];
  }

  const filtered = malotes.filter((m) => {
    if (eventFilter !== 'all' && m.event_id !== eventFilter) return false;
    if (statusFilter !== 'all' && m.status !== statusFilter) return false;
    if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllFiltered() {
    const allSelected = filtered.every((m) => selected.has(m.id));
    setSelected((prev) => {
      const next = new Set(prev);
      filtered.forEach((m) => (allSelected ? next.delete(m.id) : next.add(m.id)));
      return next;
    });
  }

  async function handleDownloadSingle(m: any) {
    const items = await ensureItemsLoaded(m.id);
    await downloadSingleLabel(m, m.events, items);
    logAudit({ acao: 'Exportou', modulo: 'Malotes', itemAfetado: m.name, detalhes: 'Etiqueta PDF baixada', resultado: 'Sucesso' });
  }

  async function handleDownloadBatch() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    const entries = [];
    for (const id of ids) {
      const m = malotes.find((x) => x.id === id);
      if (!m) continue;
      const items = await ensureItemsLoaded(id);
      entries.push({ malote: m, event: m.events, items });
    }
    await downloadBatchLabels(entries);
    logAudit({ acao: 'Exportou', modulo: 'Malotes', itemAfetado: `${ids.length} malote(s)`, detalhes: 'Etiquetas em lote baixadas', resultado: 'Sucesso' });
  }

  const previewMalote = malotes.find((m) => m.id === previewId);

  return (
    <div className="px-8 py-8">
      <h1 className="font-display text-2xl font-bold mb-1">Capas de Malote</h1>
      <p className="text-muted-fg text-sm mb-5">Gere etiquetas Pimaco 6288 individuais ou em lote.</p>

      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar malote..."
          className="flex-1 min-w-[200px] rounded-lg border border-border bg-muted px-3 py-2 outline-none focus:border-primary"
        />
        <select
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
          className="rounded-lg border border-border bg-muted px-3 py-2 outline-none max-w-[200px]"
        >
          <option value="all">Todos os eventos</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.name}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-border bg-muted px-3 py-2 outline-none max-w-[160px]"
        >
          <option value="all">Todos status</option>
          <option value="pending">Pendente</option>
          <option value="in_progress">Em andamento</option>
          <option value="completed">Concluído</option>
        </select>
        <label className="flex items-center gap-2 text-xs font-semibold whitespace-nowrap cursor-pointer">
          <input
            type="checkbox"
            checked={filtered.length > 0 && filtered.every((m) => selected.has(m.id))}
            onChange={selectAllFiltered}
            className="accent-primary"
          />
          Selecionar tudo
        </label>
      </div>

      {selected.size > 0 && (
        <div className="rounded-xl bg-accent p-3 flex justify-between items-center mb-4">
          <span className="text-sm font-bold">{selected.size} etiqueta(s) selecionada(s)</span>
          <button
            onClick={handleDownloadBatch}
            className="rounded-lg px-3 py-1.5 font-mono-label text-xs font-bold"
            style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
          >
            baixar etiquetas selecionadas
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-muted-fg text-sm">Carregando…</div>
      ) : (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
          {filtered.map((m) => (
            <div key={m.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex justify-between items-start gap-2 mb-2">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.has(m.id)}
                    onChange={() => toggleSelect(m.id)}
                    className="mt-0.5 accent-primary"
                  />
                  <span className="text-sm font-bold">{m.name}</span>
                </label>
                <StatusBadge status={m.status} />
              </div>
              <div className="text-[11px] text-muted-fg flex flex-col gap-0.5 mb-3">
                <span>Unidade: {m.events?.location}</span>
                <span>Evento: {m.events?.name}</span>
                <span>Itens: {m.total_items}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    await ensureItemsLoaded(m.id);
                    setPreviewId(m.id);
                  }}
                  className="flex-1 text-xs rounded-lg border border-border py-1.5 hover:bg-muted"
                >
                  Visualizar
                </button>
                <button
                  onClick={() => handleDownloadSingle(m)}
                  className="flex-1 text-xs rounded-lg py-1.5 font-semibold"
                  style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
                >
                  Baixar PDF
                </button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-16 text-muted-fg border border-border rounded-xl">
              Nenhum malote encontrado.
            </div>
          )}
        </div>
      )}

      {previewMalote && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewId(null)}
        >
          <div
            className="rounded-xl border border-border bg-card max-w-[520px] w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rounded-lg overflow-hidden border-2" style={{ borderColor: 'var(--primary)' }}>
              <div className="flex justify-between items-center px-4 py-2" style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
                <span className="text-sm font-bold">RDChecklist</span>
                <span className="text-[11px] opacity-85">CAPA DE MALOTE</span>
              </div>
              <div className="p-4">
                <div className="text-lg font-bold mb-3" style={{ color: 'var(--primary)' }}>
                  {previewMalote.name}
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11.5px] mb-3">
                  <div><span className="text-muted-fg">Evento:</span> {previewMalote.events?.name}</div>
                  <div><span className="text-muted-fg">Local:</span> {previewMalote.events?.location}</div>
                  <div><span className="text-muted-fg">Data:</span> {new Date(previewMalote.events?.date).toLocaleDateString('pt-BR')}</div>
                  <div><span className="text-muted-fg">Cargo:</span> {previewMalote.tipo}</div>
                </div>
                <table className="w-full text-[11.5px]">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-1">Item</th>
                      <th className="pb-1">Qtd</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(itemsByMalote[previewMalote.id] ?? []).map((it) => (
                      <tr key={it.id}>
                        <td className="py-0.5">{it.name}</td>
                        <td className="py-0.5">{it.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-3 text-[11.5px]">
                  <span className="text-muted-fg">Observações:</span> ___________________________
                </div>
                <div className="grid grid-cols-2 gap-4 mt-5">
                  <div>
                    <div className="border-t border-muted-fg mb-1" />
                    <div className="text-[10.5px] text-muted-fg text-center">Entregue por (assinatura)</div>
                  </div>
                  <div>
                    <div className="border-t border-muted-fg mb-1" />
                    <div className="text-[10.5px] text-muted-fg text-center">Recebido por — Fiscal (assinatura)</div>
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={() => handleDownloadSingle(previewMalote)}
              className="w-full mt-4 rounded-lg py-2.5 font-mono-label text-xs font-bold"
              style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
            >
              baixar etiqueta em pdf
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
