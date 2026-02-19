'use client';

import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import type { PaymentStatus } from '@/types/sales.types';
import { SALE_PAYMENT_METHODS } from '@/types/sales.types';

interface StepPaymentProps {
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  itemsTotal: number;
  freightAmount: number;
  onPaymentStatusChange: (status: PaymentStatus) => void;
  onPaymentMethodChange: (method: string) => void;
}

export function StepPayment({
  paymentStatus,
  paymentMethod,
  itemsTotal,
  freightAmount,
  onPaymentStatusChange,
  onPaymentMethodChange,
}: StepPaymentProps) {
  const total = itemsTotal + freightAmount;

  return (
    <div className="space-y-6">
      {/* Payment Status Toggle */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
          Status do Pagamento
        </h3>
        <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
          <button
            onClick={() => onPaymentStatusChange('pendente')}
            className={cn(
              'flex-1 rounded-md py-2.5 text-sm font-medium transition-colors',
              paymentStatus === 'pendente'
                ? 'bg-white dark:bg-gray-700 text-yellow-700 dark:text-yellow-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            )}
          >
            PENDENTE
          </button>
          <button
            onClick={() => onPaymentStatusChange('pago')}
            className={cn(
              'flex-1 rounded-md py-2.5 text-sm font-medium transition-colors',
              paymentStatus === 'pago'
                ? 'bg-white dark:bg-gray-700 text-green-700 dark:text-green-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            )}
          >
            PAGO
          </button>
        </div>
      </div>

      {/* Payment Method */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Forma de Pagamento
        </label>
        <select
          value={paymentMethod}
          onChange={(e) => onPaymentMethodChange(e.target.value)}
          className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm dark:text-gray-200"
        >
          <option value="">Selecionar...</option>
          {SALE_PAYMENT_METHODS.map((method) => (
            <option key={method} value={method}>
              {method}
            </option>
          ))}
        </select>
      </div>

      {/* Financial Summary */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
        <h4 className="mb-4 text-sm font-semibold uppercase text-gray-500 dark:text-gray-400">
          Resumo Financeiro
        </h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Itens</span>
            <span className="text-gray-900 dark:text-gray-100">{formatCurrency(itemsTotal)}</span>
          </div>
          {freightAmount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Frete</span>
              <span className="text-gray-900 dark:text-gray-100">{formatCurrency(freightAmount)}</span>
            </div>
          )}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">TOTAL LIQUIDO</span>
              <span className="text-lg font-bold text-green-600 dark:text-green-400">
                {formatCurrency(total)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Info */}
      {paymentStatus === 'pago' && (
        <div className="rounded-lg bg-green-50 dark:bg-green-950 p-3 text-sm text-green-700 dark:text-green-400">
          Esta venda sera marcada como <strong>Finalizada</strong> e a baixa no estoque sera realizada automaticamente (se aplicavel).
        </div>
      )}
      {paymentStatus === 'pendente' && (
        <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950 p-3 text-sm text-yellow-700 dark:text-yellow-400">
          Esta venda ficara <strong>Em Aberto</strong> ate que o pagamento seja confirmado.
        </div>
      )}
    </div>
  );
}
