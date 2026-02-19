'use client';

import { useState, useEffect } from 'react';
import { Truck, Building2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStockLocations } from '@/services/products/stock.service';
import { formatCurrency } from '@/lib/formatters';
import type { StockLocation } from '@/types/products.types';
import type { DeliveryType } from '@/types/sales.types';

interface StepDeliveryProps {
  deliveryType: DeliveryType;
  deliveryLocationId: string | null;
  freightEnabled: boolean;
  freightAmount: number;
  onDeliveryTypeChange: (type: DeliveryType) => void;
  onLocationChange: (id: string) => void;
  onFreightEnabledChange: (enabled: boolean) => void;
  onFreightAmountChange: (amount: number) => void;
}

export function StepDelivery({
  deliveryType,
  deliveryLocationId,
  freightEnabled,
  freightAmount,
  onDeliveryTypeChange,
  onLocationChange,
  onFreightEnabledChange,
  onFreightAmountChange,
}: StepDeliveryProps) {
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await getStockLocations(true);
        setLocations(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar locais');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950 p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <div>
        <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
          Tipo de Entrega
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          {/* Entrega Card */}
          <button
            onClick={() => onDeliveryTypeChange('entrega')}
            className={cn(
              'flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-colors',
              deliveryType === 'entrega'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 dark:border-blue-400'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
            )}
          >
            <div className={cn(
              'flex h-12 w-12 items-center justify-center rounded-lg',
              deliveryType === 'entrega'
                ? 'bg-blue-100 dark:bg-blue-900'
                : 'bg-gray-100 dark:bg-gray-700'
            )}>
              <Truck className={cn(
                'h-6 w-6',
                deliveryType === 'entrega'
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400'
              )} />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">Entrega</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Envio para o endereço do cliente</p>
            </div>
          </button>

          {/* Retirada Cards (Stock Locations) */}
          {locations.map((location) => (
            <button
              key={location.id}
              onClick={() => {
                onDeliveryTypeChange('retirada');
                onLocationChange(location.id);
              }}
              className={cn(
                'flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-colors',
                deliveryType === 'retirada' && deliveryLocationId === location.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 dark:border-blue-400'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
              )}
            >
              <div className={cn(
                'flex h-12 w-12 items-center justify-center rounded-lg',
                deliveryType === 'retirada' && deliveryLocationId === location.id
                  ? 'bg-blue-100 dark:bg-blue-900'
                  : 'bg-gray-100 dark:bg-gray-700'
              )}>
                <Building2 className={cn(
                  'h-6 w-6',
                  deliveryType === 'retirada' && deliveryLocationId === location.id
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400'
                )} />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">{location.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Retirada no local</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Freight Card */}
      {deliveryType === 'entrega' && (
        <div className="rounded-xl bg-gray-900 dark:bg-gray-950 p-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Calculo de Frete</h4>
              <p className="text-sm text-gray-400">Adicionar valor de frete ao pedido</p>
            </div>
            <button
              onClick={() => onFreightEnabledChange(!freightEnabled)}
              className={cn(
                'relative h-6 w-11 rounded-full transition-colors',
                freightEnabled ? 'bg-blue-600' : 'bg-gray-600'
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform',
                  freightEnabled && 'translate-x-5'
                )}
              />
            </button>
          </div>
          {freightEnabled && (
            <div className="mt-4">
              <label className="block text-sm text-gray-400">Valor do Frete</label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={freightAmount || ''}
                  onChange={(e) => onFreightAmountChange(parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                  className="w-full rounded-lg border border-gray-600 bg-gray-800 pl-10 pr-3 py-2 text-sm text-white"
                />
              </div>
              {freightAmount > 0 && (
                <p className="mt-2 text-sm text-green-400">
                  Frete: {formatCurrency(freightAmount)}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
