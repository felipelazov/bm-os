'use client';

import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  FileText,
  Truck,
  Wallet,
  AlertTriangle,
  UserPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import type {
  SalesReportData,
  QuotesReportData,
  LogisticsReportData,
  ClientsReportData,
  FinancialReportData,
  StockReportData,
} from '@/types/reports.types';

interface DashboardData {
  sales: SalesReportData | null;
  quotes: QuotesReportData | null;
  logistics: LogisticsReportData | null;
  clients: ClientsReportData | null;
  financial: FinancialReportData | null;
  stock: StockReportData | null;
}

interface DashboardKpisProps {
  data: DashboardData;
}

interface KpiCardProps {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  label: string;
  value: string;
  subtitle: string;
  subtitleColor?: string;
}

const COLOR_MAP: Record<string, { bg: string; text: string }> = {
  green: { bg: 'bg-green-100 dark:bg-green-900/40', text: 'text-green-600 dark:text-green-400' },
  blue: { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-600 dark:text-blue-400' },
  cyan: { bg: 'bg-cyan-100 dark:bg-cyan-900/40', text: 'text-cyan-600 dark:text-cyan-400' },
  yellow: { bg: 'bg-yellow-100 dark:bg-yellow-900/40', text: 'text-yellow-600 dark:text-yellow-400' },
  orange: { bg: 'bg-orange-100 dark:bg-orange-900/40', text: 'text-orange-600 dark:text-orange-400' },
  purple: { bg: 'bg-purple-100 dark:bg-purple-900/40', text: 'text-purple-600 dark:text-purple-400' },
  red: { bg: 'bg-red-100 dark:bg-red-900/40', text: 'text-red-600 dark:text-red-400' },
  teal: { bg: 'bg-teal-100 dark:bg-teal-900/40', text: 'text-teal-600 dark:text-teal-400' },
};

function KpiCard({ icon: Icon, color, label, value, subtitle, subtitleColor }: KpiCardProps) {
  const colors = COLOR_MAP[color] ?? COLOR_MAP.blue;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-3">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-full', colors.bg)}>
          <Icon className={cn('h-5 w-5', colors.text)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
          <p className={cn('text-xs', subtitleColor ?? 'text-gray-400 dark:text-gray-500')}>
            {subtitle}
          </p>
        </div>
      </div>
    </div>
  );
}

function formatValue(value: number | null | undefined, type: 'currency' | 'number'): string {
  if (value == null) return '--';
  return type === 'currency' ? formatCurrency(value) : value.toLocaleString('pt-BR');
}

export function DashboardKpis({ data }: DashboardKpisProps) {
  const { sales, quotes, logistics, clients, financial, stock } = data;

  const pendingDeliveries = logistics
    ? logistics.totalDeliveries - logistics.completedDeliveries
    : null;

  const pendingQuotes = quotes
    ? quotes.funnelByStatus.find((f) => f.label === 'Pendente')?.value ?? 0
    : null;

  // Acionáveis primeiro, depois informativos
  const kpis: KpiCardProps[] = [
    {
      icon: DollarSign,
      color: 'green',
      label: 'Faturamento',
      value: formatValue(sales?.totalRevenue, 'currency'),
      subtitle: sales ? `${sales.paidPercent.toFixed(0)}% já pagas` : '--',
    },
    {
      icon: Wallet,
      color: 'purple',
      label: 'Saldo Financeiro',
      value: formatValue(financial?.balance, 'currency'),
      subtitle: financial ? `${formatCurrency(financial.overdue)} vencidos` : '--',
      subtitleColor: financial && financial.overdue > 0 ? 'text-red-500 dark:text-red-400' : undefined,
    },
    {
      icon: AlertTriangle,
      color: 'red',
      label: 'Estoque Crítico',
      value: formatValue(stock?.criticalStock, 'number'),
      subtitle: stock ? `${stock.totalSKUs} SKUs total` : '--',
    },
    {
      icon: Truck,
      color: 'orange',
      label: 'Entregas Pendentes',
      value: formatValue(pendingDeliveries, 'number'),
      subtitle: logistics ? `${logistics.completedDeliveries} concluídas` : '--',
    },
    {
      icon: ShoppingBag,
      color: 'blue',
      label: 'Vendas',
      value: formatValue(sales?.totalSales, 'number'),
      subtitle: sales ? `Ticket ${formatCurrency(sales.averageTicket)}` : '--',
    },
    {
      icon: TrendingUp,
      color: 'cyan',
      label: 'Ticket Médio',
      value: formatValue(sales?.averageTicket, 'currency'),
      subtitle: sales ? `${sales.totalSales} vendas` : '--',
    },
    {
      icon: FileText,
      color: 'yellow',
      label: 'Orç. Pendentes',
      value: formatValue(pendingQuotes, 'number'),
      subtitle: quotes ? `Conv. ${quotes.conversionRate.toFixed(1)}%` : '--',
    },
    {
      icon: UserPlus,
      color: 'teal',
      label: 'Novos Clientes',
      value: formatValue(clients?.newInPeriod, 'number'),
      subtitle: clients ? `${clients.activeClients} ativos` : '--',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {kpis.map((kpi) => (
        <KpiCard key={kpi.label} {...kpi} />
      ))}
    </div>
  );
}
