'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Loader2, Pencil, Eye, ShoppingBag, FileText, Ban, Trash2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { getSales, cancelSale, deleteSale } from '@/services/sales/sales.service';
import { SaleWizard } from '@/components/sales/sale-wizard';
import { SaleDetailModal } from '@/components/sales/sale-detail-modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/toast';
import { useSort } from '@/hooks/use-sort';
import { usePagination } from '@/hooks/use-pagination';
import type { Sale, SaleStatus } from '@/types/sales.types';
import { SALE_PAYMENT_METHODS } from '@/types/sales.types';

const PAYMENT_STATUS_MAP: Record<string, { color: 'yellow' | 'green'; label: string }> = {
  pendente: { color: 'yellow', label: 'Pendente' },
  pago: { color: 'green', label: 'Pago' },
};

const CLIENT_TYPE_MAP: Record<string, { color: 'blue' | 'purple' | 'green'; label: string }> = {
  varejo: { color: 'blue', label: 'Varejo' },
  mensalista: { color: 'purple', label: 'Mensalista' },
  doacao: { color: 'green', label: 'Doação' },
};

export default function VendasPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<SaleStatus>('em_aberto');
  const [showWizard, setShowWizard] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [viewingSaleId, setViewingSaleId] = useState<string | null>(null);

  // Confirm dialog state
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    type: 'cancel' | 'delete';
    sale: Sale | null;
    loading: boolean;
  }>({ open: false, type: 'cancel', sale: null, loading: false });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClientType, setFilterClientType] = useState('');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getSales();
      setSales(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar vendas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const emAbertoCount = sales.filter((s) => s.status === 'em_aberto').length;
  const finalizadasCount = sales.filter((s) => s.status === 'finalizada').length;
  const canceladasCount = sales.filter((s) => s.status === 'cancelada').length;
  const filteredSales = sales.filter((s) => s.status === activeTab).filter((s) => {
    const term = searchTerm.toLowerCase();
    if (term && !s.protocol.toLowerCase().includes(term) && !(s.client_name || '').toLowerCase().includes(term)) return false;
    if (filterClientType && s.client_type !== filterClientType) return false;
    if (filterPaymentMethod && s.payment_method !== filterPaymentMethod) return false;
    if (filterDateStart && s.created_at < filterDateStart) return false;
    if (filterDateEnd && s.created_at.slice(0, 10) > filterDateEnd) return false;
    return true;
  });

  // Sort + Pagination
  const { sorted, sort, toggleSort } = useSort(filteredSales);
  const pagination = usePagination(sorted);

  const handleEdit = (sale: Sale) => {
    setEditingSale(sale);
  };

  const handleCancel = (sale: Sale) => {
    setConfirmState({ open: true, type: 'cancel', sale, loading: false });
  };

  const handleDelete = (sale: Sale) => {
    setConfirmState({ open: true, type: 'delete', sale, loading: false });
  };

  const handleConfirm = async () => {
    if (!confirmState.sale) return;
    setConfirmState((prev) => ({ ...prev, loading: true }));

    try {
      if (confirmState.type === 'cancel') {
        await cancelSale(confirmState.sale.id);
        toast.success(`Venda ${confirmState.sale.protocol} cancelada com sucesso`);
      } else {
        await deleteSale(confirmState.sale.id);
        toast.success(`Venda ${confirmState.sale.protocol} excluída com sucesso`);
      }
      setConfirmState({ open: false, type: 'cancel', sale: null, loading: false });
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Erro ao ${confirmState.type === 'cancel' ? 'cancelar' : 'excluir'} venda`);
      setConfirmState((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleWizardClose = () => {
    setShowWizard(false);
    setEditingSale(null);
  };

  const handleWizardCreated = () => {
    setShowWizard(false);
    setEditingSale(null);
    fetchData();
  };

  if (loading && sales.length === 0) {
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Comercial & Vendas
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Controle de pedidos VPxxx e OPxxx.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" disabled title="Em breve" icon={<FileText className="h-4 w-4" />}>
            Importar Orçamento (OP)
          </Button>
          <Button variant="success" onClick={() => setShowWizard(true)} icon={<Plus className="h-4 w-4" />}>
            NOVA VENDA (VP)
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950 p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
        {([
          { key: 'em_aberto' as SaleStatus, label: 'EM ABERTO', count: emAbertoCount, color: 'yellow' as const },
          { key: 'finalizada' as SaleStatus, label: 'CONCLUÍDAS', count: finalizadasCount, color: 'green' as const },
          { key: 'cancelada' as SaleStatus, label: 'CANCELADAS', count: canceladasCount, color: 'red' as const },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors',
              activeTab === tab.key
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            )}
          >
            {tab.label}
            <Badge color={activeTab === tab.key ? tab.color : 'gray'}>
              {tab.count}
            </Badge>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por protocolo ou cliente..."
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 pl-10 pr-3 py-2 text-sm dark:text-gray-200"
            />
          </div>
          <select
            value={filterClientType}
            onChange={(e) => setFilterClientType(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm dark:text-gray-200"
          >
            <option value="">Todos os tipos</option>
            <option value="varejo">Varejo</option>
            <option value="mensalista">Mensalista</option>
            <option value="doacao">Doação</option>
          </select>
          <select
            value={filterPaymentMethod}
            onChange={(e) => setFilterPaymentMethod(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm dark:text-gray-200"
          >
            <option value="">Todas as formas</option>
            {SALE_PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <input
            type="date"
            value={filterDateStart}
            onChange={(e) => setFilterDateStart(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm dark:text-gray-200"
          />
          <input
            type="date"
            value={filterDateEnd}
            onChange={(e) => setFilterDateEnd(e.target.value)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm dark:text-gray-200"
          />
        </div>
      </div>

      {/* Table */}
      {filteredSales.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title={
            sales.length === 0
              ? 'Nenhuma venda cadastrada'
              : `Nenhuma venda ${activeTab === 'em_aberto' ? 'em aberto' : activeTab === 'finalizada' ? 'concluída' : 'cancelada'}`
          }
          description={sales.length === 0 ? 'Crie sua primeira venda para começar' : undefined}
          actionLabel={sales.length === 0 ? 'Nova Venda' : undefined}
          onAction={sales.length === 0 ? () => setShowWizard(true) : undefined}
        />
      ) : (
        <>
          <Table>
            <TableHead>
              <tr>
                <TableHeaderCell sortable sortKey="protocol" currentSort={sort} onSort={toggleSort}>
                  Protocolo
                </TableHeaderCell>
                <TableHeaderCell sortable sortKey="client_name" currentSort={sort} onSort={toggleSort}>
                  Cliente
                </TableHeaderCell>
                <TableHeaderCell sortable sortKey="created_at" currentSort={sort} onSort={toggleSort}>
                  Data
                </TableHeaderCell>
                <TableHeaderCell sortable sortKey="total" currentSort={sort} onSort={toggleSort} className="text-right">
                  Total
                </TableHeaderCell>
                <TableHeaderCell className="text-center">
                  Pagamento
                </TableHeaderCell>
                <TableHeaderCell className="text-center">
                  Ações
                </TableHeaderCell>
              </tr>
            </TableHead>
            <TableBody>
              {pagination.items.map((sale) => {
                const clientType = sale.client_type ? CLIENT_TYPE_MAP[sale.client_type] : null;
                const paymentStatus = PAYMENT_STATUS_MAP[sale.payment_status];
                return (
                  <TableRow key={sale.id} onClick={() => setViewingSaleId(sale.id)} className="cursor-pointer">
                    <TableCell>
                      <span className="font-mono font-medium text-gray-900 dark:text-gray-100">
                        {sale.protocol}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-900 dark:text-gray-100">{sale.client_name}</span>
                        {clientType && <Badge color={clientType.color}>{clientType.label}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-500 dark:text-gray-400">
                      {formatDate(sale.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-medium text-green-600 dark:text-green-400">
                        {formatCurrency(sale.total)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {paymentStatus && <Badge color={paymentStatus.color}>{paymentStatus.label}</Badge>}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="secondary" size="sm"
                          icon={<Eye className="h-3 w-3" />}
                          onClick={(e) => { e.stopPropagation(); setViewingSaleId(sale.id); }}
                          aria-label={`Ver venda ${sale.protocol}`}
                        >
                          VER
                        </Button>
                        {sale.status !== 'cancelada' ? (
                          <>
                            <Button
                              variant="secondary" size="sm"
                              icon={<Pencil className="h-3 w-3" />}
                              onClick={(e) => { e.stopPropagation(); handleEdit(sale); }}
                              aria-label={`Editar venda ${sale.protocol}`}
                            >
                              EDITAR
                            </Button>
                            <Button
                              variant="danger" size="sm"
                              icon={<Ban className="h-3 w-3" />}
                              onClick={(e) => { e.stopPropagation(); handleCancel(sale); }}
                              aria-label={`Cancelar venda ${sale.protocol}`}
                            >
                              CANCELAR
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="danger" size="sm"
                            icon={<Trash2 className="h-3 w-3" />}
                            onClick={(e) => { e.stopPropagation(); handleDelete(sale); }}
                            aria-label={`Excluir venda ${sale.protocol}`}
                          >
                            EXCLUIR
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Pagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            pageSize={pagination.pageSize}
            onPageChange={pagination.goToPage}
          />
        </>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmState.open}
        onCancel={() => setConfirmState({ open: false, type: 'cancel', sale: null, loading: false })}
        onConfirm={handleConfirm}
        loading={confirmState.loading}
        title={confirmState.type === 'cancel' ? 'Cancelar venda' : 'Excluir venda'}
        message={
          confirmState.type === 'cancel'
            ? `Tem certeza que deseja cancelar a venda ${confirmState.sale?.protocol}? Esta ação não pode ser desfeita.`
            : `Excluir permanentemente a venda ${confirmState.sale?.protocol}? Esta ação não pode ser desfeita.`
        }
        confirmLabel={confirmState.type === 'cancel' ? 'Cancelar Venda' : 'Excluir'}
      />

      {/* Wizard Modal */}
      {showWizard && (
        <SaleWizard onClose={handleWizardClose} onCreated={handleWizardCreated} />
      )}

      {/* Detail Modal */}
      {viewingSaleId && (
        <SaleDetailModal
          saleId={viewingSaleId}
          onClose={() => setViewingSaleId(null)}
          onEdit={(sale) => {
            setViewingSaleId(null);
            setEditingSale(sale);
          }}
          onCancel={(sale) => {
            setViewingSaleId(null);
            handleCancel(sale);
          }}
        />
      )}

      {/* Edit Modal */}
      {editingSale && (
        <SaleWizard
          onClose={handleWizardClose}
          onCreated={handleWizardCreated}
          editMode={{
            saleId: editingSale.id,
            currentPaymentStatus: editingSale.payment_status,
            currentPaymentMethod: editingSale.payment_method,
            itemsTotal: editingSale.items_total,
            freightAmount: editingSale.freight_amount,
          }}
        />
      )}
    </div>
  );
}
