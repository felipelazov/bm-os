import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { COMPANY_INFO } from '@/lib/company-info';

export interface QuotePdfOptions {
  protocol: string;
  clientName: string;
  clientPhone: string;
  clientAddress: string;
  items: {
    product_sku: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    discount_amount: number;
    total_price: number;
  }[];
  deliveryType: 'entrega' | 'retirada';
  paymentMethod: string | null;
  validityDays: number;
  discountEnabled: boolean;
  discountPercent: number;
  itemsTotal: number;
  discountAmount: number;
  total: number;
  createdAt: Date;
}

function formatCurrencyBR(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateBR(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR').format(date);
}

export function generateQuotePdf(options: QuotePdfOptions): jsPDF {
  const {
    protocol,
    clientName,
    clientPhone,
    clientAddress,
    items,
    deliveryType,
    paymentMethod,
    validityDays,
    discountEnabled,
    discountPercent,
    itemsTotal,
    discountAmount,
    total,
    createdAt,
  } = options;

  const pdf = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = 210;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  const validityDate = new Date(createdAt);
  validityDate.setDate(validityDate.getDate() + validityDays);

  // ---- Header (fundo cinza escuro) ----
  pdf.setFillColor(31, 41, 55); // gray-800
  pdf.rect(0, 0, pageWidth, 38, 'F');

  // Circulo BM
  pdf.setFillColor(255, 255, 255);
  pdf.circle(margin + 10, 19, 9, 'F');
  pdf.setTextColor(31, 41, 55);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text(COMPANY_INFO.initials, margin + 10, 22, { align: 'center' });

  // Titulo
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text(COMPANY_INFO.tradeName, margin + 24, 15);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(200, 200, 200);
  pdf.text('Orçamento Oficial de Proposta Comercial', margin + 24, 22);

  // Dados empresa
  pdf.setFontSize(7);
  pdf.setTextColor(180, 180, 180);
  pdf.text(COMPANY_INFO.name, margin + 24, 29);
  pdf.text(COMPANY_INFO.address, margin + 24, 34);

  // ---- Box protocolo + emissao + validade ----
  let y = 42;
  pdf.setFillColor(31, 41, 55);
  pdf.rect(margin, y, contentWidth, 16, 'F');

  // Circulo OP
  pdf.setFillColor(75, 85, 99); // gray-600
  pdf.circle(margin + 10, y + 8, 6, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.text('OP', margin + 10, y + 10, { align: 'center' });

  // Protocolo
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text(protocol, margin + 20, y + 10);

  // Emissao e validade (direita)
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(200, 200, 200);
  pdf.text(`Emissao: ${formatDateBR(createdAt)}`, pageWidth - margin, y + 7, { align: 'right' });
  pdf.text(`Validade: ${formatDateBR(validityDate)}`, pageWidth - margin, y + 13, { align: 'right' });

  // ---- Barra verde ----
  y += 16;
  pdf.setFillColor(34, 197, 94); // green-500
  pdf.rect(margin, y, contentWidth, 1.5, 'F');

  // ---- Destinatario ----
  y += 6;
  pdf.setTextColor(107, 114, 128); // gray-500
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.text('DESTINATARIO', margin, y);

  y += 5;
  pdf.setTextColor(31, 41, 55);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text(clientName || 'NAO IDENTIFICADO', margin, y);

  y += 5;
  pdf.setTextColor(107, 114, 128);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Tel: ${clientPhone || '---'}`, margin, y);

  y += 4;
  pdf.text(clientAddress || '---', margin, y);

  // ---- Condicoes comerciais ----
  y += 7;
  pdf.setFillColor(249, 250, 251); // gray-50
  pdf.rect(margin, y, contentWidth, 12, 'F');
  pdf.setDrawColor(229, 231, 235); // gray-200
  pdf.rect(margin, y, contentWidth, 12, 'S');

  y += 4;
  pdf.setTextColor(107, 114, 128);
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.text('CONDICOES COMERCIAIS', margin + 3, y);

  y += 5;
  pdf.setTextColor(75, 85, 99);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'normal');
  pdf.text(
    `Pagamento: ${paymentMethod || 'A definir'}     |     Modalidade: ${deliveryType === 'entrega' ? 'Entrega' : 'Retirada'}`,
    margin + 3,
    y
  );

  // ---- Tabela de itens ----
  y += 6;

  const tableBody = items.map((item) => [
    item.product_sku,
    item.product_name,
    String(item.quantity),
    formatCurrencyBR(item.unit_price),
    item.discount_amount > 0 ? formatCurrencyBR(item.discount_amount) : '---',
    formatCurrencyBR(item.total_price),
  ]);

  if (tableBody.length === 0) {
    tableBody.push(['', 'Nenhum item adicionado', '', '', '', '']);
  }

  autoTable(pdf, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [['COD', 'DESCRICAO', 'QTD', 'UNITARIO', 'DESCONTO', 'LIQUIDO']],
    body: tableBody,
    styles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: [75, 85, 99],
    },
    headStyles: {
      fillColor: [249, 250, 251],
      textColor: [107, 114, 128],
      fontStyle: 'bold',
      fontSize: 7,
    },
    columnStyles: {
      0: { cellWidth: 22, font: 'courier' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 25, halign: 'right' },
      5: { cellWidth: 25, halign: 'right', textColor: [31, 41, 55], fontStyle: 'bold' },
    },
    theme: 'plain',
    didDrawPage: () => {
      // Watermark
      pdf.setTextColor(245, 245, 245);
      pdf.setFontSize(60);
      pdf.setFont('helvetica', 'bold');
      pdf.text(COMPANY_INFO.initials, pageWidth / 2, 180, { align: 'center', angle: 45 });
      pdf.setTextColor(0, 0, 0);
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (pdf as any).lastAutoTable.finalY + 4;

  // ---- Subtotal ----
  pdf.setDrawColor(229, 231, 235);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 5;

  pdf.setTextColor(107, 114, 128);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Subtotal', margin, y);
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatCurrencyBR(itemsTotal), pageWidth - margin, y, { align: 'right' });

  // ---- Desconto ----
  if (discountEnabled && discountAmount > 0) {
    y += 5;
    pdf.setTextColor(220, 38, 38); // red-600
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Desconto Promocional (${discountPercent}%)`, margin, y);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`-${formatCurrencyBR(discountAmount)}`, pageWidth - margin, y, { align: 'right' });
  }

  // ---- Total (fundo verde) ----
  y += 8;
  pdf.setFillColor(22, 163, 74); // green-600
  pdf.roundedRect(margin, y, contentWidth, 14, 3, 3, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TOTAL', margin + 5, y + 9);
  pdf.setFontSize(14);
  pdf.text(formatCurrencyBR(total), pageWidth - margin - 5, y + 9.5, { align: 'right' });

  // ---- Rodape validade ----
  y += 20;
  pdf.setTextColor(156, 163, 175); // gray-400
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'italic');
  pdf.text(
    `Valores sujeitos a alteracao apos o prazo de validade (${validityDays} DIAS).`,
    margin,
    y
  );

  return pdf;
}

export function downloadQuotePdf(options: QuotePdfOptions): void {
  const pdf = generateQuotePdf(options);
  pdf.save(`orcamento-${options.protocol}.pdf`);
}

export function getQuotePdfBlob(options: QuotePdfOptions): Blob {
  const pdf = generateQuotePdf(options);
  return pdf.output('blob');
}
