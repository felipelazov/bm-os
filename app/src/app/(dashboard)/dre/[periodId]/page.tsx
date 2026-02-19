'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DreTable } from '@/components/dre/dre-table';
import { DreSummaryCard } from '@/components/dre/dre-summary-card';
import { ValuationPanel } from '@/components/dre/valuation-panel';
import { DreEntryForm } from '@/components/dre/dre-entry-form';
import { calculateDre } from '@/services/dre/dre-calculator';
import { getPeriodById, getCategories, getEntries, upsertEntries, deleteEntry, closePeriod } from '@/services/dre/dre.service';
import { getTransactions } from '@/services/financial/financial.service';
import type { DreReport, DreEntry, DreCategory, DrePeriod } from '@/types/dre.types';
import type { Transaction } from '@/types/financial.types';
import { exportDrePdf } from '@/services/dre/dre-pdf-export';
import { ArrowLeft, Edit3, Eye, Lock, Loader2, Trash2, Download } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/formatters';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/toast';

export default function PeriodDetailPage() {
  const params = useParams();
  const router = useRouter();
  const periodId = params.periodId as string;

  const [period, setPeriod] = useState<DrePeriod | null>(null);
  const [categories, setCategories] = useState<DreCategory[]>([]);
  const [entries, setEntries] = useState<DreEntry[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closeConfirm, setCloseConfirm] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [periodData, categoriesData, entriesData] = await Promise.all([
        getPeriodById(periodId),
        getCategories(),
        getEntries(periodId),
      ]);

      if (!periodData) {
        setError('Período não encontrado');
        return;
      }

      // Busca transações do período filtradas por data
      const txData = await getTransactions({
        startDate: periodData.start_date,
        endDate: periodData.end_date,
      });

      // Regime de caixa: só entra no DRE quando efetivamente pago/recebido
      const classifiedTx = txData.filter(
        (t) => t.is_classified && t.dre_category_id && (t.status === 'paid' || t.status === 'received')
      );

      setPeriod(periodData);
      setCategories(categoriesData);
      setEntries(entriesData);
      setTransactions(classifiedTx);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, [periodId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveEntries = async (newEntries: { category_id: string; description: string; value: number }[]) => {
    try {
      setSaving(true);
      const toUpsert = newEntries.map((e) => ({
        period_id: periodId,
        category_id: e.category_id,
        description: e.description,
        value: e.value,
      }));
      await upsertEntries(toUpsert);
      await fetchData();
      setMode('view');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar lançamentos');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    try {
      await deleteEntry(entryId);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir lançamento');
    }
  };

  const handleClosePeriod = () => {
    setCloseConfirm(true);
  };

  const handleConfirmClosePeriod = async () => {
    setClosing(true);
    try {
      await closePeriod(periodId);
      toast.success('Período fechado com sucesso');
      setCloseConfirm(false);
      await fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao fechar período');
    } finally {
      setClosing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!period) {
    return (
      <div className="flex h-64 flex-col items-center justify-center">
        <p className="text-lg text-gray-500 dark:text-gray-400">{error || 'Período não encontrado'}</p>
        <Link href="/dre" className="mt-4 text-blue-600 hover:underline">Voltar para períodos</Link>
      </div>
    );
  }

  const report: DreReport = calculateDre(period, entries, categories, transactions);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dre"
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{period.name}</h1>
            <p className="text-gray-500 dark:text-gray-400">DRE — Período {period.type === 'monthly' ? 'Mensal' : period.type === 'quarterly' ? 'Trimestral' : 'Anual'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => exportDrePdf(report)}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <Download className="h-4 w-4" /> Exportar PDF
          </button>
          {!period.is_closed && (
            <>
              <button
                onClick={() => setMode(mode === 'view' ? 'edit' : 'view')}
                className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                {mode === 'view' ? (
                  <>
                    <Edit3 className="h-4 w-4" /> Editar Lançamentos
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4" /> Ver DRE
                  </>
                )}
              </button>
              <button
                onClick={handleClosePeriod}
                disabled={closing}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                <Lock className="h-4 w-4" />
                {closing ? 'Fechando...' : 'Fechar Período'}
              </button>
            </>
          )}
          {period.is_closed && (
            <span className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-2 text-sm font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
              <Lock className="h-4 w-4" /> Período Fechado
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">{error}</div>
      )}

      {mode === 'view' ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <DreSummaryCard title="Receita Líquida" value={report.receita_liquida} />
            <DreSummaryCard title="EBITDA" value={report.ebitda} percentage={report.margem_ebitda} />
            <DreSummaryCard
              title="Margem EBITDA"
              value={report.margem_ebitda}
              isCurrency={false}
            />
            <DreSummaryCard title="Lucro Líquido" value={report.lucro_liquido} percentage={report.margem_liquida} />
          </div>

          {/* DRE Table */}
          <DreTable report={report} />

          {/* Indicador de fontes */}
          {(entries.length > 0 || transactions.length > 0) && (
            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                {entries.length} lançamento{entries.length !== 1 ? 's' : ''} manual{entries.length !== 1 ? 'is' : ''}
              </span>
              <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                {transactions.length} transação{transactions.length !== 1 ? 'ões' : ''} automática{transactions.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Lançamentos manuais */}
          {entries.length > 0 && !period.is_closed && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Lançamentos Manuais ({entries.length})</h3>
              <div className="space-y-2">
                {entries.map((entry) => {
                  const cat = categories.find((c) => c.id === entry.category_id);
                  return (
                    <div key={entry.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 dark:border-gray-700">
                      <div>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{entry.description}</span>
                        {cat && <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">({cat.name})</span>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">{formatCurrency(entry.value)}</span>
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:text-gray-500 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Transações automáticas agrupadas por categoria DRE */}
          {transactions.length > 0 && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-6 dark:border-green-800 dark:bg-green-950">
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Transações Automáticas ({transactions.length})</h3>
              <div className="space-y-4">
                {Object.entries(
                  transactions.reduce<Record<string, Transaction[]>>((acc, t) => {
                    const cat = categories.find((c) => c.id === t.dre_category_id);
                    const key = cat?.name ?? 'Sem categoria';
                    if (!acc[key]) acc[key] = [];
                    acc[key].push(t);
                    return acc;
                  }, {})
                ).map(([catName, txs]) => (
                  <div key={catName}>
                    <p className="mb-1 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{catName}</p>
                    <div className="space-y-1">
                      {txs.map((t) => (
                        <div key={t.id} className="flex items-center justify-between rounded-lg border border-green-100 bg-white px-4 py-2 dark:border-green-900 dark:bg-gray-800">
                          <span className="text-sm text-gray-900 dark:text-gray-100">{t.description}</span>
                          <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-gray-100">{formatCurrency(t.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Valuation */}
          <ValuationPanel ebitdaAnual={report.ebitda * (period.type === 'monthly' ? 12 : period.type === 'quarterly' ? 4 : 1)} />
        </>
      ) : (
        /* Edit mode */
        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Adicionar Lançamentos</h2>
          <DreEntryForm
            categories={categories}
            onSubmit={handleSaveEntries}
            isSubmitting={saving}
          />
        </div>
      )}

      <ConfirmDialog
        open={closeConfirm}
        onCancel={() => setCloseConfirm(false)}
        onConfirm={handleConfirmClosePeriod}
        loading={closing}
        title="Fechar período"
        message="Tem certeza que deseja fechar este período? Após fechar, não será possível editar os lançamentos."
        confirmLabel="Fechar Período"
        variant="warning"
      />
    </div>
  );
}
