'use client';

import { formatCurrency, formatPercent } from '@/lib/formatters';
import type { DreReport } from '@/types/dre.types';
import { cn } from '@/lib/utils';

interface DreTableProps {
  report: DreReport;
}

interface DreRow {
  label: string;
  value: number;
  margin: number | null;
  indent: number;
  isTotal: boolean;
  isSubtraction: boolean;
}

function buildRows(r: DreReport): DreRow[] {
  return [
    { label: 'RECEITA BRUTA', value: r.receita_bruta, margin: null, indent: 0, isTotal: true, isSubtraction: false },
    { label: '(-) Deduções da Receita', value: r.deducoes_receita, margin: null, indent: 1, isTotal: false, isSubtraction: true },
    { label: '= RECEITA LÍQUIDA', value: r.receita_liquida, margin: null, indent: 0, isTotal: true, isSubtraction: false },
    { label: '(-) CPV / CMV / CSP', value: r.custo_produtos, margin: null, indent: 1, isTotal: false, isSubtraction: true },
    { label: '= LUCRO BRUTO', value: r.lucro_bruto, margin: r.margem_bruta, indent: 0, isTotal: true, isSubtraction: false },
    { label: '(-) Despesas Administrativas', value: r.despesas_administrativas, margin: null, indent: 1, isTotal: false, isSubtraction: true },
    { label: '(-) Despesas Comerciais', value: r.despesas_comerciais, margin: null, indent: 1, isTotal: false, isSubtraction: true },
    { label: '(-) Despesas Gerais', value: r.despesas_gerais, margin: null, indent: 1, isTotal: false, isSubtraction: true },
    { label: '= EBITDA', value: r.ebitda, margin: r.margem_ebitda, indent: 0, isTotal: true, isSubtraction: false },
    { label: '(-) Depreciação e Amortização', value: r.depreciacao_amortizacao, margin: null, indent: 1, isTotal: false, isSubtraction: true },
    { label: '= EBIT (Lucro Operacional)', value: r.ebit, margin: r.margem_operacional, indent: 0, isTotal: true, isSubtraction: false },
    { label: '(+) Receitas Financeiras', value: r.receitas_financeiras, margin: null, indent: 1, isTotal: false, isSubtraction: false },
    { label: '(-) Despesas Financeiras', value: r.despesas_financeiras, margin: null, indent: 1, isTotal: false, isSubtraction: true },
    { label: '= Resultado Financeiro', value: r.resultado_financeiro, margin: null, indent: 0, isTotal: true, isSubtraction: false },
    { label: '= LAIR (Lucro Antes do IR)', value: r.lair, margin: null, indent: 0, isTotal: true, isSubtraction: false },
    { label: '(-) Imposto de Renda', value: r.imposto_renda, margin: null, indent: 1, isTotal: false, isSubtraction: true },
    { label: '(-) CSLL', value: r.csll, margin: null, indent: 1, isTotal: false, isSubtraction: true },
    { label: '= LUCRO LÍQUIDO', value: r.lucro_liquido, margin: r.margem_liquida, indent: 0, isTotal: true, isSubtraction: false },
  ];
}

export function DreTable({ report }: DreTableProps) {
  const rows = buildRows(report);

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">
              Descrição
            </th>
            <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">
              Valor (R$)
            </th>
            <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-100">
              Margem (%)
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={idx}
              className={cn(
                'border-b border-gray-100 dark:border-gray-700',
                row.isTotal && 'bg-gray-50 dark:bg-gray-800/50'
              )}
            >
              <td
                className={cn(
                  'px-6 py-3 text-sm',
                  row.isTotal ? 'font-bold text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300',
                  row.isSubtraction && 'text-gray-500 dark:text-gray-400'
                )}
                style={{ paddingLeft: `${1.5 + row.indent * 1.5}rem` }}
              >
                {row.label}
              </td>
              <td
                className={cn(
                  'px-6 py-3 text-right text-sm tabular-nums',
                  row.isTotal ? 'font-bold' : 'font-medium',
                  row.value < 0 ? 'text-red-600' : 'text-gray-900 dark:text-gray-100'
                )}
              >
                {row.isSubtraction ? `(${formatCurrency(row.value)})` : formatCurrency(row.value)}
              </td>
              <td className="px-6 py-3 text-right text-sm tabular-nums text-gray-500 dark:text-gray-400">
                {row.margin != null ? formatPercent(row.margin) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
