// ============================================
// DRE (Demonstração do Resultado do Exercício)
// ============================================

export type PeriodType = 'monthly' | 'quarterly' | 'annual';

export interface DrePeriod {
  id: string;
  tenant_id: string;
  name: string;
  type: PeriodType;
  start_date: string;
  end_date: string;
  is_closed: boolean;
  created_at: string;
  updated_at: string;
}

export type DreCategoryType =
  | 'receita_bruta'
  | 'deducao_receita'
  | 'custo_produtos'
  | 'despesa_administrativa'
  | 'despesa_comercial'
  | 'despesa_geral'
  | 'depreciacao_amortizacao'
  | 'receita_financeira'
  | 'despesa_financeira'
  | 'imposto_renda'
  | 'csll';

export interface DreCategory {
  id: string;
  tenant_id: string;
  name: string;
  type: DreCategoryType;
  parent_id: string | null;
  order: number;
  is_active: boolean;
}

export interface DreEntry {
  id: string;
  period_id: string;
  category_id: string;
  description: string;
  value: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// DRE Calculated Report
// ============================================

export interface DreLineItem {
  label: string;
  value: number;
  percentage: number | null;
  children?: DreLineItem[];
}

export interface DreReport {
  period: DrePeriod;
  receita_bruta: number;
  deducoes_receita: number;
  receita_liquida: number;
  custo_produtos: number;
  lucro_bruto: number;
  despesas_administrativas: number;
  despesas_comerciais: number;
  despesas_gerais: number;
  total_despesas_operacionais: number;
  ebitda: number;
  depreciacao_amortizacao: number;
  ebit: number;
  receitas_financeiras: number;
  despesas_financeiras: number;
  resultado_financeiro: number;
  lair: number;
  imposto_renda: number;
  csll: number;
  lucro_liquido: number;
  // Métricas derivadas
  margem_bruta: number;
  margem_ebitda: number;
  margem_liquida: number;
  margem_operacional: number;
}

// ============================================
// Valuation
// ============================================

export interface ValuationResult {
  ebitda_anual: number;
  multiplo_ev_ebitda: number;
  enterprise_value: number;
  divida_liquida: number;
  equity_value: number;
}

export interface ValuationInput {
  ebitda: number;
  multiplo: number;
  divida_bruta: number;
  caixa: number;
}

// ============================================
// Forecast
// ============================================

export interface ForecastPeriod {
  month: string;
  receita_liquida: number;
  ebitda: number;
  lucro_liquido: number;
  margem_ebitda: number;
}

export interface ForecastResult {
  periods: ForecastPeriod[];
  growth_rate: number;
  trend: 'up' | 'down' | 'stable';
  confidence: number;
}
