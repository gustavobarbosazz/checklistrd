'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { logAudit } from '@/lib/audit';
import { ProgressBar, StatusBadge } from '@/lib/ui';
import type { Malote, MaloteItem } from '@/types/database';

export default function ChecklistDetailPage() {
  const params = useParams();
  const maloteId = params.id as string;
  const supabase = createClient();

  const [malote, setMalote] = useState<Malote | null>(null);
  const [items, setItems] = useState<MaloteItem[]>([]);
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
        {malote.category === 'por_andar' ? ` · ${malote.andar}` : ''}
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

      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <label
            key={item.id}
            className="rounded-xl border border-border bg-card p-4 flex items-start gap-3 cursor-pointer hover:bg-muted/40 transition-colors"
          >
            <input
              type="checkbox"
              checked={item.checked}
              onChange={() => toggleItem(item)}
              className="w-[18px] h-[18px] mt-0.5 accent-primary flex-shrink-0"
            />
            <div className="flex-1">
              <span className={`text-sm font-medium ${item.checked ? 'line-through text-muted-fg' : ''}`}>
                {item.name}
                {Number(item.quantity) > 1 ? ` ×${item.quantity}` : ''}
              </span>
              {item.checked && (
                <div className="text-[11px] text-muted-fg mt-0.5">
                  Conferido em {item.checked_at ? new Date(item.checked_at).toLocaleString('pt-BR') : '—'}
                </div>
              )}
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
