import { getSales } from '@/services/sales/sales.service';
import { getQuotes } from '@/services/quotes/quotes.service';
import { getDeliveries } from '@/services/logistics/logistics.service';
import { getClients } from '@/services/clients/clients.service';
import { getTransactions } from '@/services/financial/financial.service';
import { getProducts } from '@/services/products/products.service';
import { getStockLevels, getMovements } from '@/services/products/stock.service';
import type {
  DateRange,
  SalesReportData,
  QuotesReportData,
  LogisticsReportData,
  ClientsReportData,
  FinancialReportData,
  StockReportData,
  ChartDataPoint,
} from '@/types/reports.types';

// ============================================
// Helper: agrupamento por período
// ============================================

function getGroupingFormat(startDate: string, endDate: string): 'day' | 'week' | 'month' {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 7) return 'day';
  if (diffDays <= 60) return 'week';
  return 'month';
}

function getGroupKey(dateStr: string, format: 'day' | 'week' | 'month'): string {
  const date = new Date(dateStr);
  if (format === 'day') {
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
  if (format === 'week') {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const weekNum = Math.ceil(((date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24) + startOfYear.getDay() + 1) / 7);
    return `Sem ${weekNum}`;
  }
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[date.getMonth()]}/${date.getFullYear().toString().slice(-2)}`;
}

function groupByPeriod(
  items: { date: string; value: number; value2?: number }[],
  range: DateRange
): ChartDataPoint[] {
  const format = getGroupingFormat(range.startDate, range.endDate);
  const map = new Map<string, { value: number; value2: number }>();

  for (const item of items) {
    const key = getGroupKey(item.date, format);
    const existing = map.get(key) ?? { value: 0, value2: 0 };
    existing.value += item.value;
    existing.value2 += item.value2 ?? 0;
    map.set(key, existing);
  }

  return Array.from(map.entries()).map(([label, vals]) => ({
    label,
    value: vals.value,
    ...(vals.value2 > 0 ? { value2: vals.value2 } : {}),
  }));
}

function isInRange(dateStr: string, range: DateRange): boolean {
  const d = dateStr.substring(0, 10);
  return d >= range.startDate && d <= range.endDate;
}

// ============================================
// Vendas
// ============================================

export async function getSalesReport(range: DateRange): Promise<SalesReportData> {
  const allSales = await getSales();
  const sales = allSales.filter((s) => isInRange(s.created_at, range));

  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
  const totalSales = sales.length;
  const averageTicket = totalSales > 0 ? totalRevenue / totalSales : 0;
  const paidCount = sales.filter((s) => s.payment_status === 'pago').length;
  const paidPercent = totalSales > 0 ? (paidCount / totalSales) * 100 : 0;

  const revenueByPeriod = groupByPeriod(
    sales.map((s) => ({ date: s.created_at, value: s.total })),
    range
  );

  const paymentMap = new Map<string, number>();
  for (const s of sales) {
    const method = s.payment_method || 'Não informado';
    paymentMap.set(method, (paymentMap.get(method) ?? 0) + s.total);
  }
  const byPaymentMethod: ChartDataPoint[] = Array.from(paymentMap.entries()).map(([label, value]) => ({ label, value }));

  return { totalRevenue, totalSales, averageTicket, paidPercent, revenueByPeriod, byPaymentMethod };
}

// ============================================
// Orçamentos
// ============================================

export async function getQuotesReport(range: DateRange): Promise<QuotesReportData> {
  const allQuotes = await getQuotes();
  const quotes = allQuotes.filter((q) => !q.is_deleted && isInRange(q.created_at, range));

  const totalQuotes = quotes.length;
  const convertedCount = quotes.filter((q) => q.status === 'convertido').length;
  const conversionRate = totalQuotes > 0 ? (convertedCount / totalQuotes) * 100 : 0;
  const totalValue = quotes.reduce((sum, q) => sum + q.total, 0);

  const quotesWithDiscount = quotes.filter((q) => q.discount_enabled && q.discount_percent > 0);
  const averageDiscount = quotesWithDiscount.length > 0
    ? quotesWithDiscount.reduce((sum, q) => sum + q.discount_percent, 0) / quotesWithDiscount.length
    : 0;

  const statusLabels: Record<string, string> = {
    pendente: 'Pendente',
    aprovado: 'Aprovado',
    recusado: 'Recusado',
    convertido: 'Convertido',
  };
  const statusMap = new Map<string, number>();
  for (const q of quotes) {
    const label = statusLabels[q.status] ?? q.status;
    statusMap.set(label, (statusMap.get(label) ?? 0) + 1);
  }
  const funnelByStatus: ChartDataPoint[] = Array.from(statusMap.entries()).map(([label, value]) => ({ label, value }));

  const quotesByPeriod = groupByPeriod(
    quotes.map((q) => ({ date: q.created_at, value: 1 })),
    range
  );

  return { totalQuotes, conversionRate, totalValue, averageDiscount, funnelByStatus, quotesByPeriod };
}

// ============================================
// Logística
// ============================================

export async function getLogisticsReport(range: DateRange): Promise<LogisticsReportData> {
  const allDeliveries = await getDeliveries();
  const deliveries = allDeliveries.filter((d) => isInRange(d.created_at, range));

  const totalDeliveries = deliveries.length;
  const completed = deliveries.filter((d) => d.status === 'entregue');
  const completedDeliveries = completed.length;

  let totalHours = 0;
  let countWithTime = 0;
  for (const d of completed) {
    if (d.completed_at) {
      const diff = new Date(d.completed_at).getTime() - new Date(d.created_at).getTime();
      totalHours += diff / (1000 * 60 * 60);
      countWithTime++;
    }
  }
  const averageTimeHours = countWithTime > 0 ? totalHours / countWithTime : 0;

  const inRoute = deliveries.filter((d) => d.status === 'em_rota');
  const valueInRoute = inRoute.reduce((sum, d) => sum + d.total, 0);

  const driverMap = new Map<string, number>();
  for (const d of deliveries) {
    const driver = d.driver_name || 'Sem motorista';
    driverMap.set(driver, (driverMap.get(driver) ?? 0) + 1);
  }
  const byDriver: ChartDataPoint[] = Array.from(driverMap.entries()).map(([label, value]) => ({ label, value }));

  const statusLabels: Record<string, string> = {
    aguardando: 'Aguardando',
    em_rota: 'Em Rota',
    entregue: 'Entregue',
  };
  const statusMap = new Map<string, number>();
  for (const d of deliveries) {
    const label = statusLabels[d.status] ?? d.status;
    statusMap.set(label, (statusMap.get(label) ?? 0) + 1);
  }
  const statusBreakdown: ChartDataPoint[] = Array.from(statusMap.entries()).map(([label, value]) => ({ label, value }));

  return { totalDeliveries, completedDeliveries, averageTimeHours, valueInRoute, byDriver, statusBreakdown };
}

// ============================================
// Clientes
// ============================================

export async function getClientsReport(range: DateRange): Promise<ClientsReportData> {
  const clients = await getClients(false);

  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.is_active).length;
  const newInPeriod = clients.filter((c) => isInRange(c.created_at, range)).length;

  const typeLabels: Record<string, string> = { varejo: 'Varejo', mensalista: 'Mensalista', doacao: 'Doação' };
  const typeMap = new Map<string, number>();
  for (const c of clients) {
    const label = typeLabels[c.client_type] ?? c.client_type;
    typeMap.set(label, (typeMap.get(label) ?? 0) + 1);
  }
  const byType: ChartDataPoint[] = Array.from(typeMap.entries()).map(([label, value]) => ({ label, value }));

  const majorType = byType.sort((a, b) => b.value - a.value)[0];
  const typeInfo = majorType ? `${majorType.value} ${majorType.label}` : '';

  const newClients = clients.filter((c) => isInRange(c.created_at, range));
  const newByPeriod = groupByPeriod(
    newClients.map((c) => ({ date: c.created_at, value: 1 })),
    range
  );

  return { totalClients, newInPeriod, activeClients, typeInfo, newByPeriod, byType };
}

// ============================================
// Financeiro
// ============================================

export async function getFinancialReport(range: DateRange): Promise<FinancialReportData> {
  const transactions = await getTransactions({ startDate: range.startDate, endDate: range.endDate });
  const active = transactions.filter((t) => t.status !== 'cancelled');

  const incomes = active.filter((t) => t.type === 'income');
  const expenses = active.filter((t) => t.type === 'expense');
  const totalIncome = incomes.reduce((sum, t) => sum + t.value, 0);
  const totalExpense = expenses.reduce((sum, t) => sum + t.value, 0);
  const balance = totalIncome - totalExpense;

  const today = new Date().toISOString().substring(0, 10);
  const overdue = active
    .filter((t) => t.status === 'overdue' || (t.status === 'pending' && t.due_date && t.due_date < today))
    .reduce((sum, t) => sum + t.value, 0);

  const incomeVsExpense = groupByPeriod(
    active.map((t) => ({
      date: t.date,
      value: t.type === 'income' ? t.value : 0,
      value2: t.type === 'expense' ? t.value : 0,
    })),
    range
  );

  // Fluxo acumulado
  let cumulative = 0;
  const cumulativeFlow: ChartDataPoint[] = incomeVsExpense.map((p) => {
    cumulative += p.value - (p.value2 ?? 0);
    return { label: p.label, value: cumulative };
  });

  return { totalIncome, totalExpense, balance, overdue, incomeVsExpense, cumulativeFlow };
}

// ============================================
// Estoque
// ============================================

export async function getStockReport(range: DateRange): Promise<StockReportData> {
  const [products, stockLevels, movements] = await Promise.all([
    getProducts(),
    getStockLevels(),
    getMovements(),
  ]);

  const totalSKUs = products.length;

  // Agregar quantidade total por produto
  const productQtyMap = new Map<string, number>();
  for (const sl of stockLevels) {
    productQtyMap.set(sl.product_id, (productQtyMap.get(sl.product_id) ?? 0) + sl.quantity);
  }

  let criticalStock = 0;
  const belowMinItems: { name: string; current: number; minimum: number }[] = [];
  for (const p of products) {
    const totalQty = productQtyMap.get(p.id) ?? 0;
    if (totalQty < p.min_stock) {
      criticalStock++;
      belowMinItems.push({ name: p.name, current: totalQty, minimum: p.min_stock });
    }
  }

  // Top 10 abaixo do minimo (ordenados por diferenca)
  belowMinItems.sort((a, b) => (a.current - a.minimum) - (b.current - b.minimum));
  const belowMinimum: ChartDataPoint[] = belowMinItems.slice(0, 10).map((item) => ({
    label: item.name,
    value: item.current,
    value2: item.minimum,
  }));

  // Valor estimado (preco de venda * quantidade)
  let estimatedValue = 0;
  for (const p of products) {
    const qty = productQtyMap.get(p.id) ?? 0;
    estimatedValue += qty * (p.sale_price ?? 0);
  }

  // Movimentacoes no periodo
  const periodMovements = movements.filter((m) => isInRange(m.created_at, range));
  const totalMovements = periodMovements.length;

  const typeLabels: Record<string, string> = {
    transfer: 'Transferência',
    entry: 'Entrada',
    exit: 'Saída',
    adjustment: 'Ajuste',
  };
  const typeMap = new Map<string, number>();
  for (const m of periodMovements) {
    const label = typeLabels[m.movement_type] ?? m.movement_type;
    typeMap.set(label, (typeMap.get(label) ?? 0) + 1);
  }
  const movementsByType: ChartDataPoint[] = Array.from(typeMap.entries()).map(([label, value]) => ({ label, value }));

  return { totalSKUs, criticalStock, estimatedValue, totalMovements, belowMinimum, movementsByType };
}
