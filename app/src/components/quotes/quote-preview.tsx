'use client';

import { Download, Send, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { COMPANY_INFO } from '@/lib/company-info';
import type { Client } from '@/types/clients.types';
import type { QuoteItem, QuoteDeliveryType } from '@/types/quotes.types';

interface QuotePreviewProps {
  protocol: string;
  selectedClient: Client | null;
  items: QuoteItem[];
  deliveryType: QuoteDeliveryType;
  paymentMethod: string | null;
  validityDays: number;
  discountEnabled: boolean;
  discountPercent: number;
  onDownloadPdf?: () => void;
  onSendWhatsApp?: () => void;
  canSendWhatsApp?: boolean;
  sendingWhatsApp?: boolean;
}

export function QuotePreview({
  protocol,
  selectedClient,
  items,
  deliveryType,
  paymentMethod,
  validityDays,
  discountEnabled,
  discountPercent,
  onDownloadPdf,
  onSendWhatsApp,
  canSendWhatsApp,
  sendingWhatsApp,
}: QuotePreviewProps) {
  const today = new Date();
  const validityDate = new Date(today);
  validityDate.setDate(validityDate.getDate() + validityDays);

  const itemsTotal = items.reduce((sum, item) => sum + item.total_price, 0);
  const discountAmount = discountEnabled
    ? Math.round(itemsTotal * (discountPercent / 100) * 100) / 100
    : 0;
  const total = itemsTotal - discountAmount;

  const formatLocalDate = (date: Date) =>
    new Intl.DateTimeFormat('pt-BR').format(date);

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 px-6 py-5">
        <div className="flex items-center gap-4">
          {/* Logo circle */}
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gray-900 dark:bg-gray-100">
            <span className="text-lg font-bold text-white dark:text-gray-900">
              {COMPANY_INFO.initials}
            </span>
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
              {COMPANY_INFO.tradeName}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mt-0.5">
              Orçamento Oficial de Proposta Comercial
            </p>
          </div>
        </div>

        {/* Company info */}
        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          <p>{COMPANY_INFO.name}</p>
          <p>{COMPANY_INFO.address}</p>
        </div>
      </div>

      {/* Protocol badge */}
      <div className="flex items-center justify-between bg-gray-900 dark:bg-gray-100 px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-700 dark:bg-gray-300">
            <span className="text-xs font-bold text-white dark:text-gray-900">OP</span>
          </div>
          <span className="text-sm font-bold text-white dark:text-gray-900 font-mono">
            {protocol || 'OP___-__'}
          </span>
        </div>
        <div className="text-right text-xs text-gray-300 dark:text-gray-600">
          <p>Emissão: {formatLocalDate(today)}</p>
          <p>Validade: {formatLocalDate(validityDate)}</p>
        </div>
      </div>

      {/* Green divider */}
      <div className="h-1 bg-green-500" />

      {/* Destinatario */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
          Destinatario
        </p>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
          {selectedClient?.name || 'NAO IDENTIFICADO'}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Tel: {selectedClient?.phone || '---'}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {selectedClient?.address
            ? `${selectedClient.address}${selectedClient.address_number ? `, ${selectedClient.address_number}` : ''} - ${selectedClient.neighborhood || ''}, ${selectedClient.city || ''}`
            : '---'}
        </p>
      </div>

      {/* Condicoes comerciais */}
      <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
          Condições Comerciais
        </p>
        <div className="flex gap-6 text-xs text-gray-600 dark:text-gray-400">
          <p>
            <span className="font-medium">Pagamento:</span>{' '}
            {paymentMethod || 'A definir'}
          </p>
          <p>
            <span className="font-medium">Modalidade:</span>{' '}
            {deliveryType === 'entrega' ? 'Entrega' : 'Retirada'}
          </p>
        </div>
      </div>

      {/* Tabela de itens */}
      <div className="px-6 py-4 relative">
        {items.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-6xl font-black text-gray-100 dark:text-gray-800 select-none">
              {COMPANY_INFO.initials}
            </span>
          </div>
        )}

        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="py-2 text-left font-semibold text-gray-500 dark:text-gray-400 uppercase">COD</th>
              <th className="py-2 text-left font-semibold text-gray-500 dark:text-gray-400 uppercase">Descrição</th>
              <th className="py-2 text-center font-semibold text-gray-500 dark:text-gray-400 uppercase">QTD</th>
              <th className="py-2 text-right font-semibold text-gray-500 dark:text-gray-400 uppercase">Unitario</th>
              <th className="py-2 text-right font-semibold text-gray-500 dark:text-gray-400 uppercase">Desconto</th>
              <th className="py-2 text-right font-semibold text-gray-500 dark:text-gray-400 uppercase">Liquido</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-gray-400 dark:text-gray-500">
                  Nenhum item adicionado
                </td>
              </tr>
            ) : (
              items.map((item, index) => (
                <tr key={`${item.product_id}-${index}`} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2 font-mono text-gray-600 dark:text-gray-400">{item.product_sku}</td>
                  <td className="py-2 text-gray-900 dark:text-gray-100">{item.product_name}</td>
                  <td className="py-2 text-center text-gray-600 dark:text-gray-400">{item.quantity}</td>
                  <td className="py-2 text-right text-gray-600 dark:text-gray-400">{formatCurrency(item.unit_price)}</td>
                  <td className="py-2 text-right text-gray-600 dark:text-gray-400">
                    {item.discount_amount > 0 ? formatCurrency(item.discount_amount) : '---'}
                  </td>
                  <td className="py-2 text-right font-medium text-gray-900 dark:text-gray-100">
                    {formatCurrency(item.total_price)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Totais */}
      <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700">
        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
          <span>Subtotal</span>
          <span className="font-medium">{formatCurrency(itemsTotal)}</span>
        </div>
        {discountEnabled && discountAmount > 0 && (
          <div className="flex justify-between text-xs text-red-600 dark:text-red-400 mt-1">
            <span>Desconto Promocional ({discountPercent}%)</span>
            <span className="font-medium">-{formatCurrency(discountAmount)}</span>
          </div>
        )}
      </div>

      {/* Total box */}
      <div className="mx-6 mb-4 rounded-lg bg-green-600 px-4 py-3 flex justify-between items-center">
        <span className="text-sm font-bold text-white uppercase">Total</span>
        <span className="text-lg font-bold text-white">{formatCurrency(total)}</span>
      </div>

      {/* Observações */}
      <div className="px-6 pb-4">
        <p className="text-[10px] text-gray-400 dark:text-gray-500 italic">
          Valores sujeitos a alteracao apos o prazo de validade ({validityDays} DIAS).
        </p>
      </div>

      {/* Barra de botoes PDF / WhatsApp */}
      {(onDownloadPdf || onSendWhatsApp) && (
        <div className="flex items-center gap-2 px-6 pb-4">
          {onDownloadPdf && (
            <button
              onClick={onDownloadPdf}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-green-600 px-4 py-2.5 text-xs font-bold text-green-600 uppercase hover:bg-green-50 dark:hover:bg-green-950 transition-colors"
            >
              <Download className="h-4 w-4" />
              BAIXAR PDF
            </button>
          )}
          {onSendWhatsApp && canSendWhatsApp && (
            <button
              onClick={onSendWhatsApp}
              disabled={sendingWhatsApp}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-xs font-bold text-white uppercase hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {sendingWhatsApp ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  ENVIANDO...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  ENVIAR WHATSAPP
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
