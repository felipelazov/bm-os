'use client';

import { useState, useEffect } from 'react';
import { Search, Loader2, Plus, Minus, Trash2, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getProducts } from '@/services/products/products.service';
import { formatCurrency } from '@/lib/formatters';
import type { Product } from '@/types/products.types';
import type { SaleItem } from '@/types/sales.types';

interface StepProductsProps {
  items: SaleItem[];
  onItemsChange: (items: SaleItem[]) => void;
}

export function StepProducts({ items, onItemsChange }: StepProductsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await getProducts(true);
        setProducts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar produtos');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredProducts = products.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  });

  const getItemQuantity = (productId: string) => {
    const item = items.find((i) => i.product_id === productId);
    return item?.quantity ?? 0;
  };

  const addProduct = (product: Product) => {
    const existing = items.find((i) => i.product_id === product.id);
    if (existing) {
      onItemsChange(
        items.map((i) =>
          i.product_id === product.id
            ? { ...i, quantity: i.quantity + 1, total_price: (i.quantity + 1) * i.unit_price }
            : i
        )
      );
    } else {
      const price = product.sale_price ?? product.cost_price ?? 0;
      onItemsChange([
        ...items,
        {
          product_id: product.id,
          product_name: product.name,
          quantity: 1,
          unit_price: price,
          total_price: price,
        },
      ]);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    onItemsChange(
      items
        .map((i) => {
          if (i.product_id !== productId) return i;
          const newQty = i.quantity + delta;
          if (newQty <= 0) return null;
          return { ...i, quantity: newQty, total_price: newQty * i.unit_price };
        })
        .filter(Boolean) as SaleItem[]
    );
  };

  const removeItem = (productId: string) => {
    onItemsChange(items.filter((i) => i.product_id !== productId));
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950 p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar produto por nome, SKU ou categoria..."
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 pl-10 pr-3 py-2.5 text-sm dark:text-gray-200"
        />
      </div>

      {/* Product List */}
      <div className="max-h-60 space-y-2 overflow-y-auto">
        {filteredProducts.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            Nenhum produto encontrado
          </p>
        ) : (
          filteredProducts.map((product) => {
            const qty = getItemQuantity(product.id);
            const price = product.sale_price ?? product.cost_price ?? 0;
            return (
              <button
                key={product.id}
                onClick={() => addProduct(product)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                  qty > 0
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 dark:border-blue-400'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                )}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                  <Package className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {product.name}
                    </span>
                    {qty > 0 && (
                      <span className="rounded-full bg-blue-100 dark:bg-blue-900 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300 shrink-0">
                        {qty}x
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span>SKU: {product.sku}</span>
                    <span>{product.category}</span>
                  </div>
                </div>
                <span className="text-sm font-medium text-green-600 dark:text-green-400 shrink-0">
                  {formatCurrency(price)}
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* Items Table */}
      {items.length === 0 ? (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Nenhum produto adicionado. Clique em um produto acima para adicionar.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Item</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Qtd</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Unitário</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Líquido</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500 dark:text-gray-400">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {items.map((item) => (
                <tr key={item.product_id}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {item.product_name}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.product_id, -1)}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center text-sm font-medium text-gray-900 dark:text-gray-100">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product_id, 1)}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-400">
                    {formatCurrency(item.unit_price)}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-green-600 dark:text-green-400">
                    {formatCurrency(item.total_price)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => removeItem(item.product_id)}
                      className="rounded p-1 text-gray-400 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <td colSpan={3} className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                  Subtotal:
                </td>
                <td className="px-4 py-3 text-right text-sm font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(items.reduce((sum, i) => sum + i.total_price, 0))}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
