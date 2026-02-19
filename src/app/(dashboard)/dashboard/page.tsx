'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import {
  RefreshCw,
  Calendar,
  Loader2,
  ShoppingBag,
  FileText,
  Truck,
  BarChart3,
  Upload,
  ArrowDownCircle,
  Warehouse,
  FileSpreadsheet,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getSalesReport,
  getQuotesReport,
  getLogisticsReport,
  getClientsReport,
  getFinancialReport,
  getStockReport,
} from '@/services/reports/reports.service';
import { DashboardKpis } from '@/components/dashboard/dashboard-kpis';
import { DashboardCharts } from '@/components/dashboard/dashboard-charts';
import { DashboardAlerts } from '@/components/dashboard/dashboard-alerts';
import type {
  DatePreset,
  DateRange,
  SalesReportData,
  QuotesReportData,
  LogisticsReportData,
  ClientsReportData,
  FinancialReportData,
  StockReportData,
} from '@/types/reports.types';

// ============================================
// Helpers de data (igual relatorios)
// ============================================

function getDateRange(preset: DatePreset, custom?: DateRange): DateRange {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().substring(0, 10);

  switch (preset) {
    case 'hoje':
      return { startDate: fmt(today), endDate: fmt(today) };
    case '7dias': {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      return { startDate: fmt(start), endDate: fmt(today) };
    }
    case '30dias': {
      const start = new Date(today);
      start.setDate(start.getDate() - 29);
      return { startDate: fmt(start), endDate: fmt(today) };
    }
    case 'este_mes': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { startDate: fmt(start), endDate: fmt(today) };
    }
    case 'personalizado':
      return custom ?? { startDate: fmt(today), endDate: fmt(today) };
  }
}

// ============================================
// Presets
// ============================================

const PRESETS: { key: DatePreset; label: string }[] = [
  { key: 'hoje', label: 'Hoje' },
  { key: '7dias', label: '7 dias' },
  { key: '30dias', label: '30 dias' },
  { key: 'este_mes', label: 'Este mês' },
  { key: 'personalizado', label: 'Personalizado' },
];

// ============================================
// Ações rápidas
// ============================================

const QUICK_ACTIONS = [
  { label: 'Nova Venda', icon: ShoppingBag, href: '/vendas', color: 'text-blue-600 dark:text-blue-400' },
  { label: 'Novo Orçamento', icon: FileText, href: '/orcamentos', color: 'text-purple-600 dark:text-purple-400' },
  { label: 'Logística', icon: Truck, href: '/logistica', color: 'text-orange-600 dark:text-orange-400' },
  { label: 'Relatórios', icon: BarChart3, href: '/relatorios', color: 'text-cyan-600 dark:text-cyan-400' },
  { label: 'Importar Extrato', icon: Upload, href: '/financeiro/importar', color: 'text-green-600 dark:text-green-400' },
  { label: 'Contas a Pagar', icon: ArrowDownCircle, href: '/financeiro/contas-pagar', color: 'text-red-600 dark:text-red-400' },
  { label: 'Estoque', icon: Warehouse, href: '/produtos/estoque', color: 'text-yellow-600 dark:text-yellow-400' },
  { label: 'Período DRE', icon: FileSpreadsheet, href: '/dre', color: 'text-indigo-600 dark:text-indigo-400' },
];

// ============================================
// Tipos
// ============================================

interface DashboardData {
  sales: SalesReportData | null;
  quotes: QuotesReportData | null;
  logistics: LogisticsReportData | null;
  clients: ClientsReportData | null;
  financial: FinancialReportData | null;
  stock: StockReportData | null;
}

const EMPTY_DATA: DashboardData = {
  sales: null,
  quotes: null,
  logistics: null,
  clients: null,
  financial: null,
  stock: null,
};

// ============================================
// Skeleton
// ============================================

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* KPIs skeleton */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800" />
        ))}
      </div>
      {/* Charts skeleton */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-72 rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800" />
        <div className="h-72 rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800" />
      </div>
    </div>
  );
}

// ============================================
// Página
// ============================================

