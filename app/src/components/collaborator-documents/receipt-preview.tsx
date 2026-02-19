'use client';

import { X, Printer } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';
import { printReceiptPdf } from '@/services/collaborator-documents/receipt-pdf';
import type { CollaboratorDocument } from '@/types/collaborator-documents.types';

interface ReceiptPreviewProps {
  document: CollaboratorDocument;
  onClose: () => void;
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

export function ReceiptPreview({ document: doc, onClose }: ReceiptPreviewProps) {
  const companyName = APP_NAME;
  const companyInitials = companyName.split(' ').map((w) => w[0]).join('').substring(0, 2).toUpperCase();
  const year = new Date(doc.doc_date + 'T12:00:00').getFullYear();

  function handlePrint() {
    printReceiptPdf({ document: doc, companyName, companyInitials });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 flex w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl dark:bg-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Preview do Recibo
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Printer className="h-4 w-4" />
              Imprimir Recibo
            </button>
            <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="overflow-auto p-6">
          <div className="relative mx-auto w-full max-w-xl rounded-lg border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-600 dark:bg-gray-900">
            {/* Watermark */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
              <span className="select-none text-[120px] font-bold text-gray-100 dark:text-gray-800" style={{ transform: 'rotate(-30deg)' }}>
                {companyInitials}
              </span>
            </div>

            {/* Content */}
            <div className="relative z-10">
              {/* Header bar */}
              <div className="flex items-center gap-4 rounded-lg bg-blue-600 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-bold text-blue-600">
                  {companyInitials}
                </div>
                <div className="text-white">
                  <div className="text-lg font-bold">RECIBO DE PAGAMENTO</div>
                  <div className="text-sm opacity-80">{companyName} &bull; {year}</div>
                </div>
              </div>

              {/* Registry + Amount */}
              <div className="mt-6 flex items-center justify-between">
                <span className="text-xs text-gray-500">N&ordm; de Registro: {doc.registry_code}</span>
                <span className="text-2xl font-bold text-blue-600">
                  {formatCurrencyBR(doc.amount ?? 0)}
                </span>
              </div>

              <hr className="my-4 border-gray-200 dark:border-gray-700" />

              {/* Body */}
              <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                Recebemos de <strong>{companyName.toUpperCase()}</strong>, a import&acirc;ncia supra de{' '}
                <strong>{formatCurrencyBR(doc.amount ?? 0)}</strong>, referente a{' '}
                {doc.description}, compet&ecirc;ncia {doc.reference || 'N/A'}.
              </p>
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                O referido pagamento foi efetuado via <strong>{doc.payment_method || 'N/A'}</strong>.
              </p>

              {/* Favorecido box */}
              <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Favorecido
                </span>
                <div className="mt-1 text-base font-semibold text-gray-900 dark:text-gray-100">
                  {doc.collaborator_name}
                </div>
                {(doc.collaborator_department || doc.collaborator_job_title) && (
                  <div className="mt-0.5 text-sm text-gray-500">
                    {[doc.collaborator_department, doc.collaborator_job_title].filter(Boolean).join(' • ')}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="mt-8 text-sm text-gray-600 dark:text-gray-400">
                Local e data: _____________, {formatDateBR(doc.doc_date)}
              </div>
              <div className="mt-8 flex flex-col items-center">
                <div className="w-64 border-b border-gray-400" />
                <span className="mt-1 text-xs text-gray-500">Assinatura do Favorecido</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
