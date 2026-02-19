import type {
  DreEntry,
  DreCategory,
  DrePeriod,
  DreReport,
  DreCategoryType,
} from '@/types/dre.types';
import type { Transaction } from '@/types/financial.types';

function sumByType(
  entries: DreEntry[],
  categories: DreCategory[],
  type: DreCategoryType
): number {
  const categoryIds = categories
    .filter((c) => c.type === type)
    .map((c) => c.id);
  return entries
    .filter((e) => categoryIds.includes(e.category_id))
    .reduce((sum, e) => sum + e.value, 0);
}

function sumTransactionsByDreType(
  transactions: Transaction[],
  categories: DreCategory[],
  type: DreCategoryType
): number {
  const categoryIds = categories
    .filter((c) => c.type === type)
    .map((c) => c.id);
  return transactions
    .filter((t) => t.dre_category_id && categoryIds.includes(t.dre_category_id) && t.is_classified)
    .reduce((sum, t) => sum + t.value, 0);
}

function safePercent(value: number, base: number): number {
  if (base === 0) return 0;
  return (value / base) * 100;
}

/**
 * Calcula DRE consolidando:
 * - Lançamentos manuais (DreEntry[])
 * - Transações classificadas do fluxo financeiro (Transaction[])
 */
export function calculateDre(
  period: DrePeriod,
  entries: DreEntry[],
  categories: DreCategory[],
  transactions: Transaction[] = []
): DreReport {
  // Soma manual + transações classificadas para cada tipo
  const sum = (type: DreCategoryType) =>
    sumByType(entries, categories, type) +
    sumTransactionsByDreType(transactions, categories, type);

  const receita_bruta = sum('receita_bruta');
  const deducoes_receita = sum('deducao_receita');
  const receita_liquida = receita_bruta - deducoes_receita;

  const custo_produtos = sum('custo_produtos');
  const lucro_bruto = receita_liquida - custo_produtos;

  const despesas_administrativas = sum('despesa_administrativa');
  const despesas_comerciais = sum('despesa_comercial');
  const despesas_gerais = sum('despesa_geral');
  const total_despesas_operacionais =
    despesas_administrativas + despesas_comerciais + despesas_gerais;

  const ebitda = lucro_bruto - total_despesas_operacionais;

  const depreciacao_amortizacao = sum('depreciacao_amortizacao');
  const ebit = ebitda - depreciacao_amortizacao;

  const receitas_financeiras = sum('receita_financeira');
  const despesas_financeiras = sum('despesa_financeira');
  const resultado_financeiro = receitas_financeiras - despesas_financeiras;

  const lair = ebit + resultado_financeiro;

  const imposto_renda = sum('imposto_renda');
  const csll = sum('csll');
  const lucro_liquido = lair - imposto_renda - csll;

  return {
    period,
    receita_bruta,
    deducoes_receita,
    receita_liquida,
    custo_produtos,
    lucro_bruto,
    despesas_administrativas,
    despesas_comerciais,
    despesas_gerais,
    total_despesas_operacionais,
    ebitda,
    depreciacao_amortizacao,
    ebit,
    receitas_financeiras,
    despesas_financeiras,
    resultado_financeiro,
    lair,
    imposto_renda,
    csll,
    lucro_liquido,
    margem_bruta: safePercent(lucro_bruto, receita_liquida),
    margem_ebitda: safePercent(ebitda, receita_liquida),
    margem_operacional: safePercent(ebit, receita_liquida),
    margem_liquida: safePercent(lucro_liquido, receita_liquida),
  };
}
