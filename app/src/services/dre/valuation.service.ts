import type { ValuationInput, ValuationResult } from '@/types/dre.types';

export function calculateValuation(input: ValuationInput): ValuationResult {
  const enterprise_value = input.ebitda * input.multiplo;
  const divida_liquida = input.divida_bruta - input.caixa;
  const equity_value = enterprise_value - divida_liquida;

  return {
    ebitda_anual: input.ebitda,
    multiplo_ev_ebitda: input.multiplo,
    enterprise_value,
    divida_liquida,
    equity_value,
  };
}

export function estimateMultiple(sector: string, growth_rate: number): number {
  const baseMultiples: Record<string, number> = {
    tecnologia: 15,
    saas: 20,
    varejo: 8,
    industria: 6,
    servicos: 10,
    saude: 12,
    educacao: 10,
    financeiro: 12,
  };

  const base = baseMultiples[sector] ?? 8;

  // Ajuste por crescimento: +1x para cada 10% de crescimento acima de 10%
  const growthAdjustment = Math.max(0, (growth_rate - 10) / 10);

  return Math.round((base + growthAdjustment) * 10) / 10;
}
