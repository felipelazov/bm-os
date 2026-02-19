'use client';

import { useState } from 'react';
import { formatCurrency } from '@/lib/formatters';
import { calculateValuation, estimateMultiple } from '@/services/dre/valuation.service';
import type { ValuationResult } from '@/types/dre.types';
import { DEFAULT_VALUATION_MULTIPLES } from '@/lib/constants';

interface ValuationPanelProps {
  ebitdaAnual: number;
}

export function ValuationPanel({ ebitdaAnual }: ValuationPanelProps) {
  const [sector, setSector] = useState('default');
  const [dividaBruta, setDividaBruta] = useState(0);
  const [caixa, setCaixa] = useState(0);
  const [customMultiplo, setCustomMultiplo] = useState<number | null>(null);

  const multiplo = customMultiplo ?? estimateMultiple(sector, 0);

  const result: ValuationResult = calculateValuation({
    ebitda: ebitdaAnual,
    multiplo,
    divida_bruta: dividaBruta,
    caixa,
  });

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Valuation (EV/EBITDA)</h3>

      {/* Inputs */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Setor</label>
          <select
            value={sector}
            onChange={(e) => {
              setSector(e.target.value);
              setCustomMultiplo(null);
            }}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          >
            {Object.entries(DEFAULT_VALUATION_MULTIPLES).map(([key, val]) => (
              <option key={key} value={key}>
                {key.charAt(0).toUpperCase() + key.slice(1)} ({val}x)
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Múltiplo EV/EBITDA</label>
          <input
            type="number"
            step="0.1"
            value={customMultiplo ?? multiplo}
            onChange={(e) => setCustomMultiplo(parseFloat(e.target.value) || null)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Dívida Bruta (R$)</label>
          <input
            type="number"
            value={dividaBruta}
            onChange={(e) => setDividaBruta(parseFloat(e.target.value) || 0)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Caixa (R$)</label>
          <input
            type="number"
            value={caixa}
            onChange={(e) => setCaixa(parseFloat(e.target.value) || 0)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
        </div>
      </div>

      {/* Results */}
      <div className="space-y-3 rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">EBITDA Anual</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(result.ebitda_anual)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Múltiplo EV/EBITDA</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">{result.multiplo_ev_ebitda}x</span>
        </div>
        <hr className="border-gray-200 dark:border-gray-700" />
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">Enterprise Value (EV)</span>
          <span className="font-bold text-blue-600">{formatCurrency(result.enterprise_value)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">(-) Dívida Líquida</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">{formatCurrency(result.divida_liquida)}</span>
        </div>
        <hr className="border-gray-200 dark:border-gray-700" />
        <div className="flex justify-between">
          <span className="font-semibold text-gray-900 dark:text-gray-100">Equity Value</span>
          <span className="text-xl font-bold text-green-600">{formatCurrency(result.equity_value)}</span>
        </div>
      </div>
    </div>
  );
}
