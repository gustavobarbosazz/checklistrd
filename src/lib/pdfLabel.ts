import { andarLabel } from '@/lib/roleCatalog';

interface MaloteForLabel {
  name: string;
  tipo: string;
  category: string;
  andar: string;
}
interface EventForLabel {
  name: string;
  location: string;
  date: string;
}
interface ItemForLabel {
  name: string;
  quantity: string;
}

/**
 * Desenha uma capa de malote (Pimaco 6288) dentro da área [x0,y0,w,h] do doc.
 * Usado tanto para etiqueta individual quanto para lote (4 por folha).
 * Observações + assinaturas ficam ancoradas no rodapé, então cabem
 * independentemente de quantos itens o malote tiver.
 */
export function renderCoverPage(
  doc: any,
  malote: MaloteForLabel,
  event: EventForLabel | null,
  items: ItemForLabel[],
  x0: number,
  y0: number,
  w: number,
  h: number
) {
  doc.setDrawColor(4, 120, 87);
  doc.setLineWidth(0.8);
  doc.rect(x0 + 2, y0 + 2, w - 4, h - 4);

  doc.setFillColor(4, 120, 87);
  doc.rect(x0 + 2, y0 + 2, w - 4, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('RDChecklist', x0 + 5, y0 + 8.5);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('CAPA DE MALOTE', x0 + w - 2 - doc.getTextWidth('CAPA DE MALOTE'), y0 + 8.5);

  doc.setTextColor(4, 120, 87);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(malote.name, x0 + 5, y0 + 18, { maxWidth: w - 10 });

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  let ty = y0 + 24;
  doc.text(`Evento: ${event?.name ?? '—'}`, x0 + 5, ty, { maxWidth: (w - 10) / 2 - 2 });
  doc.text(`Local: ${event?.location ?? '—'}`, x0 + w / 2, ty);
  ty += 5;
  doc.text(`Data: ${event ? new Date(event.date).toLocaleDateString('pt-BR') : '—'}`, x0 + 5, ty);
  doc.text(
    `Cargo: ${malote.tipo}${malote.category === 'por_andar' ? ' · ' + andarLabel(malote.andar) : ''}`,
    x0 + w / 2,
    ty
  );
  ty += 6;

  doc.setFont('helvetica', 'bold');
  doc.text('Item', x0 + 5, ty);
  doc.text('Qtd', x0 + w - 14, ty);
  doc.setLineWidth(0.2);
  doc.line(x0 + 4, ty + 1.5, x0 + w - 4, ty + 1.5);
  doc.setFont('helvetica', 'normal');
  ty += 5;

  // Reserva espaço fixo no rodapé para observações + assinaturas
  const footerLimit = y0 + h - 16;
  let hiddenCount = 0;
  items.forEach((it) => {
    if (ty > footerLimit) {
      hiddenCount++;
      return;
    }
    doc.text(it.name, x0 + 5, ty, { maxWidth: w - 24 });
    doc.text(String(it.quantity), x0 + w - 14, ty);
    ty += 4.5;
  });
  if (hiddenCount > 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(5.5);
    doc.text(`+ ${hiddenCount} item(ns) — ver checklist completo no sistema`, x0 + 5, Math.min(ty, footerLimit + 4));
  }

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Observações: ________________________', x0 + 5, y0 + h - 13);

  const sigY = y0 + h - 6;
  const colGap = 4;
  doc.setLineWidth(0.2);
  doc.setDrawColor(100, 116, 139);
  doc.line(x0 + 5, sigY, x0 + w / 2 - colGap / 2, sigY);
  doc.line(x0 + w / 2 + colGap / 2, sigY, x0 + w - 5, sigY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.8);
  doc.setTextColor(71, 85, 105);
  doc.text('Entregue por (assinatura)', x0 + 5, sigY + 3);
  doc.text('Recebido por — Fiscal (assinatura)', x0 + w / 2 + colGap / 2, sigY + 3);
}

export async function downloadSingleLabel(
  malote: MaloteForLabel,
  event: EventForLabel | null,
  items: ItemForLabel[]
) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [138.11, 106.36] });
  renderCoverPage(doc, malote, event, items, 0, 0, 138.11, 106.36);
  doc.save(`etiqueta_${malote.name.replace(/[^a-z0-9]+/gi, '_')}.pdf`);
}

export async function downloadBatchLabels(
  entries: { malote: MaloteForLabel; event: EventForLabel | null; items: ItemForLabel[] }[]
) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
  const pageW = 279.4;
  const pageH = 215.9;
  const labelW = 138.11;
  const labelH = 106.36;
  const positions: [number, number][] = [
    [1, 1],
    [pageW / 2 + 1, 1],
    [1, pageH / 2 + 1],
    [pageW / 2 + 1, pageH / 2 + 1],
  ];

  entries.forEach(({ malote, event, items }, idx) => {
    const posIdx = idx % 4;
    if (idx > 0 && posIdx === 0) doc.addPage();
    const [x, y] = positions[posIdx];
    renderCoverPage(doc, malote, event, items, x, y, labelW - 2, labelH - 2);
  });

  doc.save('etiquetas_lote.pdf');
}
