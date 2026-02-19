'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getMovements } from '@/services/products/stock.service';
import type { StockMovement } from '@/types/products.types';

interface StockMovementsModalProps {
  productId?: string;
  onClose: () => void;
}

const MOVEMENT_LABELS: Record<string, string> = {
  transfer: 'Transferência',
  entry: 'Entrada',
  exit: 'Saída',
  adjustment: 'Ajuste',
};

const MOVEMENT_COLORS: Record<string, string> = {
  transfer: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  entry: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  exit: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  adjustment: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
};

export function StockMovementsModal({ productId, onClose }: StockMovementsModalProps) {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await getMovements(productId);
        setMovements(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar movimentações');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [productId]);

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-2xl rounded-xl bg-white dark:bg-gray-800 shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Movimentações de Estoque
          </h3>
          <button onClick={onClose}>
            <X className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : error ? (
            <div className="rounded-lg bg-red-50 dark:bg-red-950 p-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          ) : movements.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              Nenhuma movimentação registrada.
            </p>
          ) : (
            <div className="space-y-2">
              {movements.map((mov) => (
                <div
                  key={mov.id}
                  className="rounded-lg border border-gray-200 dark:border-gray-700 p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'rounded-full px-2 py-0.5 text-xs font-medium',
                          MOVEMENT_COLORS[mov.movement_type]
                        )}
                      >
                        {MOVEMENT_LABELS[mov.movement_type]}
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {(mov.product as unknown as { name: string })?.name ?? '—'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">{formatDate(mov.created_at)}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                    <span>Qtd: {mov.quantity}</span>
                    <span className="mx-1">·</span>
                    <span>{(mov.from_location as unknown as { name: string })?.name ?? '—'}</span>
                    <ArrowRight className="h-3 w-3" />
                    <span>{(mov.to_location as unknown as { name: string })?.name ?? '—'}</span>
                  </div>
                  {mov.notes && (
                    <p className="mt-1 text-xs text-gray-400">{mov.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-gray-200 dark:border-gray-700 p-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
