'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Calendar, Lock, Unlock, Loader2, Trash2 } from 'lucide-react';
import type { DrePeriod, PeriodType } from '@/types/dre.types';
import { formatDate } from '@/lib/formatters';
import { getPeriods, createPeriod, deletePeriod } from '@/services/dre/dre.service';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/toast';
import Link from 'next/link';

export default function DrePage() {
  const [periods, setPeriods] = useState<DrePeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newPeriod, setNewPeriod] = useState({
    name: '',
    type: 'monthly' as PeriodType,
    start_date: '',
    end_date: '',
  });
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    period: DrePeriod | null;
    loading: boolean;
  }>({ open: false, period: null, loading: false });

  const fetchPeriods = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getPeriods();
      setPeriods(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar períodos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPeriods();
  }, [fetchPeriods]);

  const handleCreatePeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      await createPeriod(newPeriod);
      setShowForm(false);
      setNewPeriod({ name: '', type: 'monthly', start_date: '', end_date: '' });
      await fetchPeriods();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar período');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (e: React.MouseEvent, period: DrePeriod) => {
    e.preventDefault(); // evita navegar pelo Link
    e.stopPropagation();
    setDeleteConfirm({ open: true, period, loading: false });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm.period) return;
    setDeleteConfirm(prev => ({ ...prev, loading: true }));
    try {
      await deletePeriod(deleteConfirm.period.id);
      toast.success('Período excluído com sucesso');
      setDeleteConfirm({ open: false, period: null, loading: false });
      await fetchPeriods();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir período');
      setDeleteConfirm(prev => ({ ...prev, loading: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">DRE</h1>
          <p className="text-gray-500 dark:text-gray-400">Demonstração do Resultado do Exercício</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Novo Período
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-400">{error}</div>
      )}

      {showForm && (
        <form
          onSubmit={handleCreatePeriod}
          className="rounded-xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-900/30"
        >
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Novo Período</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome</label>
              <input
                type="text"
                value={newPeriod.name}
                onChange={(e) => setNewPeriod({ ...newPeriod, name: e.target.value })}
                placeholder="Ex: Março 2026"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo</label>
              <select
                value={newPeriod.type}
                onChange={(e) => setNewPeriod({ ...newPeriod, type: e.target.value as PeriodType })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              >
                <option value="monthly">Mensal</option>
                <option value="quarterly">Trimestral</option>
                <option value="annual">Anual</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Início</label>
              <input
                type="date"
                value={newPeriod.start_date}
                onChange={(e) => setNewPeriod({ ...newPeriod, start_date: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fim</label>
              <input
                type="date"
                value={newPeriod.end_date}
                onChange={(e) => setNewPeriod({ ...newPeriod, end_date: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                required
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? 'Criando...' : 'Criar Período'}
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {periods.map((period) => (
          <Link
            key={period.id}
            href={`/dre/${period.id}`}
            className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-5 transition-colors hover:border-blue-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600"
          >
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/50">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{period.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(period.start_date)} — {formatDate(period.end_date)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                {period.type === 'monthly' ? 'Mensal' : period.type === 'quarterly' ? 'Trimestral' : 'Anual'}
              </span>
              {period.is_closed ? (
                <span className="flex items-center gap-1 text-sm text-green-600 dark:text-green-400">
                  <Lock className="h-4 w-4" /> Fechado
                </span>
              ) : (
                <span className="flex items-center gap-1 text-sm text-amber-600 dark:text-amber-400">
                  <Unlock className="h-4 w-4" /> Aberto
                </span>
              )}
              <button
                onClick={(e) => handleDelete(e, period)}
                title="Excluir período"
                className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </Link>
        ))}
      </div>

      {periods.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 py-12 dark:border-gray-600">
          <Calendar className="mb-3 h-12 w-12 text-gray-300 dark:text-gray-500" />
          <p className="text-lg font-medium text-gray-500 dark:text-gray-400">Nenhum período criado</p>
          <p className="text-sm text-gray-400 dark:text-gray-500">Clique em &quot;Novo Período&quot; para começar</p>
        </div>
      )}

      <ConfirmDialog
        open={deleteConfirm.open}
        onCancel={() => setDeleteConfirm({ open: false, period: null, loading: false })}
        onConfirm={handleConfirmDelete}
        loading={deleteConfirm.loading}
        title="Excluir período"
        message={
          deleteConfirm.period?.is_closed
            ? `Este período está FECHADO. Tem certeza que deseja excluir "${deleteConfirm.period.name}"? Todos os lançamentos serão perdidos.`
            : `Tem certeza que deseja excluir "${deleteConfirm.period?.name ?? ''}"?`
        }
        confirmLabel="Excluir"
        variant="danger"
      />
    </div>
  );
}
