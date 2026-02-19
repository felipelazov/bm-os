'use client';

import { useState, useCallback, useEffect } from 'react';
import { Upload, FileText, Check, AlertCircle, ChevronRight, Loader2 } from 'lucide-react';
import { parseExtrato, parseExtratoXlsx, detectFormat } from '@/services/financial/extrato-parser';
import { classifyBatch } from '@/services/financial/classifier';
import { getCategories } from '@/services/dre/dre.service';
import { createTransactionsBatch, createImportBatch, getTenantId } from '@/services/financial/financial.service';
import type { ParsedTransaction, ClassificationResult, ImportFileFormat } from '@/types/financial.types';
import type { DreCategory } from '@/types/dre.types';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { DRE_CATEGORY_LABELS } from '@/lib/constants';

type Step = 'upload' | 'review' | 'confirm';

export default function ImportarExtratoPage() {
  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [format, setFormat] = useState<ImportFileFormat | null>(null);
  const [results, setResults] = useState<ClassificationResult[]>([]);
  const [categories, setCategories] = useState<DreCategory[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  const processFile = useCallback(async (file: File) => {
    try {
      const detectedFormat = detectFormat(file.name);

      let result: { format: typeof detectedFormat; transactions: import('@/types/financial.types').ParsedTransaction[] };

      if (detectedFormat === 'xlsx') {
        const buffer = await file.arrayBuffer();
        result = parseExtratoXlsx(buffer);
      } else {
        const content = await file.text();
        result = parseExtrato(content, file.name);
      }

      const classified = classifyBatch(result.transactions, [], categories);

      setFileName(file.name);
      setFormat(result.format);
      setResults(classified);
      setStep('review');
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar arquivo');
    }
  }, [categories]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  const updateCategory = (index: number, categoryId: string) => {
    const updated = [...results];
    const category = categories.find((c) => c.id === categoryId);
    updated[index] = {
      ...updated[index],
      suggested_category_id: categoryId || null,
      suggested_category_name: category?.name ?? null,
      confidence: categoryId ? 1 : 0,
    };
    setResults(updated);
  };

  const handleConfirmImport = async () => {
    try {
      setSaving(true);
      setError('');

      const tenantId = await getTenantId();

      // Cria o import batch
      const totalIncome = results
        .filter((r) => r.transaction.type === 'income')
        .reduce((s, r) => s + r.transaction.value, 0);
      const totalExpense = results
        .filter((r) => r.transaction.type === 'expense')
        .reduce((s, r) => s + r.transaction.value, 0);
      const classifiedCount = results.filter((r) => r.suggested_category_id).length;

      const batch = await createImportBatch({
        tenant_id: tenantId,
        file_name: fileName,
        format: format!,
        bank_name: null,
        total_transactions: results.length,
        classified_count: classifiedCount,
        unclassified_count: results.length - classifiedCount,
        total_income: totalIncome,
        total_expense: totalExpense,
      });

      // Cria as transações
      const transactions = results.map((r) => ({
        tenant_id: tenantId,
        type: r.transaction.type as 'income' | 'expense',
        status: 'pending' as const,
        source: (`import_${format}` as 'import_csv' | 'import_ofx' | 'import_xml' | 'import_xlsx'),
        description: r.transaction.description,
        value: r.transaction.value,
        date: r.transaction.date,
        due_date: r.transaction.date,
        paid_date: null,
        category_id: null,
        dre_category_id: r.suggested_category_id,
        bank_name: null,
        document_number: r.transaction.document_number,
        notes: null,
        is_classified: !!r.suggested_category_id,
        import_batch_id: batch.id,
      }));

      await createTransactionsBatch(transactions);
      setStep('confirm');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar importação');
    } finally {
      setSaving(false);
    }
  };

  const classifiedCount = results.filter((r) => r.suggested_category_id).length;
  const totalIncome = results
    .filter((r) => r.transaction.type === 'income')
    .reduce((s, r) => s + r.transaction.value, 0);
  const totalExpense = results
    .filter((r) => r.transaction.type === 'expense')
    .reduce((s, r) => s + r.transaction.value, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Importar Extrato</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Suba seu extrato bancário (CSV, OFX, XML ou XLSX) para classificação automática
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">{error}</div>
      )}

      {/* Steps indicator */}
      <div className="flex items-center gap-2">
        {(['upload', 'review', 'confirm'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
                step === s
                  ? 'bg-blue-600 text-white'
                  : results.length > 0 && i < ['upload', 'review', 'confirm'].indexOf(step)
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
              )}
            >
              {i + 1}
            </div>
            <span className={cn('text-sm', step === s ? 'font-medium text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500')}>
              {s === 'upload' ? 'Upload' : s === 'review' ? 'Revisar' : 'Confirmar'}
            </span>
            {i < 2 && <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600" />}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            'flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors',
            isDragging ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800'
          )}
        >
          <Upload className="mb-4 h-12 w-12 text-gray-400 dark:text-gray-500" />
          <p className="mb-2 text-lg font-medium text-gray-900 dark:text-gray-100">
            Arraste o arquivo ou clique para selecionar
          </p>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Formatos aceitos: CSV, OFX, XML, XLSX
          </p>
          <label className="cursor-pointer rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700">
            Selecionar Arquivo
            <input
              type="file"
              accept=".csv,.ofx,.qfx,.xml,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
        </div>
      )}

      {/* Step 2: Review */}
      {step === 'review' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">Arquivo</p>
              <p className="mt-1 flex items-center gap-2 font-medium text-gray-900 dark:text-gray-100">
                <FileText className="h-4 w-4" />
                {fileName}
              </p>
              <p className="text-xs text-gray-400 uppercase dark:text-gray-500">{format}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">Transações</p>
              <p className="mt-1 text-xl font-bold text-gray-900 dark:text-gray-100">{results.length}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{classifiedCount} classificadas</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Entradas</p>
              <p className="mt-1 text-xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Saídas</p>
              <p className="mt-1 text-xl font-bold text-red-600">{formatCurrency(totalExpense)}</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Descrição</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400">Valor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Categoria DRE</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">Status</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700">
                    <td className="px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100">
                      {formatDate(r.transaction.date)}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-700 dark:text-gray-300 max-w-md">
                      {r.transaction.description}
                    </td>
                    <td className={cn(
                      'px-4 py-2.5 text-right text-sm font-medium tabular-nums',
                      r.transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                    )}>
                      {r.transaction.type === 'income' ? '+' : '-'}{formatCurrency(r.transaction.value)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        r.transaction.type === 'income'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      )}>
                        {r.transaction.type === 'income' ? 'Entrada' : 'Saída'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <select
                        value={r.suggested_category_id ?? ''}
                        onChange={(e) => updateCategory(idx, e.target.value)}
                        className={cn(
                          'w-full rounded border px-2 py-1 text-xs',
                          r.suggested_category_id
                            ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20 dark:text-green-300'
                            : 'border-orange-300 bg-orange-50 dark:border-orange-700 dark:bg-orange-900/20 dark:text-orange-300'
                        )}
                      >
                        <option value="">Sem categoria</option>
                        {Object.entries(DRE_CATEGORY_LABELS).map(([key, label]) => {
                          const cats = categories.filter((c) => c.type === key);
                          return cats.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {label} - {cat.name}
                            </option>
                          ));
                        })}
                      </select>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {r.suggested_category_id ? (
                        <Check className="mx-auto h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="mx-auto h-4 w-4 text-orange-400" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => { setStep('upload'); setResults([]); }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Voltar
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={saving}
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Importando...
                </span>
              ) : (
                `Confirmar Importação (${classifiedCount}/${results.length} classificadas)`
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 'confirm' && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-green-200 bg-green-50 py-12 dark:border-green-800 dark:bg-green-900/20">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
            <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Importação Concluída!</h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {results.length} transações importadas e {classifiedCount} classificadas automaticamente.
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            As transações estão disponíveis em Contas a Pagar/Receber e contribuem para o DRE.
          </p>
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => { setStep('upload'); setResults([]); setFileName(''); }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-white dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Importar Outro
            </button>
            <a
              href="/financeiro/contas-pagar"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Ver Contas a Pagar
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
