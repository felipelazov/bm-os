'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PurchaseItem } from '@/types/compras.types';
import { getItems } from '@/services/compras/items.service';
import { getSupplierItems, bulkLinkItems } from '@/services/compras/suppliers.service';

interface SupplierItemLinkProps {
  supplierId: string;
  supplierName: string;
  onClose: () => void;
  onSaved: () => void;
}

export function SupplierItemLink({ supplierId, supplierName, onClose, onSaved }: SupplierItemLinkProps) {
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [allItems, linked] = await Promise.all([
          getItems({ activeOnly: true }),
          getSupplierItems(supplierId),
        ]);
        setItems(allItems);
        setSelectedIds(new Set(linked.map((l) => l.item_id)));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [supplierId]);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      await bulkLinkItems(supplierId, Array.from(selectedIds));
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  // Agrupar por categoria
  const grouped = items.reduce<Record<string, PurchaseItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-lg rounded-xl bg-white dark:bg-gray-800 shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Vincular Itens — {supplierName}
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

        <div className="max-h-96 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              Nenhum item cadastrado. Importe o catálogo padrão primeiro.
            </p>
          ) : (
            Object.entries(grouped).map(([category, catItems]) => (
              <div key={category} className="mb-4">
                <h4 className="mb-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                  {category}
                </h4>
                <div className="space-y-1">
                  {catItems.map((item) => (
                    <label
                      key={item.id}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                        selectedIds.has(item.id)
                          ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(item.id)}
                        onChange={() => toggle(item.id)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600"
                      />
                      <span>{item.name}</span>
                      <span className="text-xs text-gray-400">({item.unit})</span>
                    </label>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 p-4">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {selectedIds.size} item(ns) selecionado(s)
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
