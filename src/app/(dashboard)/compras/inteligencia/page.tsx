'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Plus, X, Download, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PURCHASE_CATEGORIES } from '@/lib/constants';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/toast';
import { usePagination } from '@/hooks/use-pagination';
import { Pagination } from '@/components/ui/pagination';
import { PriceTrendCard } from '@/components/compras/price-trend-card';
import { getItemPriceStats, getQuotesByItem, createQuote, deleteQuote } from '@/services/compras/quotes.service';
import { getItems, createItem, updateItem, seedItems, getItemCount } from '@/services/compras/items.service';
import type { ItemPriceStats, PurchaseQuote, PurchaseItem } from '@/types/compras.types';

export default function InteligenciaPage() {
  const [stats, setStats] = useState<ItemPriceStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [isEmpty, setIsEmpty] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Item detail
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<PurchaseQuote[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);

  // Manage items modal
  const [showManage, setShowManage] = useState(false);
  const [allItems, setAllItems] = useState<PurchaseItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // New item form
  const [showNewItem, setShowNewItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('un');
  const [newItemBrand, setNewItemBrand] = useState('');
  const [savingItem, setSavingItem] = useState(false);

  // New quote form
  const [showNewQuote, setShowNewQuote] = useState(false);
  const [quotePrice, setQuotePrice] = useState('');
  const [quoteQty, setQuoteQty] = useState('');
  const [quoteBrand, setQuoteBrand] = useState('');
  const [quoteSource, setQuoteSource] = useState('');
  const [savingQuote, setSavingQuote] = useState(false);

  // Confirm dialog
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    data: string | null;
    loading: boolean;
  }>({ open: false, data: null, loading: false });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const count = await getItemCount();
      setIsEmpty(count === 0);
      const data = await getItemPriceStats();
      setStats(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSeed = async () => {
    try {
      setSeeding(true);
      setError('');
      const count = await seedItems();
      setError('');
      toast.success(`${count} itens importados com sucesso!`);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao importar');
    } finally {
      setSeeding(false);
    }
  };

  const handleSelectItem = async (itemId: string) => {
    try {
      setSelectedItemId(itemId);
      setLoadingQuotes(true);
      const data = await getQuotesByItem(itemId);
      setQuotes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar cotações');
    } finally {
      setLoadingQuotes(false);
    }
  };

  const handleManageItems = async () => {
    setShowManage(true);
    setLoadingItems(true);
    try {
      const data = await getItems({ activeOnly: false });
      setAllItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar itens');
    } finally {
      setLoadingItems(false);
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingItem(true);
      await createItem({
        name: newItemName,
        category: newItemCategory,
        unit: newItemUnit,
        brand: newItemBrand || null,
      });
      setShowNewItem(false);
      setNewItemName('');
      setNewItemCategory('');
      setNewItemUnit('un');
      setNewItemBrand('');
      const data = await getItems({ activeOnly: false });
      setAllItems(data);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar item');
    } finally {
      setSavingItem(false);
    }
  };

  const handleToggleItem = async (item: PurchaseItem) => {
    try {
      await updateItem(item.id, { is_active: !item.is_active });
      setAllItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_active: !i.is_active } : i))
      );
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar item');
    }
  };

  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId) return;
    try {
      setSavingQuote(true);
      await createQuote({
        item_id: selectedItemId,
        supplier_id: null,
        unit_price: parseFloat(quotePrice),
        quantity: quoteQty ? parseFloat(quoteQty) : null,
        brand: quoteBrand || null,
        quote_date: new Date().toISOString().split('T')[0],
        source: quoteSource || null,
        notes: null,
      });
      setShowNewQuote(false);
      setQuotePrice('');
      setQuoteQty('');
      setQuoteBrand('');
      setQuoteSource('');
      await handleSelectItem(selectedItemId);
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar cotação');
    } finally {
      setSavingQuote(false);
    }
  };

  const handleDeleteQuote = (id: string) => {
    setConfirmState({ open: true, data: id, loading: false });
  };

  const handleConfirmDeleteQuote = async () => {
    if (!confirmState.data) return;
    setConfirmState(prev => ({ ...prev, loading: true }));
    try {
      await deleteQuote(confirmState.data);
      toast.success('Cotação excluída com sucesso');
      setConfirmState({ open: false, data: null, loading: false });
      if (selectedItemId) await handleSelectItem(selectedItemId);
      await fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir cotação');
      setConfirmState(prev => ({ ...prev, loading: false }));
    }
  };

  const filteredStats = filterCategory
    ? stats.filter((s) => s.category === filterCategory)
    : stats;

  const pagination = usePagination(filteredStats, { pageSize: 10 });

  const selectedItem = stats.find((s) => s.item_id === selectedItemId);

  if (loading && stats.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Inteligência de Compras</h1>
          <p className="text-gray-500 dark:text-gray-400">Tendências de preço por item do catálogo</p>
        </div>
        <div className="flex gap-2">
          {isEmpty && (
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="flex items-center gap-2 rounded-lg border border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-950 px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {seeding ? 'Importando...' : 'Importar Catálogo Padrão'}
            </button>
          )}
          <button
            onClick={handleManageItems}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Settings className="h-4 w-4" />
            Gerenciar Itens
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950 p-3 text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      {/* Category Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilterCategory('')}
          className={cn(
            'rounded-full px-3 py-1 text-xs font-medium transition-colors',
            !filterCategory
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          )}
        >
          Todas
        </button>
        {PURCHASE_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              filterCategory === cat
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Price Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Item</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Categoria</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Marca</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Último Preço</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Média 3m</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Variação</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-gray-400">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredStats.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  {stats.length === 0 ? 'Nenhum item cadastrado' : 'Nenhum item nesta categoria'}
                </td>
              </tr>
            ) : (
              pagination.items.map((s) => (
                <PriceTrendCard
                  key={s.item_id}
                  stats={s}
                  onClick={() => handleSelectItem(s.item_id)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {filteredStats.length > 0 && (
        <Pagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          pageSize={pagination.pageSize}
          onPageChange={pagination.goToPage}
        />
      )}

      {/* Item Detail / Quote History */}
      {selectedItemId && selectedItem && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Histórico de Cotações — {selectedItem.item_name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {selectedItem.category} • {selectedItem.quote_count} cotação(ões)
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowNewQuote(true)}
                className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
              >
                <Plus className="h-4 w-4" />
                Nova Cotação
              </button>
              <button
                onClick={() => { setSelectedItemId(null); setQuotes([]); }}
                className="rounded p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* New Quote form */}
          {showNewQuote && (
            <form onSubmit={handleCreateQuote} className="mb-4 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 p-4">
              <div className="grid gap-3 md:grid-cols-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Preço unitário *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={quotePrice}
                    onChange={(e) => setQuotePrice(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Quantidade</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={quoteQty}
                    onChange={(e) => setQuoteQty(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Marca</label>
                  <input
                    type="text"
                    value={quoteBrand}
                    onChange={(e) => setQuoteBrand(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Fonte</label>
                  <input
                    type="text"
                    value={quoteSource}
                    onChange={(e) => setQuoteSource(e.target.value)}
                    placeholder="Mercado, fornecedor..."
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
                  />
                </div>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewQuote(false)}
                  className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingQuote}
                  className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {savingQuote ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          )}

          {loadingQuotes ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : quotes.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">Nenhuma cotação registrada</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Data</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Preço</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Qtd</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Marca</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Fonte</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-400">Fornecedor</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-400"></th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((q) => (
                  <tr key={q.id} className="border-b border-gray-100 dark:border-gray-700">
                    <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(q.quote_date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-3 py-2 text-sm font-medium tabular-nums text-gray-900 dark:text-gray-100">
                      {Number(q.unit_price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                      {q.quantity ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                      {q.brand || '—'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                      {q.source || '—'}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
                      {q.supplier?.name || '—'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => handleDeleteQuote(q.id)}
                        className="rounded p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmState.open}
        onCancel={() => setConfirmState({ open: false, data: null, loading: false })}
        onConfirm={handleConfirmDeleteQuote}
        loading={confirmState.loading}
        title="Excluir cotação"
        message="Tem certeza que deseja excluir esta cotação?"
        confirmLabel="Excluir"
      />

      {/* Manage Items Modal */}
      {showManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-lg rounded-xl bg-white dark:bg-gray-800 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Gerenciar Itens</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowNewItem(true)}
                  className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Novo
                </button>
                <button onClick={() => setShowManage(false)}>
                  <X className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                </button>
              </div>
            </div>

            {showNewItem && (
              <form onSubmit={handleCreateItem} className="border-b border-gray-200 dark:border-gray-700 p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Nome *</label>
                    <input
                      type="text"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Categoria *</label>
                    <select
                      value={newItemCategory}
                      onChange={(e) => setNewItemCategory(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
                      required
                    >
                      <option value="">Selecione...</option>
                      {PURCHASE_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Unidade</label>
                    <input
                      type="text"
                      value={newItemUnit}
                      onChange={(e) => setNewItemUnit(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">Marca</label>
                    <input
                      type="text"
                      value={newItemBrand}
                      onChange={(e) => setNewItemBrand(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
                    />
                  </div>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <button type="button" onClick={() => setShowNewItem(false)} className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300">
                    Cancelar
                  </button>
                  <button type="submit" disabled={savingItem} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                    {savingItem ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </form>
            )}

            <div className="max-h-96 overflow-y-auto p-4">
              {loadingItems ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              ) : allItems.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">Nenhum item cadastrado</p>
              ) : (
                <div className="space-y-1">
                  {allItems.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        'flex items-center justify-between rounded-lg px-3 py-2 text-sm',
                        item.is_active
                          ? 'text-gray-900 dark:text-gray-100'
                          : 'text-gray-400 dark:text-gray-500 line-through'
                      )}
                    >
                      <div>
                        <span className="font-medium">{item.name}</span>
                        <span className="ml-2 text-xs text-gray-400">
                          {item.category} • {item.unit}
                        </span>
                      </div>
                      <button
                        onClick={() => handleToggleItem(item)}
                        className={cn(
                          'rounded px-2 py-1 text-xs font-medium',
                          item.is_active
                            ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                        )}
                      >
                        {item.is_active ? 'Ativo' : 'Inativo'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 p-4">
              <button
                onClick={() => setShowManage(false)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
