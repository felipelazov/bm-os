'use client';

import { useState } from 'react';
import { DRE_CATEGORY_LABELS } from '@/lib/constants';
import { Save, Plus } from 'lucide-react';

export default function DreSettingsPage() {
  const [companyInfo, setCompanyInfo] = useState({
    sector: 'servicos',
    fiscal_regime: 'lucro_presumido',
    currency: 'BRL',
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Configurações DRE</h1>
        <p className="text-gray-500 dark:text-gray-400">Personalize categorias e parâmetros do DRE</p>
      </div>

      {/* Informações da empresa */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Informações da Empresa</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Setor</label>
            <select
              value={companyInfo.sector}
              onChange={(e) => setCompanyInfo({ ...companyInfo, sector: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="tecnologia">Tecnologia</option>
              <option value="saas">SaaS</option>
              <option value="varejo">Varejo</option>
              <option value="industria">Indústria</option>
              <option value="servicos">Serviços</option>
              <option value="saude">Saúde</option>
              <option value="educacao">Educação</option>
              <option value="financeiro">Financeiro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Regime Fiscal</label>
            <select
              value={companyInfo.fiscal_regime}
              onChange={(e) => setCompanyInfo({ ...companyInfo, fiscal_regime: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="simples_nacional">Simples Nacional</option>
              <option value="lucro_presumido">Lucro Presumido</option>
              <option value="lucro_real">Lucro Real</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Moeda</label>
            <select
              value={companyInfo.currency}
              onChange={(e) => setCompanyInfo({ ...companyInfo, currency: e.target.value })}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            >
              <option value="BRL">BRL (R$)</option>
              <option value="USD">USD ($)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Categorias DRE */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Categorias do DRE</h2>
          {/* TODO: implementar criação de novas categorias */}
        </div>
        <div className="space-y-2">
          {Object.entries(DRE_CATEGORY_LABELS).map(([key, label]) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/50"
            >
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{key}</p>
              </div>
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                Ativo
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* TODO: implementar persistência de configurações */}
    </div>
  );
}
