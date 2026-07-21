'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { logAudit } from '@/lib/audit';

export default function RelatorioDetailPage() {
  const params = useParams();
  const eventId = params.id as string;
  const supabase = createClient();

  const [event, setEvent] = useState<any>(null);
  const [malotes, setMalotes] = useState<any[]>([]);
  const [items, setItems] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: ev } = await supabase.from('events').select('*').eq('id', eventId).single();
      const { data: mal } = await supabase.from('malotes').select('*').eq('event_id', eventId).order('tipo');
      setEvent(ev);
      setMalotes(mal ?? []);

      const itemsByMalote: Record<string, any[]> = {};
      for (const m of mal ?? []) {
        const { data: its } = await supabase.from('malote_items').select('*').eq('malote_id', m.id);
        itemsByMalote[m.id] = its ?? [];
      }
      setItems(itemsByMalote);
      setLoading(false);
    })();
  }, [eventId]);

  const totalItems = malotes.reduce((a, m) => a + m.total_items, 0);
  const checked = malotes.reduce((a, m) => a + m.checked_items, 0);
  const pct = totalItems ? Math.round((checked / totalItems) * 100) : 0;

  async function downloadPdf() {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    let y = 15;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(4, 120, 87);
    doc.text('RELATÓRIO DE CONFERÊNCIA - MALOTES', 15, y);
    y += 8;

    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');
    doc.text(`Evento: ${event.name}`, 15, y);
    y += 5;
    doc.text(`Local: ${event.location}   Data: ${new Date(event.date).toLocaleDateString('pt-BR')}`, 15, y);
    y += 8;

    for (const m of malotes) {
      if (y > 270) {
        doc.addPage();
        y = 15;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(`${m.name} (${m.checked_items}/${m.total_items})`, 15, y);
      y += 4.5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      for (const it of items[m.id] ?? []) {
        if (y > 275) {
          doc.addPage();
          y = 15;
        }
        doc.text(`${it.checked ? '[x]' : '[ ]'} ${it.name}`, 20, y);
        y += 4;
      }
      y += 2;
    }

    if (y > 260) {
      doc.addPage();
      y = 15;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('RESUMO FINAL', 15, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Total de itens: ${totalItems}`, 15, y);
    y += 5;
    doc.text(`Conferidos: ${checked} (${pct}%)`, 15, y);

    doc.save(`relatorio_${event.name.replace(/[^a-z0-9]+/gi, '_')}.pdf`);
    logAudit({
      acao: 'Exportou',
      modulo: 'Relatórios',
      itemAfetado: event.name,
      detalhes: 'Relatório PDF baixado',
      resultado: 'Sucesso',
    });
  }

  if (loading) return <div className="px-8 py-8 text-muted-fg text-sm">Carregando…</div>;
  if (!event) return <div className="px-8 py-8 text-muted-fg text-sm">Evento não encontrado.</div>;

  return (
    <div className="px-8 py-8">
      <div className="flex justify-between items-start flex-wrap gap-3 mb-5">
        <div>
          <Link href="/relatorios" className="text-muted-fg text-sm hover:text-fg">
            ← Voltar
          </Link>
          <h1 className="font-display text-2xl font-bold mt-1">Relatório — {event.name}</h1>
        </div>
        <button
          onClick={downloadPdf}
          className="rounded-lg px-4 py-2 font-mono-label text-xs font-bold"
          style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
        >
          baixar pdf
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="Total de Itens" value={totalItems} />
        <StatCard label="Conferidos" value={checked} />
        <StatCard label="% Conclusão" value={`${pct}%`} />
      </div>

      <div className="flex flex-col gap-3">
        {malotes.map((m) => (
          <div key={m.id} className="rounded-xl border border-border bg-card p-4">
            <div className="text-sm font-bold mb-2">{m.name}</div>
            <div className="flex flex-wrap gap-1.5">
              {(items[m.id] ?? []).map((it) => (
                <span key={it.id} className="text-[11px] px-2 py-0.5 rounded-full bg-muted">
                  {it.checked ? '✓' : '○'} {it.name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="font-mono-label text-[11px] text-muted-fg mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
