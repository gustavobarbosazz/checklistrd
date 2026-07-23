'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { logAudit } from '@/lib/audit';
import { ProgressBar } from '@/lib/ui';
import { andarLabel } from '@/lib/roleCatalog';
import type { Malote, MaloteItem } from '@/types/database';

export default function ChecklistDetailPage() {
  const params = useParams();
  const maloteId = params.id as string;
  const supabase = createClient();

  const [malote, setMalote] = useState<Malote | null>(null);
  const [items, setItems] = useState<MaloteItem[]>([]);
  const [observacao, setObservacao] = useState('');
  const [savingObs, setSavingObs] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function load() {
      const { data: m } = await supabase.from('malotes').select('*').eq('id', maloteId).single();
      const { data: its } = await supabase
        .from('malote_items')
        .select('*')
        .eq('malote_id', maloteId)
        .order('created_at');
      setMalote(m as Malote);
      setObservacao((m as Malote)?.observacao ?? '');
      setItems((its as MaloteItem[]) ?? []);
      setLoading(false);

      // Tempo real: qualquer alteração nos itens deste malote (feita por outro
      // usuário, em outro dispositivo) reflete aqui automaticamente.
      channel = supabase
        .channel(`malote-items-${maloteId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'malote_items', filter: `malote_id=eq.${maloteId}` },
          () => load()
        )
        .subscribe();
    }
    load();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maloteId]);

  async function toggleItem(item: MaloteItem) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const nextChecked = !item.checked;

    // Atualização otimista: reflete na tela antes de esperar o banco responder.
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, checked: nextChecked } : i))
    );

    await supabase
      .from('malote_items')
      .update({
        checked: nextChecked,
        checked_by: nextChecked ? user?.id : null,
        checked_at: nextChecked ? new Date().toISOString() : null,
      })
      .eq('id', item.id);

    const updatedItems = items.map((i) => (i.id === item.id ? { ...i, checked: nextChecked } : i));
    const checkedCount = updatedItems.filter((i) => i.checked).length;
    const total = updatedItems.length;
    const status = checkedCount === 0 ? 'pending' : checkedCount === total ? 'completed' : 'in_progress';
    const progress = total ? Math.round((checkedCount / total) * 100) : 0;

    await supabase
      .from('malotes')
      .update({ checked_items: checkedCount, total_items: total, status, progress, updated_at: new Date().toISOString() })
      .eq('id', maloteId);

    setMalote((m) => (m ? { ...m, checked_items: checkedCount, status: status as any, progress } : m));

    logAudit({
      acao: nextChecked ? 'Conferiu item' : 'Desmarcou item',
      modulo: 'Checklists',
      itemAfetado: malote?.name ?? '',
      detalhes: `Item "${item.name}" ${nextChecked ? 'conferido' : 'desmarcado'}`,
      resultado: nextChecked ? 'Sucesso' : 'Alerta',
    });

    if (status === 'completed') {
      logAudit({
        acao: 'Concluiu checklist',
        modulo: 'Checklists',
        itemAfetado: malote?.name ?? '',
        detalhes: 'Todos os itens do malote foram conferidos',
        resultado: 'Sucesso',
      });
    }
  }

  // Quantidade colocada no malote — editável por item, pra registrar quantos
  // de fato foram embalados (pode diferir do padrão do catálogo).
  function handleQuantityChange(itemId: string, value: string) {
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, quantity: value } : i)));
  }

  async function saveQuantity(item: MaloteItem) {
    await supabase.from('malote_items').update({ quantity: item.quantity }).eq('id', item.id);
    logAudit({
      acao: 'Atualizou',
      modulo: 'Checklists',
      itemAfetado: malote?.name ?? '',
      detalhes: `Quantidade de "${item.name}" ajustada para ${item.quantity}`,
      resultado: 'Sucesso',
    });
  }

  // Observação do MALOTE (não do item) — pra registrar que faltou algo,
  // sobrou algo, ou qualquer ressalva sobre o malote como um todo.
  async function saveObservacao() {
    setSavingObs(true);
    await supabase.from('malotes').update({ observacao }).eq('id', maloteId);
    setSavingObs(false);
    logAudit({
      acao: 'Atualizou',
      modulo: 'Checklists',
      itemAfetado: malote?.name ?? '',
      detalhes: 'Observação do malote atualizada',
      resultado: 'Sucesso',
    });
  }

  if (loading) return <div className="px-8 py-8 text-muted-fg text-sm">Carregando…</div>;
  if (!malote) return <div className="px-8 py-8 text-muted-fg text-sm">Malote não encontrado.</div>;

  const pct = items.length ? Math.round((items.filter((i) => i.checked).length / items.length) * 100) : 0;

  return (
    <div className="px-8 py-8 max-w-2xl mx-auto">
      <Link href={`/evento/${malote.event_id}`} className="text-muted-fg text-sm hover:text-fg">
        ← Voltar ao evento
      </Link>
      <h1 className="font-display text-2xl font-bold mt-2">{malote.name}</h1>
      <p className="text-muted-fg text-sm mb-5">
        {malote.tipo}
        {malote.category === 'por_andar' ? ` · ${andarLabel(malote.andar)}` : ''}
      </p>

      <div className="rounded-xl border border-border bg-card p-5 mb-5">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-bold">Progresso</span>
          <span className="text-xs text-muted-fg">
            {items.filter((i) => i.checked).length}/{items.length} ({pct}%)
          </span>
        </div>
        <ProgressBar pct={pct} />
        {pct === 100 && (
          <div className="mt-3 text-green text-sm font-semibold flex items-center gap-2">
            ✓ Todos os itens foram conferidos!
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 mb-5">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-border bg-card p-4 flex items-start gap-3 hover:bg-muted/40 transition-colors"
          >
            <input
              type="checkbox"
              checked={item.checked}
              onChange={() => toggleItem(item)}
              className="w-[18px] h-[18px] mt-0.5 accent-primary flex-shrink-0 cursor-pointer"
            />
            <div className="flex-1 flex items-center gap-3 flex-wrap">
              <span className={`text-sm font-medium ${item.checked ? 'line-through text-muted-fg' : ''}`}>
                {item.name}
              </span>
              <div className="flex items-center gap-1.5 ml-auto">
                <label className="font-mono-label text-[10px] text-muted-fg">Qtd colocada:</label>
                <input
                  value={item.quantity}
                  onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                  onBlur={() => saveQuantity(item)}
                  className="w-16 rounded-md border border-border bg-muted px-2 py-1 text-xs text-center outline-none focus:border-primary"
                />
              </div>
            </div>
            {item.checked && (
              <div className="w-full text-[11px] text-muted-fg mt-0.5 pl-[30px]">
                Conferido em {item.checked_at ? new Date(item.checked_at).toLocaleString('pt-BR') : '—'}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <label className="font-mono-label text-[11px] text-muted-fg block mb-2">
          Observação do malote {savingObs && <span className="text-primary normal-case">(salvando…)</span>}
        </label>
        <textarea
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          onBlur={saveObservacao}
          placeholder="Ex: faltou 1 colete, foi colocado 1 caneta a mais, etc."
          rows={3}
          className="w-full rounded-lg border border-border bg-muted px-3 py-2.5 outline-none focus:border-primary text-sm resize-none"
        />
      </div>
    </div>
  );
}
