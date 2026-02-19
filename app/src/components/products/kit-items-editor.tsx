'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Product } from '@/types/products.types';

interface KitItem {
  item_product_id: string;
  quantity: number;
}

interface KitItemsEditorProps {
  items: KitItem[];
  onChange: (items: KitItem[]) => void;
  availableProducts: Product[];
}

export function KitItemsEditor({ items, onChange, availableProducts }: KitItemsEditorProps) {
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  const handleAdd = () => {
    if (!selectedProductId || selectedQuantity < 1) return;
    if (items.some((i) => i.item_product_id === selectedProductId)) return;

    onChange([...items, { item_product_id: selectedProductId, quantity: selectedQuantity }]);
    setSelectedProductId('');
    setSelectedQuantity(1);
  };

  const handleRemove = (productId: string) => {
    onChange(items.filter((i) => i.item_product_id !== productId));
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    onChange(items.map((i) => (i.item_product_id === productId ? { ...i, quantity } : i)));
  };

  const getProductName = (id: string) => availableProducts.find((p) => p.id === id)?.name ?? id;

  const usedIds = new Set(items.map((i) => i.item_product_id));
  const filteredProducts = availableProducts.filter(
    (p) => p.product_type === 'avulso' && p.is_active && !usedIds.has(p.id)
  );

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Itens do Kit
      </label>

      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.item_product_id}
              className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2"
            >
              <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                {getProductName(item.item_product_id)}
              </span>
              <input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) => handleQuantityChange(item.item_product_id, parseInt(e.target.value) || 1)}
                className="w-20 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1 text-sm text-center dark:text-gray-200"
              />
              <button
                type="button"
                onClick={() => handleRemove(item.item_product_id)}
                className="rounded p-1 text-gray-400 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="flex-1">
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
          >
            <option value="">Selecionar produto avulso...</option>
            {filteredProducts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>
        </div>
        <input
          type="number"
          min={1}
          value={selectedQuantity}
          onChange={(e) => setSelectedQuantity(parseInt(e.target.value) || 1)}
          className="w-20 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-2 text-sm text-center dark:text-gray-200"
          placeholder="Qtd"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!selectedProductId}
          className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Adicionar
        </button>
      </div>

      {items.length === 0 && (
        <p className="text-xs text-gray-400">Nenhum item adicionado ao kit.</p>
      )}
    </div>
  );
}
