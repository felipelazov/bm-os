'use client';

import Link from 'next/link';
import {
  CreditCard,
  Package,
  Clock,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import type {
  QuotesReportData,
  LogisticsReportData,
  FinancialReportData,
  StockReportData,
} from '@/types/reports.types';

interface DashboardData {
  quotes: QuotesReportData | null;
  logistics: LogisticsReportData | null;
  financial: FinancialReportData | null;
  stock: StockReportData | null;
}

interface DashboardAlertsProps {
  data: DashboardData;
}

interface AlertItem {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  title: string;
  description: string;
  link: string;
}

const ALERT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  red: {
    bg: 'bg-red-50 dark:bg-red-950/30',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800',
  },
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-200 dark:border-orange-800',
  },
  yellow: {
    bg: 'bg-yellow-50 dark:bg-yellow-950/30',
    text: 'text-yellow-600 dark:text-yellow-400',
    border: 'border-yellow-200 dark:border-yellow-800',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-200 dark:border-purple-800',
  },
};

export function DashboardAlerts({ data }: DashboardAlertsProps) {
  const { quotes, logistics, financial, stock } = data;

  const alerts: AlertItem[] = [];

  // Contas vencidas
  if (financial && financial.overdue > 0) {
    alerts.push({
      icon: CreditCard,
      color: 'red',
      title: 'Contas vencidas',
      description: `${formatCurrency(financial.overdue)} em contas vencidas`,
      link: '/financeiro/contas-pagar',
    });
  }

  // Estoque crítico
  if (stock && stock.criticalStock > 0) {
    const topItems = stock.belowMinimum.slice(0, 5).map((i) => i.label).join(', ');
    alerts.push({
      icon: Package,
      color: 'orange',
      title: 'Estoque crítico',
      description: `${stock.criticalStock} itens abaixo do mínimo${topItems ? `: ${topItems}` : ''}`,
      link: '/produtos/estoque',
    });
  }

  // Entregas pendentes
  if (logistics) {
    const pending = logistics.totalDeliveries - logistics.completedDeliveries;
    if (pending > 0) {
      alerts.push({
        icon: Clock,
        color: 'yellow',
        title: 'Entregas pendentes',
        description: `${pending} entregas pendentes · ${formatCurrency(logistics.valueInRoute)} em rota`,
        link: '/logistica',
      });
    }
  }

  // Orçamentos aguardando
  if (quotes) {
    const pendingQuotes = quotes.funnelByStatus.find((f) => f.label === 'Pendente')?.value ?? 0;
    if (pendingQuotes > 0) {
      alerts.push({
        icon: FileText,
        color: 'purple',
        title: 'Orçamentos aguardando',
        description: `${pendingQuotes} orçamentos pendentes · Conv. ${quotes.conversionRate.toFixed(1)}%`,
        link: '/orcamentos',
      });
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
        Alertas e Atividade
      </h3>

      {alerts.length === 0 ? (
        <div className="flex items-center gap-3 rounded-lg bg-green-50 p-4 dark:bg-green-950/30">
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
          <p className="text-sm text-green-700 dark:text-green-300">
            Nenhum alerta no momento. Tudo em ordem!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const colors = ALERT_COLORS[alert.color] ?? ALERT_COLORS.yellow;
            const Icon = alert.icon;

            return (
              <Link
                key={alert.title}
                href={alert.link}
                className={cn(
                  'flex items-center gap-3 rounded-lg border p-4 transition-colors hover:opacity-80',
                  colors.bg,
                  colors.border
                )}
              >
                <Icon className={cn('h-5 w-5 shrink-0', colors.text)} />
                <div className="min-w-0 flex-1">
                  <p className={cn('text-sm font-medium', colors.text)}>{alert.title}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{alert.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
