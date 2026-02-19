'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Loader2, X, Pencil, Trash2, Search, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getKitItems,
  setKitItems,
} from '@/services/products/products.service';
import { KitItemsEditor } from '@/components/products/kit-items-editor';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/toast';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { useSort } from '@/hooks/use-sort';
import { usePagination } from '@/hooks/use-pagination';
import type { Product, ProductType } from '@/types/products.types';

const TYPE_LABELS: Record<ProductType, string> = {
  avulso: 'Avulso',
  kit: 'Kit',
};

const TYPE_COLORS: Record<ProductType, string> = {
  avulso: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  kit: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
};

function generateSku(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'PRD-';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function ProdutosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  // Confirm dialog
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    type: string;
    data: Product | null;
    loading: boolean;
  }>({ open: false, type: '', data: null, loading: false });

  // Form state
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formType, setFormType] = useState<ProductType>('avulso');
  const [formUnit, setFormUnit] = useState('un');
  const [formCostPrice, setFormCostPrice] = useState('');
  const [formSalePrice, setFormSalePrice] = useState('');
  const [formMinStock, setFormMinStock] = useState('0');

  // Kit items
  const [kitItems, setKitItemsState] = useState<{ item_product_id: string; quantity: number }[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getProducts(false);
      setProducts(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setFormName('');
    setFormSku(generateSku());
    setFormCategory('');
    setFormType('avulso');
    setFormUnit('un');
    setFormCostPrice('');
    setFormSalePrice('');
    setFormMinStock('0');
    setKitItemsState([]);
    setEditingId(null);
  };

  const handleNew = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEdit = async (p: Product) => {
    setEditingId(p.id);
    setFormName(p.name);
    setFormSku(p.sku);
    setFormCategory(p.category);
    setFormType(p.product_type);
    setFormUnit(p.unit);
    setFormCostPrice(p.cost_price?.toString() ?? '');
    setFormSalePrice(p.sale_price?.toString() ?? '');
    setFormMinStock(p.min_stock.toString());

    if (p.product_type === 'kit') {
      try {
        const items = await getKitItems(p.id);
        setKitItemsState(items.map((i) => ({ item_product_id: i.item_product_id, quantity: i.quantity })));
      } catch {
        setKitItemsState([]);
      }
    } else {
      setKitItemsState([]);
    }

    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      const payload = {
        name: formName,
        sku: formSku,
        category: formCategory,
        product_type: formType,
        unit: formUnit,
        cost_price: formCostPrice ? parseFloat(formCostPrice) : null,
        sale_price: formSalePrice ? parseFloat(formSalePrice) : null,
        min_stock: parseInt(formMinStock) || 0,
      };

      let productId: string;
      if (editingId) {
        const updated = await updateProduct(editingId, payload);
        productId = updated.id;
      } else {
        const created = await createProduct(payload);
        productId = created.id;
      }

      if (formType === 'kit') {
        await setKitItems(productId, kitItems);
      }

      toast.success(editingId ? 'Produto atualizado com sucesso' : 'Produto criado com sucesso');
      setShowForm(false);
      resetForm();
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar produto');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (product: Product) => {
    setConfirmState({ open: true, type: 'delete', data: product, loading: false });
  };

  const handleConfirmDelete = async () => {
    if (!confirmState.data) return;
    setConfirmState(prev => ({ ...prev, loading: true }));
    try {
      await deleteProduct(confirmState.data.id);
      toast.success('Produto excluído com sucesso');
      setConfirmState({ open: false, type: '', data: null, loading: false });
      await fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir produto');
      setConfirmState(prev => ({ ...prev, loading: false }));
    }
  };

  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))].sort();

  const filtered = products.filter((p) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!p.name.toLowerCase().includes(term) && !p.sku.toLowerCase().includes(term) && !p.category.toLowerCase().includes(term)) return false;
    }
    if (filterType && p.product_type !== filterType) return false;
    if (filterCategory && p.category !== filterCategory) return false;
    return true;
  });

  const { sorted: sortedProducts, sort, toggleSort } = useSort<Product>(filtered, { key: 'name', direction: 'asc' });
  const { items: paginatedProducts, currentPage, totalPages, totalItems, pageSize, goToPage } = usePagination<Product>(sortedProducts);

  const avulsoProducts = products.filter((p) => p.product_type === 'avulso' && p.is_active);

  if (loading && products.length === 0) {
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Produtos</h1>
          <p className="text-gray-500 dark:text-gray-400">Cadastro de produtos avulsos e kits/cestas</p>
        </div>
        <button
          onClick={handleNew}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Novo Produto
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950 p-3 text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, SKU ou categoria..."
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 pl-10 pr-3 py-2 text-sm dark:text-gray-200"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm dark:text-gray-200"
          >
            <option value="">Todos os tipos</option>
            <option value="avulso">Avulso</option>
            <option value="kit">Kit</option>
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm dark:text-gray-200"
          >
            <option value="">Todas as categorias</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {editingId ? 'Editar Produto' : 'Novo Produto'}
            </h3>
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }}>
              <X className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome *</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">SKU</label>
              <input
                type="text"
                value={formSku}
                onChange={(e) => setFormSku(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Categoria *</label>
              <input
                type="text"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                required
                placeholder="Ex: Alimentos, Higiene..."
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tipo *</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as ProductType)}
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
              >
                <option value="avulso">Avulso</option>
                <option value="kit">Kit / Cesta Básica</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Unidade</label>
              <input
                type="text"
                value={formUnit}
                onChange={(e) => setFormUnit(e.target.value)}
                placeholder="un, kg, lt..."
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Preço de Custo</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formCostPrice}
                onChange={(e) => setFormCostPrice(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Preço de Venda</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formSalePrice}
                onChange={(e) => setFormSalePrice(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Estoque Mínimo</label>
              <input
                type="number"
                min="0"
                value={formMinStock}
                onChange={(e) => setFormMinStock(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
              />
            </div>
          </div>

          {formType === 'kit' && (
            <div className="mt-4 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950 p-4">
              <KitItemsEditor
                items={kitItems}
                onChange={setKitItemsState}
                availableProducts={avulsoProducts}
              />
            </div>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setShowForm(false); resetForm(); }}
              className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Salvando...' : editingId ? 'Atualizar' : 'Criar'}
            </button>
          </div>
        </form>
      )}

      {/* Sort Controls */}
      {filtered.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">Ordenar por:</span>
          {[
            { key: 'name', label: 'Nome' },
            { key: 'category', label: 'Categoria' },
            { key: 'sale_price', label: 'Preço' },
            { key: 'product_type', label: 'Tipo' },
          ].map((col) => (
            <button
              key={col.key}
              onClick={() => toggleSort(col.key)}
              className={cn(
                'rounded-lg px-3 py-1 text-xs font-medium transition-colors',
                sort?.key === col.key
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
              )}
            >
              {col.label}
              {sort?.key === col.key && (sort.direction === 'asc' ? ' \u2191' : ' \u2193')}
            </button>
          ))}
        </div>
      )}

      {/* Product List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title={products.length === 0 ? 'Nenhum produto cadastrado' : 'Nenhum produto encontrado'}
          description={products.length === 0 ? 'Adicione seu primeiro produto para começar' : 'Tente ajustar os filtros de busca'}
          actionLabel={products.length === 0 ? 'Novo Produto' : undefined}
          onAction={products.length === 0 ? handleNew : undefined}
        />
      ) : (
        <div className="space-y-3">
          {paginatedProducts.map((product) => (
            <div
              key={product.id}
              className={cn(
                'rounded-xl border bg-white dark:bg-gray-800',
                product.is_active
                  ? 'border-gray-200 dark:border-gray-700'
                  : 'border-gray-100 dark:border-gray-800 opacity-60'
              )}
            >
              <div className="flex items-center justify-between p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-gray-100">{product.name}</span>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', TYPE_COLORS[product.product_type])}>
                      {TYPE_LABELS[product.product_type]}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span>{product.sku}</span>
                    <span>{product.category}</span>
                    {product.sale_price && (
                      <span>R$ {product.sale_price.toFixed(2)}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(product)}
                    title="Editar"
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-600"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(product)}
                    title="Excluir"
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={goToPage}
          />
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmState.open}
        onCancel={() => setConfirmState({ open: false, type: '', data: null, loading: false })}
        onConfirm={handleConfirmDelete}
        loading={confirmState.loading}
        title="Excluir produto"
        message={`Tem certeza que deseja excluir "${confirmState.data?.name}"?`}
        confirmLabel="Excluir"
      />
    </div>
  );
}