export default function DashboardPage() {
  const [activePreset, setActivePreset] = useState<DatePreset>('30dias');
  const [customRange, setCustomRange] = useState<DateRange>(() => {
    const today = new Date();
    return {
      startDate: today.toISOString().substring(0, 10),
      endDate: today.toISOString().substring(0, 10),
    };
  });
  const [data, setData] = useState<DashboardData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [failedModules, setFailedModules] = useState<string[]>([]);

  const fetchAll = useCallback(async (range: DateRange, isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setFailedModules([]);

    const labels = ['Vendas', 'Orçamentos', 'Logística', 'Clientes', 'Financeiro', 'Estoque'];

    const results = await Promise.allSettled([
      getSalesReport(range),
      getQuotesReport(range),
      getLogisticsReport(range),
      getClientsReport(range),
      getFinancialReport(range),
      getStockReport(range),
    ]);

    const failed: string[] = [];
    const newData: DashboardData = { ...EMPTY_DATA };

    if (results[0].status === 'fulfilled') newData.sales = results[0].value;
    else failed.push(labels[0]);

    if (results[1].status === 'fulfilled') newData.quotes = results[1].value;
    else failed.push(labels[1]);

    if (results[2].status === 'fulfilled') newData.logistics = results[2].value;
    else failed.push(labels[2]);

    if (results[3].status === 'fulfilled') newData.clients = results[3].value;
    else failed.push(labels[3]);

    if (results[4].status === 'fulfilled') newData.financial = results[4].value;
    else failed.push(labels[4]);

    if (results[5].status === 'fulfilled') newData.stock = results[5].value;
    else failed.push(labels[5]);

    setData(newData);
    setFailedModules(failed);
    setLoading(false);
    setRefreshing(false);
  }, []);

  // Carregamento inicial
  useEffect(() => {
    const range = getDateRange('30dias');
    fetchAll(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePresetChange = (preset: DatePreset) => {
    setActivePreset(preset);
    if (preset !== 'personalizado') {
      const range = getDateRange(preset);
      fetchAll(range);
    }
  };

  const handleCustomDateChange = (field: 'startDate' | 'endDate', value: string) => {
    const newRange = { ...customRange, [field]: value };
    setCustomRange(newRange);
    if (newRange.startDate && newRange.endDate && newRange.startDate <= newRange.endDate) {
      fetchAll(newRange);
    }
  };

  const handleRefresh = () => {
    const range = getDateRange(activePreset, customRange);
    fetchAll(range, true);
  };

  const allFailed = failedModules.length === 6;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400">Visão geral do seu negócio</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading || refreshing}
          className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
          Atualizar
        </button>
      </div>

      {/* Filtro de data */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <Calendar className="h-5 w-5 text-gray-400" />
        <div className="flex flex-wrap items-center gap-1">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              onClick={() => handlePresetChange(p.key)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                activePreset === p.key
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        {activePreset === 'personalizado' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customRange.startDate}
              onChange={(e) => handleCustomDateChange('startDate', e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
            <span className="text-sm text-gray-400">até</span>
            <input
              type="date"
              value={customRange.endDate}
              onChange={(e) => handleCustomDateChange('endDate', e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>
        )}
      </div>

      {/* Banner de falhas parciais */}
      {failedModules.length > 0 && !allFailed && (
        <div className="flex items-center gap-2 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Alguns módulos falharam ao carregar: {failedModules.join(', ')}</span>
        </div>
      )}

      {/* Banner de erro total */}
      {allFailed && !loading && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Erro ao carregar dados do dashboard. Tente novamente.</span>
        </div>
      )}

      {/* Conteúdo */}
      {loading ? (
        <DashboardSkeleton />
      ) : (
        <div className={cn('space-y-6', refreshing && 'opacity-60 pointer-events-none')}>
          <DashboardKpis data={data} />
          <DashboardAlerts data={data} />
          <DashboardCharts data={data} />

          {/* Ações Rápidas */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Ações Rápidas</h3>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 transition-colors hover:border-blue-300 hover:bg-blue-50 dark:border-gray-700 dark:hover:border-blue-600 dark:hover:bg-blue-950"
                  >
                    <Icon className={cn('h-5 w-5 shrink-0', action.color)} />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{action.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Toast de refresh */}
      {refreshing && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-3 text-sm text-white shadow-lg dark:bg-gray-100 dark:text-gray-900">
          <Loader2 className="h-4 w-4 animate-spin" />
          Atualizando...
        </div>
      )}
    </div>
  );
}
