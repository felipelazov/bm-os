'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Filter, Loader2, Trash2, Pencil, ArrowUpDown, ArrowUpCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { getTransactions, createTransactionWithTenant, updateTransaction, deleteTransaction } from '@/services/financial/financial.service';
import { getCategories } from '@/services/dre/dre.service';
import { classifyTransaction } from '@/services/financial/classifier';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Modal } from '@/components/ui/modal';
import { toast } from '@/components/ui/toast';
import { Pagination } from '@/components/ui/pagination';
import { useSort } from '@/hooks/use-sort';
import { usePagination } from '@/hooks/use-pagination';
import type { Transaction, TransactionStatus } from '@/types/financial.types';
import type { DreCategory } from '@/types/dre.types';

const statusConfig: Record<TransactionStatus, { label: string; color: string }> = {
  pending: { label: 'A Receber', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-400' },
  paid: { label: 'Pago', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-400' },
  received: { label: 'Recebido', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-400' },
  overdue: { label: 'Atrasado', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-400' },
  cancelled: { label: 'Cancelado', color: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400' },
};

export default function ContasReceberPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | TransactionStatus>('all');
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [dreCategories, setDreCategories] = useState<DreCategory[]>([]);
  const [newTransaction, setNewTransaction] = useState({
    description: '',
    value: 0,
    due_date: '',
    notes: '',
    dre_category_id: '',
  });
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editForm, setEditForm] = useState({ description: '', value: 0, due_date: '', notes: '', dre_category_id: '' });
  const [saving, setSaving] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  // Confirm dialog
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    type: string;
    data: Transaction | null;
    loading: boolean;
  }>({ open: false, type: '', data: null, loading: false });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [data, cats] = await Promise.all([
        getTransactions({ type: 'income' }),
        getCategories(),
      ]);
      setTransactions(data);
      setDreCategories(cats);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar receitas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const suggestDreCategory = useCallback((description: string) => {
    if (!description.trim() || dreCategories.length === 0) return '';
    const result = classifyTransaction(
      { date: '', description, value: 0, type: 'income', document_number: null, raw_data: '' },
      [],
      dreCategories
    );
    return result.suggested_category_id ?? '';
  }, [dreCategories]);

  const handleDescriptionChange = (description: string) => {
    const suggested = suggestDreCategory(description);
    setNewTransaction((prev) => ({
      ...prev,
      description,
      dre_category_id: suggested || prev.dre_category_id,
    }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      const dreCatId = newTransaction.dre_category_id || null;
      await createTransactionWithTenant({
        type: 'income',
        status: 'pending',
        source: 'manual',
        description: newTransaction.description,
        value: newTransaction.value,
        date: new Date().toLocaleDateString('en-CA'),
        due_date: newTransaction.due_date,
        paid_date: null,
        category_id: null,
        dre_category_id: dreCatId,
        bank_name: null,
        document_number: null,
        notes: newTransaction.notes || null,
        is_classified: !!dreCatId,
        import_batch_id: null,
      });
      toast.success('Receita criada com sucesso');
      setShowForm(false);
      setNewTransaction({ description: '', value: 0, due_date: '', notes: '', dre_category_id: '' });
      await fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar receita');
    } finally {
      setCreating(false);
    }
  };

  const handleMarkReceived = async (id: string) => {
    if (markingId) return;
    setMarkingId(id);
    try {
      await updateTransaction(id, {
        status: 'received',
        paid_date: new Date().toLocaleDateString('en-CA'),
      });
      toast.success('Receita marcada como recebida');
      await fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar status');
    } finally {
      setMarkingId(null);
    }
  };

  const handleDelete = (transaction: Transaction) => {
    setConfirmState({ open: true, type: 'delete', data: transaction, loading: false });
  };

  const handleConfirmDelete = async () => {
    if (!confirmState.data) return;
    setConfirmState(prev => ({ ...prev, loading: true }));
    try {
      await deleteTransaction(confirmState.data.id);
      toast.success('Receita excluída com sucesso');
      setConfirmState({ open: false, type: '', data: null, loading: false });
      await fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir receita');
      setConfirmState(prev => ({ ...prev, loading: false }));
    }
  };

  const openEdit = (t: Transaction) => {
    setEditingTransaction(t);
    setEditForm({
      description: t.description,
      value: t.value,
      due_date: t.due_date || '',
      notes: t.notes || '',
      dre_category_id: t.dre_category_id || '',
    });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;
    try {
      setSaving(true);
      const dreCatId = editForm.dre_category_id || null;
      await updateTransaction(editingTransaction.id, {
        description: editForm.description,
        value: editForm.value,
        due_date: editForm.due_date || null,
        notes: editForm.notes || null,
        dre_category_id: dreCatId,
        is_classified: !!dreCatId,
      });
      toast.success('Receita atualizada com sucesso');
      setEditingTransaction(null);
      await fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao editar receita');
    } finally {
      setSaving(false);
    }
  };

  const filtered = filter === 'all'
    ? transactions
    : transactions.filter((t) => t.status === filter);

  const { sorted: sortedTransactions, sort, toggleSort } = useSort<Transaction>(filtered, { key: 'due_date', direction: 'asc' });
  const { items: paginatedTransactions, currentPage, totalPages, totalItems, pageSize, goToPage } = usePagination<Transaction>(sortedTransactions);

  const totalPending = transactions
    .filter((t) => t.status === 'pending')
    .reduce((s, t) => s + t.value, 0);
  const totalOverdue = transactions
    .filter((t) => t.status === 'overdue')
    .reduce((s, t) => s + t.value, 0);
  const totalReceived = transactions
    .filter((t) => t.status === 'received')
    .reduce((s, t) => s + t.value, 0);

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Contas a Receber</h1>
          <p className="text-gray-500 dark:text-gray-400">Gerencie suas receitas e recebimentos</p>
        </div>
        <div className="flex gap-2">
          <a
            href="/financeiro/importar"
            className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Importar Extrato
          </a>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Nova Receita
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950 p-3 text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      {/* Form nova receita */}
      {showForm && (
        <form onSubmit={handleCreate} className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 p-6">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Nova Receita</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descrição</label>
              <input
                type="text"
                value={newTransaction.description}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                placeholder="Ex: NF 1234 - Consultoria"
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-100"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={newTransaction.value || ''}
                onChange={(e) => setNewTransaction({ ...newTransaction, value: parseFloat(e.target.value) || 0 })}
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-100"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Vencimento</label>
              <input
                type="date"
                value={newTransaction.due_date}
                onChange={(e) => setNewTransaction({ ...newTransaction, due_date: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-100"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cat. DRE</label>
              <select
                value={newTransaction.dre_category_id}
                onChange={(e) => setNewTransaction({ ...newTransaction, dre_category_id: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-100"
              >
                <option value="">Sem categoria</option>
                {dreCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cliente/Obs</label>
              <input
                type="text"
                value={newTransaction.notes}
                onChange={(e) => setNewTransaction({ ...newTransaction, notes: e.target.value })}
                placeholder="Opcional"
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-100"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
              Cancelar
            </button>
            <button type="submit" disabled={creating} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {creating ? 'Salvando...' : 'Criar Receita'}
            </button>
          </div>
        </form>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950 p-4">
          <p className="text-sm text-yellow-700 dark:text-yellow-400">A Receber</p>
          <p className="mt-1 text-xl font-bold text-yellow-800 dark:text-yellow-300">{formatCurrency(totalPending)}</p>
        </div>
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 p-4">
          <p className="text-sm text-red-700 dark:text-red-400">Atrasados</p>
          <p className="mt-1 text-xl font-bold text-red-800 dark:text-red-300">{formatCurrency(totalOverdue)}</p>
        </div>
        <div className="rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 p-4">
          <p className="text-sm text-green-700 dark:text-green-400">Recebidos</p>
          <p className="mt-1 text-xl font-bold text-green-800 dark:text-green-300">{formatCurrency(totalReceived)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-gray-400" />
        {(['all', 'pending', 'overdue', 'received'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              filter === f
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            )}
          >
            {f === 'all' ? 'Todas' : statusConfig[f].label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                <button onClick={() => toggleSort('description')} className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-200">
                  Descrição
                  {sort?.key === 'description' && <ArrowUpDown className="h-3 w-3" />}
                </button>
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400">
                <button onClick={() => toggleSort('value')} className="ml-auto flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-200">
                  Valor
                  {sort?.key === 'value' && <ArrowUpDown className="h-3 w-3" />}
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">
                <button onClick={() => toggleSort('due_date')} className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-200">
                  Vencimento
                  {sort?.key === 'due_date' && <ArrowUpDown className="h-3 w-3" />}
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Cat. DRE</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Origem</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">
                <button onClick={() => toggleSort('status')} className="flex items-center gap-1 mx-auto hover:text-gray-900 dark:hover:text-gray-200">
                  Status
                  {sort?.key === 'status' && <ArrowUpDown className="h-3 w-3" />}
                </button>
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-0">
                  <EmptyState
                    icon={ArrowUpCircle}
                    title="Nenhuma receita encontrada"
                    description="Adicione sua primeira receita"
                    actionLabel="Nova Receita"
                    onAction={() => setShowForm(true)}
                    className="border-0 rounded-none"
                  />
                </td>
              </tr>
            ) : (
              paginatedTransactions.map((t) => (
                <tr key={t.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{t.description}</div>
                    {t.notes && <div className="text-xs text-gray-500 dark:text-gray-400">{t.notes}</div>}
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium tabular-nums text-green-600 dark:text-green-400">
                    {formatCurrency(t.value)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{t.due_date ? formatDate(t.due_date) : '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    {t.dre_category_id ? dreCategories.find((c) => c.id === t.dre_category_id)?.name ?? '—' : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 text-xs text-gray-500 dark:text-gray-400">
                      {t.source === 'manual' ? 'Manual' : 'Importado'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', statusConfig[t.status].color)}>
                      {statusConfig[t.status].label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {t.status === 'pending' && (
                        <button
                          onClick={() => handleMarkReceived(t.id)}
                          disabled={markingId === t.id}
                          className="rounded bg-green-50 dark:bg-green-950 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900 disabled:opacity-50"
                        >
                          Marcar Recebido
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(t)}
                        title="Editar"
                        className="rounded p-1.5 text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(t)}
                        title="Excluir"
                        className="rounded p-1.5 text-gray-400 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-600 dark:hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={goToPage}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmState.open}
        onCancel={() => setConfirmState({ open: false, type: '', data: null, loading: false })}
        onConfirm={handleConfirmDelete}
        loading={confirmState.loading}
        title="Excluir receita"
        message={`Tem certeza que deseja excluir "${confirmState.data?.description}"?`}
        confirmLabel="Excluir"
      />

      {/* Modal Editar */}
      <Modal
        open={!!editingTransaction}
        onClose={() => setEditingTransaction(null)}
        title="Editar Receita"
        size="md"
      >
        <form onSubmit={handleEdit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descrição</label>
              <input
                type="text"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-100"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editForm.value || ''}
                onChange={(e) => setEditForm({ ...editForm, value: parseFloat(e.target.value) || 0 })}
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-100"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Vencimento</label>
              <input
                type="date"
                value={editForm.due_date}
                onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Cat. DRE</label>
              <select
                value={editForm.dre_category_id}
                onChange={(e) => setEditForm({ ...editForm, dre_category_id: e.target.value })}
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-100"
              >
                <option value="">Sem categoria</option>
                {dreCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Observações</label>
              <input
                type="text"
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="Opcional"
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-100"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setEditingTransaction(null)} className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
