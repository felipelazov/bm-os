'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { getTransactions, calculateCashFlow } from '@/services/financial/financial.service';
import type { CashFlowSummary } from '@/types/financial.types';
import { Loader2 } from 'lucide-react';

function FlowTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800">
      <p className="mb-2 text-sm font-medium text-gray-900 dark:text-gray-100">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
    </div>
  );
}

export default function FluxoCaixaPage() {
  const [cashFlow, setCashFlow] = useState<CashFlowSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const transactions = await getTransactions();
        const flow = calculateCashFlow(transactions);
        setCashFlow(flow);
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar fluxo de caixa');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!cashFlow || cashFlow.periods.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Fluxo de Caixa</h1>
            <p className="text-gray-500 dark:text-gray-400">Visão consolidada de entradas e saídas</p>
          </div>
        </div>
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">{error}</div>
        )}
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 py-12 dark:border-gray-600">
          <p className="text-lg font-medium text-gray-500 dark:text-gray-400">Nenhuma transação registrada</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">Adicione transações ou importe extratos para ver o fluxo de caixa</p>
        </div>
      </div>
    );
  }

  // Prepara dados para o gráfico
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const chartData = cashFlow.periods.map((p) => {
    const [year, month] = p.period.split('-');
    return {
      period: `${monthNames[parseInt(month) - 1]}/${year.slice(2)}`,
      income: p.total_income,
      expense: p.total_expense,
      net: p.net_flow,
      balance: p.cumulative_balance,
    };
  });

  const current = chartData[chartData.length - 1];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Fluxo de Caixa</h1>
          <p className="text-gray-500 dark:text-gray-400">Visão consolidada de entradas e saídas</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">{error}</div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Saldo Atual</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(current.balance)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Entradas</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{formatCurrency(cashFlow.total_income)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Saídas</p>
          <p className="mt-1 text-2xl font-bold text-red-600">{formatCurrency(cashFlow.total_expense)}</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400">Fluxo Líquido</p>
          <p className={cn(
            'mt-1 text-2xl font-bold',
            cashFlow.net_total >= 0 ? 'text-blue-600' : 'text-red-600'
          )}>
            {formatCurrency(cashFlow.net_total)}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Entradas vs Saídas</h3>
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={chartData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="period" tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <YAxis
              tick={{ fontSize: 12 }}
              stroke="#9ca3af"
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<FlowTooltip />} />
            <Legend />
            <ReferenceLine y={0} stroke="#e5e7eb" />
            <Bar dataKey="income" name="Entradas" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" name="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Período</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-green-700 dark:text-green-400">Entradas</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-red-700 dark:text-red-400">Saídas</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-blue-700 dark:text-blue-400">Fluxo Líquido</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">Saldo Acumulado</th>
            </tr>
          </thead>
          <tbody>
            {chartData.map((p) => (
              <tr key={p.period} className="border-b border-gray-100 dark:border-gray-700">
                <td className="px-6 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">{p.period}</td>
                <td className="px-6 py-3 text-right text-sm tabular-nums text-green-600">{formatCurrency(p.income)}</td>
                <td className="px-6 py-3 text-right text-sm tabular-nums text-red-600">{formatCurrency(p.expense)}</td>
                <td className={cn('px-6 py-3 text-right text-sm font-medium tabular-nums', p.net >= 0 ? 'text-blue-600' : 'text-red-600')}>
                  {formatCurrency(p.net)}
                </td>
                <td className="px-6 py-3 text-right text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">{formatCurrency(p.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
