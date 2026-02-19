'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { adjustStock, setStock } from '@/services/products/stock.service';
import type { Product, StockLocation } from '@/types/products.types';

type AdjustMode = 'entry' | 'exit' | 'overwrite';

interface StockAdjustModalProps {
  product: Product;
  location: StockLocation;
  currentQuantity: number;
  onClose: () => void;
  onAdjusted: () => void;
}

const MODE_LABELS: Record<AdjustMode, string> = {
  entry: 'Entrada',
  exit: 'Saída',
  overwrite: 'Definir (Overwrite)',
};

export function StockAdjustModal({
  product,
  location,
  currentQuantity,
  onClose,
  onAdjusted,
}: StockAdjustModalProps) {
  const [mode, setMode] = useState<AdjustMode>('entry');
  const [quantity, setQuantity] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const qtyValue = parseInt(quantity) || 0;

  const previewQty =
    mode === 'entry'
      ? currentQuantity + qtyValue
      : mode === 'exit'
        ? currentQuantity - qtyValue
        : qtyValue;

  const isValid =
    quantity !== '' &&
    qtyValue >= 0 &&
    (mode !== 'exit' || qtyValue <= currentQuantity) &&
    (mode !== 'overwrite' || qtyValue >= 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    try {
      setSaving(true);
      setError('');

      if (mode === 'overwrite') {
        await setStock(product.id, location.id, qtyValue, notes || undefined);
      } else {
        await adjustStock(product.id, location.id, qtyValue, mode, notes || undefined);
      }

      onAdjusted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao ajustar estoque');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-xl bg-white dark:bg-gray-800 shadow-xl">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Ajustar Estoque Local
              </h3>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                Local: {location.name}
              </p>
            </div>
            <button onClick={onClose}>
              <X className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
            </button>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {product.name} · {product.sku}
          </p>
          <p className="mt-0.5 text-xs text-gray-400">
            Estoque atual: <span className="font-semibold">{currentQuantity}</span>
          </p>
        </div>

        {error && (
          <div className="mx-5 mt-4 rounded-lg bg-red-50 dark:bg-red-950 p-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Mode Tabs */}
          <div className="flex rounded-lg bg-gray-100 dark:bg-gray-900 p-1">
            {(['entry', 'exit', 'overwrite'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setQuantity('');
                }}
                className={cn(
                  'flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  mode === m
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                )}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>

          {/* Quantity */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Quantidade
            </label>
            <input
              type="number"
              min={0}
              max={mode === 'exit' ? currentQuantity : undefined}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Digite a quantidade"
              required
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm dark:text-gray-200"
              autoFocus
            />
            {quantity !== '' && (
              <p className="mt-1 text-xs text-gray-400">
                Resultado: {currentQuantity} → <span className={cn('font-semibold', previewQty < 0 ? 'text-red-500' : 'text-green-600')}>{previewQty}</span>
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Motivo / Observação
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Opcional"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm dark:text-gray-200 resize-y"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-gray-200 dark:border-gray-700 p-5">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 dark:border-gray-600 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Voltar
          </button>
          <button
            onClick={(e) => {
              const form = (e.target as HTMLElement).closest('.rounded-xl')?.querySelector('form');
              form?.requestSubmit();
            }}
            disabled={saving || !isValid}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? 'Salvando...' : 'Salvar Alteração'}
          </button>
        </div>
      </div>
    </div>
  );
}
