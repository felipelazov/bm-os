'use client';

import { useState, useEffect } from 'react';
import { DreChart } from '@/components/dre/dre-chart';
import { getPeriods, getCategories, getEntries } from '@/services/dre/dre.service';
import { calculateDre } from '@/services/dre/dre-calculator';
import { formatCurrency, formatPercent } from '@/lib/formatters';
import type { DreReport } from '@/types/dre.types';
import { Loader2 } from 'lucide-react';

interface ChartDataPoint {
  period: string;
  receita_liquida: number;
  ebitda: number;
  lucro_liquido: number;
}

export default function ReportsPage() {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [reports, setReports] = useState<DreReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchReports() {
      try {
        setLoading(true);
        const [periods, categories] = await Promise.all([
          getPeriods(),
          getCategories(),
        ]);

        // Ordena do mais antigo ao mais recente para o gráfico
        const sortedPeriods = [...periods].sort(
          (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
        );

        // Busca entries e calcula DRE para cada período (últimos 6)
        const recentPeriods = sortedPeriods.slice(-6);
        const reportsData: DreReport[] = [];
        const chart: ChartDataPoint[] = [];

        for (const period of recentPeriods) {
          const entries = await getEntries(period.id);
          const report = calculateDre(period, entries, categories);
          reportsData.push(report);

          // Cria label curta para o gráfico
          const date = new Date(period.start_date);
          const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
          const label = `${monthNames[date.getMonth()]}/${String(date.getFullYear()).slice(2)}`;

          chart.push({
            period: label,
            receita_liquida: report.receita_liquida,
            ebitda: report.ebitda,
            lucro_liquido: report.lucro_liquido,
          });
        }

        setReports(reportsData);
        setChartData(chart);
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar relatórios');
      } finally {
        setLoading(false);
      }
    }

    fetchReports();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Calcula métricas agregadas dos relatórios
  const lastReport = reports[reports.length - 1];
  const totalReceita = reports.reduce((sum, r) => sum + r.receita_liquida, 0);
  const totalEbitda = reports.reduce((sum, r) => sum + r.ebitda, 0);
  const avgMargemBruta = reports.length > 0 ? reports.reduce((sum, r) => sum + r.margem_bruta, 0) / reports.length : 0;
  const avgMargemEbitda = reports.length > 0 ? reports.reduce((sum, r) => sum + r.margem_ebitda, 0) / reports.length : 0;
  const avgMargemOperacional = reports.length > 0 ? reports.reduce((sum, r) => sum + r.margem_operacional, 0) / reports.length : 0;
  const avgMargemLiquida = reports.length > 0 ? reports.reduce((sum, r) => sum + r.margem_liquida, 0) / reports.length : 0;

  // Crescimento MoM
  let crescimentoMom = 0;
  if (reports.length >= 2) {
    const prev = reports[reports.length - 2].receita_liquida;
    const curr = reports[reports.length - 1].receita_liquida;
    crescimentoMom = prev > 0 ? ((curr - prev) / prev) * 100 : 0;
  }

  const ebitdaAnualizado = lastReport ? lastReport.ebitda * 12 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Relatórios</h1>
        <p className="text-gray-500 dark:text-gray-400">Análise de evolução e tendências financeiras</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">{error}</div>
      )}

      {reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 py-12 dark:border-gray-600">
          <p className="text-lg font-medium text-gray-500 dark:text-gray-400">Nenhum período com dados</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">Crie períodos e adicione lançamentos para ver os relatórios</p>
        </div>
      ) : (
        <>
          <DreChart data={chartData} title={`Evolução Financeira (${reports.length} períodos)`} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Análise de Margens (Média)</h3>
              <div className="space-y-4">
                {[
                  { label: 'Margem Bruta', value: avgMargemBruta, color: 'bg-blue-500' },
                  { label: 'Margem EBITDA', value: avgMargemEbitda, color: 'bg-green-500' },
                  { label: 'Margem Operacional', value: avgMargemOperacional, color: 'bg-purple-500' },
                  { label: 'Margem Líquida', value: avgMargemLiquida, color: 'bg-orange-500' },
                ].map((margin) => (
                  <div key={margin.label}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">{margin.label}</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{formatPercent(margin.value)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700">
                      <div
                        className={`h-2 rounded-full ${margin.color}`}
                        style={{ width: `${Math.min(Math.max(margin.value, 0), 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Indicadores Chave</h3>
              <div className="space-y-3">
                {[
                  { label: `Receita Líquida Acumulada (${reports.length}m)`, value: formatCurrency(totalReceita) },
                  { label: `EBITDA Acumulado (${reports.length}m)`, value: formatCurrency(totalEbitda) },
                  { label: 'Crescimento Receita (MoM)', value: `${crescimentoMom >= 0 ? '+' : ''}${formatPercent(crescimentoMom)}` },
                  { label: 'EBITDA Anualizado', value: formatCurrency(ebitdaAnualizado) },
                  { label: 'EV Estimado (8x EBITDA)', value: formatCurrency(ebitdaAnualizado * 8) },
                ].map((indicator) => (
                  <div key={indicator.label} className="flex justify-between border-b border-gray-100 pb-2 dark:border-gray-700">
                    <span className="text-sm text-gray-600 dark:text-gray-400">{indicator.label}</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{indicator.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
