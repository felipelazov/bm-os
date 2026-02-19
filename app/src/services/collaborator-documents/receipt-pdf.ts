import jsPDF from 'jspdf';
import type { CollaboratorDocument } from '@/types/collaborator-documents.types';

interface ReceiptPdfOptions {
  document: CollaboratorDocument;
  companyName: string;
  companyInitials: string;
}

function formatCurrencyBR(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateBR(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function valorPorExtenso(valor: number): string {
  const unidades = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const especiais = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const dezenas = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const centenas = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

  const inteiro = Math.floor(valor);
  const centavos = Math.round((valor - inteiro) * 100);

  function bloco(n: number): string {
    if (n === 0) return '';
    if (n === 100) return 'cem';
    const c = Math.floor(n / 100);
    const r = n % 100;
    const d = Math.floor(r / 10);
    const u = r % 10;

    const parts: string[] = [];
    if (c > 0) parts.push(centenas[c]);
    if (r >= 10 && r < 20) {
      parts.push(especiais[r - 10]);
    } else {
      if (d > 0) parts.push(dezenas[d]);
      if (u > 0) parts.push(unidades[u]);
    }
    return parts.join(' e ');
  }

  const partes: string[] = [];

  if (inteiro === 0) {
    partes.push('zero');
  } else {
    const milhares = Math.floor(inteiro / 1000);
    const resto = inteiro % 1000;

    if (milhares > 0) {
      if (milhares === 1) {
        partes.push('mil');
      } else {
        partes.push(bloco(milhares) + ' mil');
      }
    }
    if (resto > 0) {
      partes.push(bloco(resto));
    }
  }

  let resultado = partes.join(' e ');
  resultado += inteiro === 1 ? ' real' : ' reais';

  if (centavos > 0) {
    resultado += ' e ' + bloco(centavos);
    resultado += centavos === 1 ? ' centavo' : ' centavos';
  }

  return resultado;
}

export function generateReceiptPdf(options: ReceiptPdfOptions): jsPDF {
  const { document: doc, companyName, companyInitials } = options;
  const pdf = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = 210;
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  // Watermark
  pdf.setTextColor(240, 240, 240);
  pdf.setFontSize(80);
  pdf.setFont('helvetica', 'bold');
  pdf.text(companyInitials, pageWidth / 2, 160, { align: 'center', angle: 45 });

  // Reset text color
  pdf.setTextColor(0, 0, 0);

  // Header bar
  pdf.setFillColor(37, 99, 235);
  pdf.rect(0, 0, pageWidth, 40, 'F');

  // Company initials circle
  pdf.setFillColor(255, 255, 255);
  pdf.circle(margin + 12, 20, 10, 'F');
  pdf.setTextColor(37, 99, 235);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text(companyInitials, margin + 12, 24, { align: 'center' });

  // Header text
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(18);
  pdf.text('RECIBO DE PAGAMENTO', margin + 28, 18);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`${companyName} • ${new Date(doc.doc_date + 'T12:00:00').getFullYear()}`, margin + 28, 28);

  // Registry code + amount
  let y = 55;
  pdf.setTextColor(100, 100, 100);
  pdf.setFontSize(9);
  pdf.text(`Nº de Registro: ${doc.registry_code}`, margin, y);

  pdf.setTextColor(37, 99, 235);
  pdf.setFontSize(28);
  pdf.setFont('helvetica', 'bold');
  pdf.text(formatCurrencyBR(doc.amount ?? 0), pageWidth - margin, y, { align: 'right' });

  // Divider
  y += 10;
  pdf.setDrawColor(220, 220, 220);
  pdf.line(margin, y, pageWidth - margin, y);

  // Body text
  y += 15;
  pdf.setTextColor(50, 50, 50);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');

  const amount = doc.amount ?? 0;
  const extenso = valorPorExtenso(amount);
  const bodyText = `Recebemos de ${companyName.toUpperCase()}, inscrita no CNPJ sob nº _______________, a importância supra de ${formatCurrencyBR(amount)} (${extenso}), referente a ${doc.description}, competência ${doc.reference || 'N/A'}.`;

  const bodyLines = pdf.splitTextToSize(bodyText, contentWidth);
  pdf.text(bodyLines, margin, y);
  y += bodyLines.length * 6 + 5;

  const paymentText = `O referido pagamento foi efetuado via ${doc.payment_method || 'N/A'}.`;
  pdf.text(paymentText, margin, y);

  // Favorecido box
  y += 20;
  pdf.setFillColor(245, 247, 250);
  pdf.setDrawColor(200, 210, 230);
  pdf.roundedRect(margin, y, contentWidth, 35, 3, 3, 'FD');

  pdf.setTextColor(100, 100, 100);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.text('FAVORECIDO', margin + 8, y + 10);

  pdf.setTextColor(30, 30, 30);
  pdf.setFontSize(13);
  pdf.text(doc.collaborator_name ?? '', margin + 8, y + 20);

  pdf.setTextColor(100, 100, 100);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  const details = [doc.collaborator_department, doc.collaborator_job_title].filter(Boolean).join(' • ');
  if (details) {
    pdf.text(details, margin + 8, y + 28);
  }

  // Footer: location + date + signature
  y += 55;
  pdf.setTextColor(50, 50, 50);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Local e data: _____________, ${formatDateBR(doc.doc_date)}`, margin, y);

  y += 25;
  pdf.setDrawColor(150, 150, 150);
  pdf.line(margin + 20, y, pageWidth - margin - 20, y);
  pdf.setFontSize(9);
  pdf.setTextColor(120, 120, 120);
  pdf.text('Assinatura do Favorecido', pageWidth / 2, y + 6, { align: 'center' });

  return pdf;
}

export function downloadReceiptPdf(options: ReceiptPdfOptions): void {
  const pdf = generateReceiptPdf(options);
  pdf.save(`recibo-${options.document.registry_code}.pdf`);
}

export function printReceiptPdf(options: ReceiptPdfOptions): void {
  const pdf = generateReceiptPdf(options);
  const blob = pdf.output('blob');
  const url = URL.createObjectURL(blob);
  const iframe = window.document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = url;
  window.document.body.appendChild(iframe);
  iframe.onload = () => {
    iframe.contentWindow?.print();
    setTimeout(() => {
      window.document.body.removeChild(iframe);
      URL.revokeObjectURL(url);
    }, 1000);
  };
}
