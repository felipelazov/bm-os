'use client';

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  Legend,
} from 'recharts';
import { formatCurrency } from '@/lib/formatters';
import { CHART_COLORS, ChartTooltip, ReportChartContainer } from './report-chart';
import type {
  SalesReportData,
  QuotesReportData,
  LogisticsReportData,
  ClientsReportData,
  FinancialReportData,
  StockReportData,
} from '@/types/reports.types';

// Helper para label de PieChart com tipagem correta
function renderPieLabel(entry: { label?: string; name?: string; percent?: number }) {
  const name = entry.label ?? entry.name ?? '';
  const pct = entry.percent != null ? (entry.percent * 100).toFixed(0) : '0';
  return `${name} ${pct}%`;
}

// ============================================
// KPI Card
// ============================================

function KpiCard({ label, value, subtitle }: { label: string; value: string; subtitle?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
      {subtitle && <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">{subtitle}</p>}
    </div>
  );
}

// ============================================
// Vendas
// ============================================

export function SalesTab({ data }: { data: SalesReportData }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Faturamento Total" value={formatCurrency(data.totalRevenue)} />
        <KpiCard label="Qtd Vendas" value={data.totalSales.toString()} />
        <KpiCard label="Ticket Médio" value={formatCurrency(data.averageTicket)} />
        <KpiCard label="% Pagas" value={`${data.paidPercent.toFixed(1)}%`} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <ReportChartContainer title="Faturamento por Período" isEmpty={data.revenueByPeriod.length === 0}>
          <BarChart data={data.revenueByPeriod}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<ChartTooltip format="currency" />} />
            <Bar dataKey="value" name="Faturamento" fill="#2563eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ReportChartContainer>
        <ReportChartContainer title="Vendas por Forma de Pagamento" isEmpty={data.byPaymentMethod.length === 0}>
          <PieChart>
            <Pie
              data={data.byPaymentMethod}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={renderPieLabel}
            >
              {data.byPaymentMethod.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip format="currency" />} />
          </PieChart>
        </ReportChartContainer>
      </div>
    </div>
  );
}

// ============================================
// Orçamentos
// ============================================

export function QuotesTab({ data }: { data: QuotesReportData }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total Orçamentos" value={data.totalQuotes.toString()} />
        <KpiCard label="Taxa Conversão" value={`${data.conversionRate.toFixed(1)}%`} />
        <KpiCard label="Valor Total" value={formatCurrency(data.totalValue)} />
        <KpiCard label="Desconto Médio" value={`${data.averageDiscount.toFixed(1)}%`} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <ReportChartContainer title="Funil por Status" isEmpty={data.funnelByStatus.length === 0}>
          <BarChart data={data.funnelByStatus} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis type="number" tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <YAxis dataKey="label" type="category" tick={{ fontSize: 12 }} stroke="#9ca3af" width={90} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="value" name="Quantidade" fill="#9333ea" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ReportChartContainer>
        <ReportChartContainer title="Orçamentos por Período" isEmpty={data.quotesByPeriod.length === 0}>
          <LineChart data={data.quotesByPeriod}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} />
            <Line type="monotone" dataKey="value" name="Orçamentos" stroke="#9333ea" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ReportChartContainer>
      </div>
    </div>
  );
}

// ============================================
// Logística
// ============================================

export function LogisticsTab({ data }: { data: LogisticsReportData }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total Entregas" value={data.totalDeliveries.toString()} />
        <KpiCard label="Concluidas" value={data.completedDeliveries.toString()} />
        <KpiCard label="Tempo Médio" value={`${data.averageTimeHours.toFixed(1)}h`} />
        <KpiCard label="Valor em Rota" value={formatCurrency(data.valueInRoute)} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <ReportChartContainer title="Entregas por Motorista" isEmpty={data.byDriver.length === 0}>
          <BarChart data={data.byDriver}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="value" name="Entregas" fill="#16a34a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ReportChartContainer>
        <ReportChartContainer title="Status das Entregas" isEmpty={data.statusBreakdown.length === 0}>
          <PieChart>
            <Pie
              data={data.statusBreakdown}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={renderPieLabel}
            >
              {data.statusBreakdown.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ReportChartContainer>
      </div>
    </div>
  );
}

