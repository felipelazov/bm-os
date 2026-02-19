'use client';

import { ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/lib/formatters';
import { BarChart2 } from 'lucide-react';

// ============================================
// Paleta de cores para PieCharts
// ============================================

export const CHART_COLORS = [
  '#2563eb', // blue-600
  '#16a34a', // green-600
  '#ea580c', // orange-600
  '#9333ea', // purple-600
  '#dc2626', // red-600
  '#0891b2', // cyan-600
  '#ca8a04', // yellow-600
  '#64748b', // slate-500
];

// ============================================
// Tooltip customizado
// ============================================

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
  format?: 'currency' | 'number';
}

export function ChartTooltip({ active, payload, label, format = 'number' }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const formatValue = (v: number) =>
    format === 'currency' ? formatCurrency(v) : v.toLocaleString('pt-BR');

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800">
      {label && (
        <p className="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">{label}</p>
      )}
      {payload.map((entry) => (
        <p key={entry.name} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {formatValue(entry.value)}
        </p>
      ))}
    </div>
  );
}

// ============================================
// Container de grafico reutilizavel
// ============================================

interface ReportChartContainerProps {
  title: string;
  children: React.ReactNode;
  height?: number;
  isEmpty?: boolean;
}

export function ReportChartContainer({ title, children, height = 320, isEmpty }: ReportChartContainerProps) {
  if (isEmpty) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        <div className="flex items-center justify-center" style={{ height }}>
          <div className="text-center">
            <BarChart2 className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
            <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">Sem dados para exibir</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  );
}
