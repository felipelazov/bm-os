'use client';

import { cn } from '@/lib/utils';
import type { ItemPriceStats } from '@/types/compras.types';

interface PriceTrendCardProps {
  stats: ItemPriceStats;
  onClick?: () => void;
}

const statusConfig = {
  abaixo: { emoji: '🟢', label: 'Abaixo da média', color: 'text-green-600 dark:text-green-400' },
  normal: { emoji: '🟡', label: 'Normal', color: 'text-yellow-600 dark:text-yellow-400' },
  acima: { emoji: '🔴', label: 'Acima da média', color: 'text-red-600 dark:text-red-400' },
};

function formatCurrency(value: number | null): string {
  if (value === null) return '—';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function PriceTrendCard({ stats, onClick }: PriceTrendCardProps) {
  const config = statusConfig[stats.status];

  return (
    <tr
      onClick={onClick}
      className={cn(
        'border-b border-gray-100 dark:border-gray-700',
        onClick && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700'
      )}
    >
      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
        {stats.item_name}
      </td>
      <td className="px-4 py-3">
        <span className="rounded bg-gray-100 dark:bg-gray-700 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-300">
          {stats.category}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
        {stats.brand || '—'}
      </td>
      <td className="px-4 py-3 text-sm tabular-nums text-gray-900 dark:text-gray-100">
        {formatCurrency(stats.last_price)}
      </td>
      <td className="px-4 py-3 text-sm tabular-nums text-gray-600 dark:text-gray-400">
        {formatCurrency(stats.avg_price_3m)}
      </td>
      <td className={cn('px-4 py-3 text-sm tabular-nums font-medium', config.color)}>
        {stats.variation_pct !== null ? `${stats.variation_pct > 0 ? '+' : ''}${stats.variation_pct}%` : '—'}
      </td>
      <td className="px-4 py-3 text-center text-sm">
        <span title={config.label}>{config.emoji}</span>
      </td>
    </tr>
  );
}
