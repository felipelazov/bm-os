'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { getSaleWithItems } from '@/services/sales/sales.service';
import { getStockLocations } from '@/services/products/stock.service';
import type { Sale, SaleItem } from '@/types/sales.types';
import type { StockLocation } from '@/types/products.types';

interface SaleDetailModalProps {
  saleId: string;
  onClose: () => void;
  onEdit: (sale: Sale) => void;
  onCancel?: (sale: Sale) => void;
}

const STATUS_COLORS: Record<string, string> = {
  em_aberto: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  finalizada: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  cancelada: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

const STATUS_LABELS: Record<string, string> = {
  em_aberto: 'Em Aberto',
  finalizada: 'Finalizada',
  cancelada: 'Cancelada',
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pendente: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  pago: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
};

const CLIENT_TYPE_COLORS: Record<string, string> = {
  varejo: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  mensalista: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  doacao: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
};

const CLIENT_TYPE_LABELS: Record<string, string> = {
  varejo: 'Varejo',
  mensalista: 'Mensalista',
  doacao: 'Doação',
};

export function SaleDetailModal({ saleId, onClose, onEdit, onCancel }: SaleDetailModalProps) {
  const [sale, setSale] = useState<Sale | null>(null);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [saleData, locs] = await Promise.all([
          getSaleWithItems(saleId),
          getStockLocations(),
        ]);
        setSale(saleData.sale);
        setItems(saleData.items);
        setLocations(locs);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar venda');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [saleId]);

  const locationName = sale?.delivery_location_id
    ? locations.find((l) => l.id === sale.delivery_location_id)?.name ?? sale.delivery_location_id
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white dark:bg-gray-800 shadow-xl">
        {/* Loading */}
        {loading && (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="p-6">
            <div className="rounded-lg bg-red-50 dark:bg-red-950 p-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
            <button
              onClick={onClose}
              className="mt-4 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              FECHAR
            </button>
          </div>
        )}

        {/* Content */}
        {sale && !loading && (
          <>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="text-lg font-mono font-bold text-gray-900 dark:text-gray-100">
                  {sale.protocol}
                </span>
                <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_COLORS[sale.status])}>
                  {STATUS_LABELS[sale.status] || sale.status}
                </span>
                <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-medium', PAYMENT_STATUS_COLORS[sale.payment_status])}>
                  {sale.payment_status === 'pago' ? 'Pago' : 'Pendente'}
                </span>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-5">
              {/* Cliente */}
              <div>
                <h3 className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400 mb-1">
                  Cliente
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {sale.client_name}
                  </span>
                  {sale.client_type && (
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', CLIENT_TYPE_COLORS[sale.client_type])}>
                      {CLIENT_TYPE_LABELS[sale.client_type] || sale.client_type}
                    </span>
                  )}
                </div>
              </div>

              {/* Itens */}
              <div>
                <h3 className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400 mb-2">
                  Itens ({items.length})
                </h3>
                <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                          Item
                        </th>
                        <th className="px-3 py-2 text-center text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                          Qtd
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                          Unitario
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {items.map((item, idx) => (
                        <tr key={item.id || idx}>
                          <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100">
                            {item.product_name}
                          </td>
                          <td className="px-3 py-2 text-center text-sm text-gray-600 dark:text-gray-400">
                            {item.quantity}
                          </td>
                          <td className="px-3 py-2 text-right text-sm text-gray-600 dark:text-gray-400">
                            {formatCurrency(item.unit_price)}
                          </td>
                          <td className="px-3 py-2 text-right text-sm font-medium text-gray-900 dark:text-gray-100">
                            {formatCurrency(item.total_price)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Entrega */}
              <div>
                <h3 className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400 mb-1">
                  Entrega
                </h3>
                <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  <p>
                    <span className="text-gray-500 dark:text-gray-400">Tipo: </span>
                    {sale.delivery_type === 'entrega' ? 'Entrega' : 'Retirada'}
                  </p>
                  {sale.delivery_type === 'retirada' && locationName && (
                    <p>
                      <span className="text-gray-500 dark:text-gray-400">Local: </span>
                      {locationName}
                    </p>
                  )}
                  {sale.freight_enabled && (
                    <p>
                      <span className="text-gray-500 dark:text-gray-400">Frete: </span>
                      {formatCurrency(sale.freight_amount)}
                    </p>
                  )}
                </div>
              </div>

              {/* Pagamento */}
              <div>
                <h3 className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400 mb-1">
                  Pagamento
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="text-gray-500 dark:text-gray-400">Forma: </span>
                  {sale.payment_method || 'Não definida'}
                </p>
              </div>

              {/* Resumo Financeiro */}
              <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-4 space-y-2">
                <h3 className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400 mb-2">
                  Resumo Financeiro
                </h3>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal itens</span>
                  <span className="text-gray-900 dark:text-gray-100">{formatCurrency(sale.items_total)}</span>
                </div>
                {sale.freight_enabled && sale.freight_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Frete</span>
                    <span className="text-gray-900 dark:text-gray-100">{formatCurrency(sale.freight_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold border-t border-gray-200 dark:border-gray-700 pt-2">
                  <span className="text-gray-900 dark:text-gray-100">Total liquido</span>
                  <span className="text-green-600 dark:text-green-400">{formatCurrency(sale.total)}</span>
                </div>
              </div>

              {/* Datas */}
              <div>
                <h3 className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400 mb-1">
                  Datas
                </h3>
                <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  <p>
                    <span className="text-gray-500 dark:text-gray-400">Criado em: </span>
                    {formatDate(sale.created_at)}
                  </p>
                  {sale.finalized_at && (
                    <p>
                      <span className="text-gray-500 dark:text-gray-400">Finalizado em: </span>
                      {formatDate(sale.finalized_at)}
                    </p>
                  )}
                  {sale.cancelled_at && (
                    <p>
                      <span className="text-gray-500 dark:text-gray-400">Cancelado em: </span>
                      {formatDate(sale.cancelled_at)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
              <button
                onClick={onClose}
                className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                FECHAR
              </button>
              {sale.status !== 'cancelada' && onCancel && (
                <button
                  onClick={() => onCancel(sale)}
                  className="rounded-lg border border-red-300 dark:border-red-600 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                >
                  CANCELAR VENDA
                </button>
              )}
              {sale.status === 'em_aberto' && (
                <button
                  onClick={() => onEdit(sale)}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  EDITAR PAGAMENTO
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