// ============================================
// Clientes
// ============================================

export function ClientsTab({ data }: { data: ClientsReportData }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total Clientes" value={data.totalClients.toString()} />
        <KpiCard label="Novos no Período" value={data.newInPeriod.toString()} />
        <KpiCard label="Ativos" value={data.activeClients.toString()} />
        <KpiCard label="Tipo Principal" value={data.typeInfo || '-'} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <ReportChartContainer title="Novos Clientes por Período" isEmpty={data.newByPeriod.length === 0}>
          <BarChart data={data.newByPeriod}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="value" name="Novos Clientes" fill="#0891b2" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ReportChartContainer>
        <ReportChartContainer title="Distribuição por Tipo" isEmpty={data.byType.length === 0}>
          <PieChart>
            <Pie
              data={data.byType}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={renderPieLabel}
            >
              {data.byType.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ReportChartContainer>
      </div>
    </div>
  );
}

// ============================================
// Financeiro
// ============================================

export function FinancialTab({ data }: { data: FinancialReportData }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Receitas" value={formatCurrency(data.totalIncome)} />
        <KpiCard label="Despesas" value={formatCurrency(data.totalExpense)} />
        <KpiCard label="Saldo" value={formatCurrency(data.balance)} />
        <KpiCard label="Vencidos" value={formatCurrency(data.overdue)} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <ReportChartContainer title="Receitas vs Despesas" isEmpty={data.incomeVsExpense.length === 0}>
          <BarChart data={data.incomeVsExpense} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<ChartTooltip format="currency" />} />
            <Legend />
            <Bar dataKey="value" name="Receitas" fill="#22c55e" radius={[4, 4, 0, 0]} />
            <Bar dataKey="value2" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ReportChartContainer>
        <ReportChartContainer title="Fluxo Acumulado" isEmpty={data.cumulativeFlow.length === 0}>
          <AreaChart data={data.cumulativeFlow}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip content={<ChartTooltip format="currency" />} />
            <Area
              type="monotone"
              dataKey="value"
              name="Saldo Acumulado"
              stroke="#2563eb"
              fill="#2563eb"
              fillOpacity={0.15}
              strokeWidth={2}
            />
          </AreaChart>
        </ReportChartContainer>
      </div>
    </div>
  );
}

// ============================================
// Estoque
// ============================================

export function StockTab({ data }: { data: StockReportData }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total SKUs" value={data.totalSKUs.toString()} />
        <KpiCard label="Estoque Crítico" value={data.criticalStock.toString()} />
        <KpiCard label="Valor Estimado" value={formatCurrency(data.estimatedValue)} />
        <KpiCard label="Movimentações" value={data.totalMovements.toString()} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <ReportChartContainer title="Produtos Abaixo do Mínimo" isEmpty={data.belowMinimum.length === 0}>
          <BarChart data={data.belowMinimum} layout="vertical" barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis type="number" tick={{ fontSize: 12 }} stroke="#9ca3af" />
            <YAxis dataKey="label" type="category" tick={{ fontSize: 11 }} stroke="#9ca3af" width={120} />
            <Tooltip content={<ChartTooltip />} />
            <Legend />
            <Bar dataKey="value" name="Atual" fill="#ef4444" radius={[0, 4, 4, 0]} />
            <Bar dataKey="value2" name="Mínimo" fill="#d1d5db" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ReportChartContainer>
        <ReportChartContainer title="Movimentações por Tipo" isEmpty={data.movementsByType.length === 0}>
          <PieChart>
            <Pie
              data={data.movementsByType}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={renderPieLabel}
            >
              {data.movementsByType.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ReportChartContainer>
      </div>
    </div>
  );
}
