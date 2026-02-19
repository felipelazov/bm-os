'use client';

import { cn } from '@/lib/utils';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface DreSummaryCardProps {
  title: string;
  value: number;
  percentage?: number;
  previousValue?: number;
  isCurrency?: boolean;
  className?: string;
}

export function DreSummaryCard({
  title,
  value,
  percentage,
  previousValue,
  isCurrency = true,
  className,
}: DreSummaryCardProps) {
  const change = previousValue != null ? ((value - previousValue) / Math.abs(previousValue || 1)) * 100 : null;
  const isPositive = change != null && change > 0;
  const isNegative = change != null && change < 0;

  return (
    <div className={cn('rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800', className)}>
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
      <p className={cn(
        'mt-1 text-2xl font-bold',
        value >= 0 ? 'text-gray-900 dark:text-gray-100' : 'text-red-600'
      )}>
        {isCurrency ? formatCurrency(value) : formatPercent(value)}
      </p>
      {percentage != null && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {formatPercent(percentage)} da receita
        </p>
      )}
      {change != null && (
        <div className={cn(
          'mt-2 flex items-center gap-1 text-sm font-medium',
          isPositive && 'text-green-600',
          isNegative && 'text-red-600',
          !isPositive && !isNegative && 'text-gray-400 dark:text-gray-500'
        )}>
          {isPositive && <TrendingUp className="h-4 w-4" />}
          {isNegative && <TrendingDown className="h-4 w-4" />}
          {!isPositive && !isNegative && <Minus className="h-4 w-4" />}
          {change > 0 ? '+' : ''}{change.toFixed(1)}% vs anterior
        </div>
      )}
    </div>
  );
}
