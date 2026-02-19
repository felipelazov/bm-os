import type { DreReport, ForecastResult, ForecastPeriod } from '@/types/dre.types';

function linearRegression(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] ?? 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return { slope: 0, intercept: sumY / n };

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  return { slope, intercept };
}

function determineTrend(growth_rate: number): 'up' | 'down' | 'stable' {
  if (growth_rate > 2) return 'up';
  if (growth_rate < -2) return 'down';
  return 'stable';
}

function calculateConfidence(values: number[], slope: number, intercept: number): number {
  const n = values.length;
  if (n < 3) return 0.5;

  const mean = values.reduce((a, b) => a + b, 0) / n;
  let ssRes = 0, ssTot = 0;
  for (let i = 0; i < n; i++) {
    const predicted = intercept + slope * i;
    ssRes += (values[i] - predicted) ** 2;
    ssTot += (values[i] - mean) ** 2;
  }

  if (ssTot === 0) return 1;
  const rSquared = 1 - ssRes / ssTot;
  return Math.max(0, Math.min(1, rSquared));
}

export function forecastDre(
  historicalReports: DreReport[],
  monthsAhead: number = 12
): ForecastResult {
  if (historicalReports.length === 0) {
    return { periods: [], growth_rate: 0, trend: 'stable', confidence: 0 };
  }

  const revenues = historicalReports.map((r) => r.receita_liquida);
  const ebitdas = historicalReports.map((r) => r.ebitda);
  const profits = historicalReports.map((r) => r.lucro_liquido);

  const revReg = linearRegression(revenues);
  const ebitdaReg = linearRegression(ebitdas);
  const profitReg = linearRegression(profits);

  const n = historicalReports.length;
  const periods: ForecastPeriod[] = [];

  const baseDate = new Date(
    historicalReports[historicalReports.length - 1].period.end_date
  );

  for (let i = 1; i <= monthsAhead; i++) {
    const forecastIndex = n - 1 + i;
    const forecastDate = new Date(baseDate);
    forecastDate.setMonth(forecastDate.getMonth() + i);

    const receita_liquida = Math.max(0, revReg.intercept + revReg.slope * forecastIndex);
    const ebitda = ebitdaReg.intercept + ebitdaReg.slope * forecastIndex;
    const lucro_liquido = profitReg.intercept + profitReg.slope * forecastIndex;

    periods.push({
      month: forecastDate.toISOString().slice(0, 7),
      receita_liquida: Math.round(receita_liquida * 100) / 100,
      ebitda: Math.round(ebitda * 100) / 100,
      lucro_liquido: Math.round(lucro_liquido * 100) / 100,
      margem_ebitda: receita_liquida > 0 ? (ebitda / receita_liquida) * 100 : 0,
    });
  }

  // Taxa de crescimento anualizada baseada na tendência
  const firstRevenue = revenues[0] || 1;
  const lastRevenue = revenues[revenues.length - 1] || 1;
  const growth_rate =
    revenues.length > 1
      ? ((lastRevenue / firstRevenue) ** (12 / revenues.length) - 1) * 100
      : 0;

  return {
    periods,
    growth_rate: Math.round(growth_rate * 10) / 10,
    trend: determineTrend(growth_rate),
    confidence: calculateConfidence(revenues, revReg.slope, revReg.intercept),
  };
}
