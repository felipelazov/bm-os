'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { CHART_COLORS, ChartTooltip, ReportChartContainer } from '@/components/reports/report-chart';
import type {
  SalesReportData,
  QuotesReportData,
  LogisticsReportData,
  FinancialReportData,
} from '@/types/reports.types';

interface DashboardData {
  sales: SalesReportData | null;
  quotes: QuotesReportData | null;
  logistics: LogisticsReportData | null;
  financial: FinancialReportData | null;
}

interface DashboardChartsProps {
  data: DashboardData;
}

function renderPieLabel(entry: { label?: string; name?: string; percent?: number }) {
  const name = entry.label ?? entry.name ?? '';
  const pct = entry.percent != null ? (entry.percent * 100).toFixed(0) : '0';
  return `${name} ${pct}%`;
}

export function DashboardCharts({ data }: DashboardChartsProps) {
  const { sales, quotes, logistics, financial } = data;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Faturamento por Período */}
      <ReportChartContainer
        title="Faturamento por Período"
        height={280}
        isEmpty={!sales || sales.revenueByPeriod.length === 0}
      >
        <BarChart data={sales?.revenueByPeriod ?? []}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#9ca3af" />
          <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
          <Tooltip content={<ChartTooltip format="currency" />} />
          <Bar dataKey="value" name="Faturamento" fill="#2563eb" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ReportChartContainer>

      {/* Receitas vs Despesas */}
      <ReportChartContainer
        title="Receitas vs Despesas"
        height={280}
        isEmpty={!financial || financial.incomeVsExpense.length === 0}
      >
        <BarChart data={financial?.incomeVsExpense ?? []}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#9ca3af" />
          <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" />
          <Tooltip content={<ChartTooltip format="currency" />} />
          <Legend />
          <Bar dataKey="value" name="Receitas" fill="#16a34a" radius={[4, 4, 0, 0]} />
          <Bar dataKey="value2" name="Despesas" fill="#dc2626" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ReportChartContainer>

      {/* Status das Entregas */}
      <ReportChartContainer
        title="Status das Entregas"
        height={260}
        isEmpty={!logistics || logistics.statusBreakdown.length === 0}
      >
        <PieChart>
          <Pie
            data={logistics?.statusBreakdown ?? []}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            outerRadius={100}
            labelLine={false}
            label={renderPieLabel}
          >
            {(logistics?.statusBreakdown ?? []).map((_, index) => (
              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
          <Legend />
        </PieChart>
      </ReportChartContainer>

      {/* Funil de Orçamentos */}
      <ReportChartContainer
        title="Funil de Orçamentos"
        height={260}
        isEmpty={!quotes || quotes.funnelByStatus.length === 0}
      >
        <BarChart data={quotes?.funnelByStatus ?? []} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis type="number" tick={{ fontSize: 12 }} stroke="#9ca3af" />
          <YAxis dataKey="label" type="category" tick={{ fontSize: 12 }} stroke="#9ca3af" width={80} />
          <Tooltip content={<ChartTooltip />} />
          <Bar dataKey="value" name="Orçamentos" fill="#9333ea" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ReportChartContainer>
    </div>
  );
}
