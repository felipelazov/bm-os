'use client';

import { useState } from 'react';
import { X, Loader2, ArrowRightLeft } from 'lucide-react';
import type { Product, StockLocation, StockLevel } from '@/types/products.types';
import { transferStock } from '@/services/products/stock.service';

interface StockTransferModalProps {
  product: Product;
  locations: StockLocation[];
  stockLevels: StockLevel[];
  onClose: () => void;
  onTransferred: () => void;
}

export function StockTransferModal({
  product,
  locations,
  stockLevels,
  onClose,
  onTransferred,
}: StockTransferModalProps) {
  const [fromLocationId, setFromLocationId] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fromLevel = stockLevels.find(
    (sl) => sl.product_id === product.id && sl.location_id === fromLocationId
  );
  const availableQty = fromLevel?.quantity ?? 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromLocationId || !toLocationId || fromLocationId === toLocationId) return;
    if (quantity < 1 || quantity > availableQty) return;

    try {
      setSaving(true);
      setError('');
      await transferStock(product.id, fromLocationId, toLocationId, quantity, notes || undefined);
      onTransferred();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao transferir');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-xl bg-white dark:bg-gray-800 shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Transferir Estoque — {product.name}
          </h3>
          <button onClick={onClose}>
            <X className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
          </button>
        </div>

        {error && (
          <div className="mx-4 mt-4 rounded-lg bg-red-50 dark:bg-red-950 p-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Origem
            </label>
            <select
              value={fromLocationId}
              onChange={(e) => setFromLocationId(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
            >
              <option value="">Selecionar local...</option>
              {locations.map((loc) => {
                const level = stockLevels.find(
                  (sl) => sl.product_id === product.id && sl.location_id === loc.id
                );
                return (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} (disponível: {level?.quantity ?? 0})
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Destino
            </label>
            <select
              value={toLocationId}
              onChange={(e) => setToLocationId(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
            >
              <option value="">Selecionar local...</option>
              {locations
                .filter((loc) => loc.id !== fromLocationId)
                .map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Quantidade {fromLocationId && `(máx: ${availableQty})`}
            </label>
            <input
              type="number"
              min={1}
              max={availableQty}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              required
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Observação
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Opcional"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
            />
          </div>
        </form>

        <div className="flex justify-end gap-2 border-t border-gray-200 dark:border-gray-700 p-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancelar
          </button>
          <button
            onClick={(e) => {
              const form = (e.target as HTMLElement).closest('.rounded-xl')?.querySelector('form');
              form?.requestSubmit();
            }}
            disabled={saving || !fromLocationId || !toLocationId || fromLocationId === toLocationId || quantity < 1 || quantity > availableQty}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
            {saving ? 'Transferindo...' : 'Transferir'}
          </button>
        </div>
      </div>
    </div>
  );
}
