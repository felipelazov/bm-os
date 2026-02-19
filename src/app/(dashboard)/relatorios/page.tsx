'use client';

import { useState, useCallback, useRef } from 'react';
import {
  Loader2,
  ShoppingBag,
  FileText,
  Truck,
  Users,
  Wallet,
  Package,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';
import {
  getSalesReport,
  getQuotesReport,
  getLogisticsReport,
  getClientsReport,
  getFinancialReport,
  getStockReport,
} from '@/services/reports/reports.service';
import { SalesTab, QuotesTab, LogisticsTab, ClientsTab, FinancialTab, StockTab } from '@/components/reports/report-tabs';
import type {
  ReportTab,
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
// Helpers de data
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
// Config de abas
// ============================================

const TABS: { key: ReportTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: 'vendas', label: 'Vendas', icon: ShoppingBag },
  { key: 'orcamentos', label: 'Orçamentos', icon: FileText },
  { key: 'logistica', label: 'Logística', icon: Truck },
  { key: 'clientes', label: 'Clientes', icon: Users },
  { key: 'financeiro', label: 'Financeiro', icon: Wallet },
  { key: 'estoque', label: 'Estoque', icon: Package },
];

const PRESETS: { key: DatePreset; label: string }[] = [
  { key: 'hoje', label: 'Hoje' },
  { key: '7dias', label: '7 dias' },
  { key: '30dias', label: '30 dias' },
  { key: 'este_mes', label: 'Este mês' },
  { key: 'personalizado', label: 'Personalizado' },
];

// ============================================
// Pagina
// ============================================

type TabData = {
  vendas: SalesReportData | null;
  orcamentos: QuotesReportData | null;
  logistica: LogisticsReportData | null;
  clientes: ClientsReportData | null;
  financeiro: FinancialReportData | null;
  estoque: StockReportData | null;
};

export default function RelatoriosPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('vendas');
  const [activePreset, setActivePreset] = useState<DatePreset>('30dias');
  const [customRange, setCustomRange] = useState<DateRange>(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 29);
    return {
      startDate: start.toISOString().substring(0, 10),
      endDate: today.toISOString().substring(0, 10),
    };
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tabData, setTabData] = useState<TabData>({
    vendas: null,
    orcamentos: null,
    logistica: null,
    clientes: null,
    financeiro: null,
    estoque: null,
  });

  const loadedRef = useRef<Set<string>>(new Set());

  const fetchTabData = useCallback(async (tab: ReportTab, range: DateRange, force = false) => {
    const cacheKey = `${tab}-${range.startDate}-${range.endDate}`;
    if (!force && loadedRef.current.has(cacheKey)) return;

    setLoading(true);
    setError('');
    try {
      let data: SalesReportData | QuotesReportData | LogisticsReportData | ClientsReportData | FinancialReportData | StockReportData;
      switch (tab) {
        case 'vendas': data = await getSalesReport(range); break;
        case 'orcamentos': data = await getQuotesReport(range); break;
        case 'logistica': data = await getLogisticsReport(range); break;
        case 'clientes': data = await getClientsReport(range); break;
        case 'financeiro': data = await getFinancialReport(range); break;
        case 'estoque': data = await getStockReport(range); break;
      }
      setTabData((prev) => ({ ...prev, [tab]: data }));
      loadedRef.current.add(cacheKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar relatório');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleTabChange = (tab: ReportTab) => {
    setActiveTab(tab);
    const range = getDateRange(activePreset, customRange);
    fetchTabData(tab, range);
  };

  const handlePresetChange = (preset: DatePreset) => {
    setActivePreset(preset);
    loadedRef.current.clear();
    setTabData({ vendas: null, orcamentos: null, logistica: null, clientes: null, financeiro: null, estoque: null });
    if (preset !== 'personalizado') {
      const range = getDateRange(preset);
      fetchTabData(activeTab, range, true);
    }
  };

  const handleCustomDateChange = (field: 'startDate' | 'endDate', value: string) => {
    const newRange = { ...customRange, [field]: value };
    setCustomRange(newRange);
    if (newRange.startDate && newRange.endDate && newRange.startDate <= newRange.endDate) {
      loadedRef.current.clear();
      setTabData({ vendas: null, orcamentos: null, logistica: null, clientes: null, financeiro: null, estoque: null });
      fetchTabData(activeTab, newRange, true);
    }
  };

  // Carregar dados iniciais
  const initialLoadRef = useRef(false);
  if (!initialLoadRef.current) {
    initialLoadRef.current = true;
    const range = getDateRange('30dias');
    fetchTabData('vendas', range);
  }

  const currentData = tabData[activeTab];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Relatórios</h1>
          <p className="text-gray-500 dark:text-gray-400">Análise de desempenho por módulo</p>
        </div>
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

      {/* Abas */}
      <div className="overflow-x-auto">
        <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors',
                  activeTab === tab.key
                    ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-gray-100'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Erro */}
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Conteudo */}
      {loading && !currentData ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : currentData ? (
        <>
          {activeTab === 'vendas' && <SalesTab data={currentData as SalesReportData} />}
          {activeTab === 'orcamentos' && <QuotesTab data={currentData as QuotesReportData} />}
          {activeTab === 'logistica' && <LogisticsTab data={currentData as LogisticsReportData} />}
          {activeTab === 'clientes' && <ClientsTab data={currentData as ClientsReportData} />}
          {activeTab === 'financeiro' && <FinancialTab data={currentData as FinancialReportData} />}
          {activeTab === 'estoque' && <StockTab data={currentData as StockReportData} />}
        </>
      ) : (
        <EmptyState
          icon={FileText}
          title="Nenhum dado disponível"
          description="Selecione um período e clique em carregar para visualizar os relatórios."
        />
      )}
    </div>
  );
}
