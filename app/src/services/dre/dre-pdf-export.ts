import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatPercent, formatDate } from '@/lib/formatters';
import type { DreReport } from '@/types/dre.types';

interface DreRow {
  label: string;
  value: number;
  margin: number | null;
  indent: number;
  isTotal: boolean;
  isSubtraction: boolean;
}

function buildRows(r: DreReport): DreRow[] {
  return [
    { label: 'RECEITA BRUTA', value: r.receita_bruta, margin: null, indent: 0, isTotal: true, isSubtraction: false },
    { label: '(-) Deduções da Receita', value: r.deducoes_receita, margin: null, indent: 1, isTotal: false, isSubtraction: true },
    { label: '= RECEITA LÍQUIDA', value: r.receita_liquida, margin: null, indent: 0, isTotal: true, isSubtraction: false },
    { label: '(-) CPV / CMV / CSP', value: r.custo_produtos, margin: null, indent: 1, isTotal: false, isSubtraction: true },
    { label: '= LUCRO BRUTO', value: r.lucro_bruto, margin: r.margem_bruta, indent: 0, isTotal: true, isSubtraction: false },
    { label: '(-) Despesas Administrativas', value: r.despesas_administrativas, margin: null, indent: 1, isTotal: false, isSubtraction: true },
    { label: '(-) Despesas Comerciais', value: r.despesas_comerciais, margin: null, indent: 1, isTotal: false, isSubtraction: true },
    { label: '(-) Despesas Gerais', value: r.despesas_gerais, margin: null, indent: 1, isTotal: false, isSubtraction: true },
    { label: '= EBITDA', value: r.ebitda, margin: r.margem_ebitda, indent: 0, isTotal: true, isSubtraction: false },
    { label: '(-) Depreciação e Amortização', value: r.depreciacao_amortizacao, margin: null, indent: 1, isTotal: false, isSubtraction: true },
    { label: '= EBIT (Lucro Operacional)', value: r.ebit, margin: r.margem_operacional, indent: 0, isTotal: true, isSubtraction: false },
    { label: '(+) Receitas Financeiras', value: r.receitas_financeiras, margin: null, indent: 1, isTotal: false, isSubtraction: false },
    { label: '(-) Despesas Financeiras', value: r.despesas_financeiras, margin: null, indent: 1, isTotal: false, isSubtraction: true },
    { label: '= Resultado Financeiro', value: r.resultado_financeiro, margin: null, indent: 0, isTotal: true, isSubtraction: false },
    { label: '= LAIR (Lucro Antes do IR)', value: r.lair, margin: null, indent: 0, isTotal: true, isSubtraction: false },
    { label: '(-) Imposto de Renda', value: r.imposto_renda, margin: null, indent: 1, isTotal: false, isSubtraction: true },
    { label: '(-) CSLL', value: r.csll, margin: null, indent: 1, isTotal: false, isSubtraction: true },
    { label: '= LUCRO LÍQUIDO', value: r.lucro_liquido, margin: r.margem_liquida, indent: 0, isTotal: true, isSubtraction: false },
  ];
}

function getPeriodTypeLabel(type: string): string {
  switch (type) {
    case 'monthly': return 'Mensal';
    case 'quarterly': return 'Trimestral';
    case 'annual': return 'Anual';
    default: return type;
  }
}

export function exportDrePdf(report: DreReport): void {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  // === HEADER ===
  const headerHeight = 35;
  doc.setFillColor(37, 99, 235); // #2563EB
  doc.rect(0, 0, pageWidth, headerHeight, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('ADM PRO', margin, 14);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Demonstração do Resultado do Exercício', margin, 22);

  doc.setFontSize(9);
  const periodLabel = `${report.period.name} (${getPeriodTypeLabel(report.period.type)})`;
  doc.text(periodLabel, margin, 29);
  const dateRange = `${formatDate(report.period.start_date)} — ${formatDate(report.period.end_date)}`;
  doc.text(dateRange, pageWidth - margin, 29, { align: 'right' });

  y = headerHeight + 10;

  // === SUMMARY CARDS ===
  const cardWidth = (contentWidth - 10) / 3;
  const cardHeight = 28;
  const cards = [
    { title: 'Receita Líquida', value: report.receita_liquida, margin: null },
    { title: 'EBITDA', value: report.ebitda, margin: report.margem_ebitda },
    { title: 'Lucro Líquido', value: report.lucro_liquido, margin: report.margem_liquida },
  ];

  cards.forEach((card, i) => {
    const x = margin + i * (cardWidth + 5);

    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(249, 250, 251); // #F9FAFB
    doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'FD');

    doc.setTextColor(107, 114, 128); // gray-500
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(card.title, x + 5, y + 8);

    doc.setTextColor(17, 24, 39); // gray-900
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(card.value), x + 5, y + 17);

    if (card.margin != null) {
      doc.setTextColor(107, 114, 128);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Margem: ${formatPercent(card.margin)}`, x + 5, y + 23);
    }
  });

  y += cardHeight + 10;

  // === DRE TABLE ===
  const rows = buildRows(report);

  const tableBody = rows.map((row) => {
    const indent = '  '.repeat(row.indent);
    const label = `${indent}${row.label}`;
    const valueStr = row.isSubtraction
      ? `(${formatCurrency(row.value)})`
      : formatCurrency(row.value);
    const marginStr = row.margin != null ? formatPercent(row.margin) : '—';
    return [label, valueStr, marginStr];
  });

  autoTable(doc, {
    startY: y,
    head: [['Descrição', 'Valor (R$)', 'Margem (%)']],
    body: tableBody,
    margin: { left: margin, right: margin },
    theme: 'plain',
    styles: {
      fontSize: 9,
      cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
      lineColor: [229, 231, 235], // gray-200
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: [243, 244, 246], // gray-100
      textColor: [17, 24, 39],
      fontStyle: 'bold',
      fontSize: 9,
    },
    columnStyles: {
      0: { cellWidth: contentWidth * 0.55 },
      1: { cellWidth: contentWidth * 0.25, halign: 'right' },
      2: { cellWidth: contentWidth * 0.20, halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.section !== 'body') return;
      const row = rows[data.row.index];
      if (!row) return;

      if (row.isTotal) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [243, 244, 246]; // gray-100
      }

      if (row.isSubtraction && data.column.index === 0) {
        data.cell.styles.textColor = [107, 114, 128]; // gray-500
      }

      if (data.column.index === 1 && row.value < 0) {
        data.cell.styles.textColor = [220, 38, 38]; // red-600
      }
    },
  });

  // === FOOTER ===
  const now = new Date();
  const footerText = `Gerado em ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;

  doc.setTextColor(156, 163, 175); // gray-400
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(footerText, margin, finalY);
  doc.text('ADM PRO — Sistema de Gestão Financeira', pageWidth - margin, finalY, { align: 'right' });

  // === SAVE ===
  const safeName = report.period.name.replace(/[^a-zA-Z0-9\s-]/g, '').replace(/\s+/g, '-');
  doc.save(`DRE-${safeName}.pdf`);
}
