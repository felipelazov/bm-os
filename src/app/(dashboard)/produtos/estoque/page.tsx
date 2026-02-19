'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  Search,
  ArrowRightLeft,
  History,
  MapPin,
  Package,
  AlertTriangle,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getProducts } from '@/services/products/products.service';
import {
  getStockLocations,
  getStockLevels,
} from '@/services/products/stock.service';
import { StockTransferModal } from '@/components/products/stock-transfer-modal';
import { StockMovementsModal } from '@/components/products/stock-movements-modal';
import { StockLocationsManager } from '@/components/products/stock-locations-manager';
import { StockAdjustModal } from '@/components/products/stock-adjust-modal';
import type { Product, StockLocation, StockLevel } from '@/types/products.types';

export default function EstoquePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  const [transferProduct, setTransferProduct] = useState<Product | null>(null);
  const [showMovements, setShowMovements] = useState(false);
  const [showLocations, setShowLocations] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<{ product: Product; location: StockLocation; quantity: number } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [prods, locs, levels] = await Promise.all([
        getProducts(true),
        getStockLocations(true),
        getStockLevels(),
      ]);
      setProducts(prods);
      setLocations(locs);
      setStockLevels(levels);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar estoque');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getQuantity = (productId: string, locationId: string): number => {
    return stockLevels.find((sl) => sl.product_id === productId && sl.location_id === locationId)?.quantity ?? 0;
  };

  const getTotalQuantity = (productId: string): number => {
    return stockLevels
      .filter((sl) => sl.product_id === productId)
      .reduce((sum, sl) => sum + sl.quantity, 0);
  };

  const filtered = products.filter((p) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!p.name.toLowerCase().includes(term) && !p.sku.toLowerCase().includes(term)) return false;
    }
    if (onlyLowStock) {
      const total = getTotalQuantity(p.id);
      if (total >= p.min_stock) return false;
    }
    return true;
  });

  // Summary cards
  const totalSkus = products.length;
  const criticalItems = products.filter((p) => getTotalQuantity(p.id) < p.min_stock).length;
  const estimatedValue = products.reduce((sum, p) => {
    const total = getTotalQuantity(p.id);
    return sum + total * (p.cost_price ?? 0);
  }, 0);

  if (loading && products.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Gestão de Estoque</h1>
          <p className="text-gray-500 dark:text-gray-400">Controle de estoque multilocalização</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMovements(true)}
            className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <History className="h-4 w-4" />
            Movimentações
          </button>
          <button
            onClick={() => setShowLocations(true)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <MapPin className="h-4 w-4" />
            Locais
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950 p-3 text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 dark:bg-blue-900 p-2">
              <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total de SKUs</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalSkus}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-100 dark:bg-red-900 p-2">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Estoque Crítico</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{criticalItems}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 dark:bg-green-900 p-2">
              <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Valor Estimado</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                R$ {estimatedValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por produto ou SKU..."
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 pl-10 pr-3 py-2 text-sm dark:text-gray-200"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
          <input
            type="checkbox"
            checked={onlyLowStock}
            onChange={(e) => setOnlyLowStock(e.target.checked)}
            className="rounded border-gray-300 dark:border-gray-600"
          />
          Apenas baixo estoque
        </label>
      </div>

      {/* Stock Table */}
      {locations.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-12 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Cadastre locais de estoque para começar.
          </p>
          <button
            onClick={() => setShowLocations(true)}
            className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Gerenciar Locais
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-12 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum produto encontrado.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Produto / Categoria</th>
                <th className="px-4 py-3 text-center font-medium text-gray-700 dark:text-gray-300">Mínimo</th>
                {locations.map((loc) => (
                  <th key={loc.id} className="px-4 py-3 text-center font-medium text-gray-700 dark:text-gray-300">
                    {loc.name}
                  </th>
                ))}
                <th className="px-4 py-3 text-center font-medium text-gray-700 dark:text-gray-300">Total</th>
                <th className="px-4 py-3 text-center font-medium text-gray-700 dark:text-gray-300">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => {
                const total = getTotalQuantity(product.id);
                const isCritical = total < product.min_stock;
                return (
                  <tr
                    key={product.id}
                    className={cn(
                      'border-b border-gray-100 dark:border-gray-700 last:border-0',
                      isCritical && 'bg-red-50/50 dark:bg-red-950/30'
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-gray-100">{product.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{product.category} · {product.sku}</div>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-400">
                      {product.min_stock}
                    </td>
                    {locations.map((loc) => {
                      const qty = getQuantity(product.id, loc.id);
                      return (
                        <td key={loc.id} className="px-4 py-3 text-center">
                          <button
                            onClick={() => setAdjustTarget({ product, location: loc, quantity: qty })}
                            title={`Ajustar estoque em ${loc.name}`}
                            className={cn(
                              'font-medium rounded px-2 py-0.5 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer',
                              qty === 0
                                ? 'text-red-600 dark:text-red-400'
                                : qty < product.min_stock
                                  ? 'text-yellow-600 dark:text-yellow-400'
                                  : 'text-gray-700 dark:text-gray-300'
                            )}
                          >
                            {qty}
                          </button>
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 text-center">
                      <span
                        className={cn(
                          'font-bold',
                          isCritical ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'
                        )}
                      >
                        {total}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setTransferProduct(product)}
                        title="Transferir"
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-600"
                      >
                        <ArrowRightLeft className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {transferProduct && (
        <StockTransferModal
          product={transferProduct}
          locations={locations}
          stockLevels={stockLevels}
          onClose={() => setTransferProduct(null)}
          onTransferred={fetchData}
        />
      )}

      {showMovements && (
        <StockMovementsModal
          onClose={() => setShowMovements(false)}
        />
      )}

      {showLocations && (
        <StockLocationsManager
          onClose={() => setShowLocations(false)}
          onChanged={fetchData}
        />
      )}

      {adjustTarget && (
        <StockAdjustModal
          product={adjustTarget.product}
          location={adjustTarget.location}
          currentQuantity={adjustTarget.quantity}
          onClose={() => setAdjustTarget(null)}
          onAdjusted={fetchData}
        />
      )}
    </div>
  );
}
