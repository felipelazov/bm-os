// ============================================
// Módulo Relatórios — Dashboard Analítico
// ============================================

export type DatePreset = 'hoje' | '7dias' | '30dias' | 'este_mes' | 'personalizado';

export type ReportTab = 'vendas' | 'orcamentos' | 'logistica' | 'clientes' | 'financeiro' | 'estoque';

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

// ============================================
// Dados por aba
// ============================================

export interface ChartDataPoint {
  label: string;
  value: number;
  value2?: number;
}

export interface SalesReportData {
  totalRevenue: number;
  totalSales: number;
  averageTicket: number;
  paidPercent: number;
  revenueByPeriod: ChartDataPoint[];
  byPaymentMethod: ChartDataPoint[];
}

export interface QuotesReportData {
  totalQuotes: number;
  conversionRate: number;
  totalValue: number;
  averageDiscount: number;
  funnelByStatus: ChartDataPoint[];
  quotesByPeriod: ChartDataPoint[];
}

export interface LogisticsReportData {
  totalDeliveries: number;
  completedDeliveries: number;
  averageTimeHours: number;
  valueInRoute: number;
  byDriver: ChartDataPoint[];
  statusBreakdown: ChartDataPoint[];
}

export interface ClientsReportData {
  totalClients: number;
  newInPeriod: number;
  activeClients: number;
  typeInfo: string;
  newByPeriod: ChartDataPoint[];
  byType: ChartDataPoint[];
}

export interface FinancialReportData {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  overdue: number;
  incomeVsExpense: ChartDataPoint[];
  cumulativeFlow: ChartDataPoint[];
}

export interface StockReportData {
  totalSKUs: number;
  criticalStock: number;
  estimatedValue: number;
  totalMovements: number;
  belowMinimum: ChartDataPoint[];
  movementsByType: ChartDataPoint[];
}
