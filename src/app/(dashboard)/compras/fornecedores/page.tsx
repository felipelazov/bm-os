'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Loader2,
  X,
  ChevronDown,
  ChevronRight,
  Link2,
  MessageCircle,
  Send,
  Pencil,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/toast';
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierItems,
} from '@/services/compras/suppliers.service';
import { SupplierItemLink } from '@/components/compras/supplier-item-link';
import { QuoteMessageModal } from '@/components/compras/quote-message-modal';
import type { Supplier, SupplierItem } from '@/types/compras.types';

export default function FornecedoresPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Expanded supplier
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [supplierItems, setSupplierItems] = useState<SupplierItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  // Link modal
  const [linkingSupplierId, setLinkingSupplierId] = useState<string | null>(null);
  const [linkingSupplierName, setLinkingSupplierName] = useState('');

  // Quote request
  const [sendingQuote, setSendingQuote] = useState<string | null>(null);
  const [sendingAll, setSendingAll] = useState(false);
  const [quoteSupplier, setQuoteSupplier] = useState<Supplier | null>(null);
  const [quoteAllMode, setQuoteAllMode] = useState(false);

  // Confirm dialog
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    data: string | null;
    loading: boolean;
  }>({ open: false, data: null, loading: false });

  // Form state
  const [formName, setFormName] = useState('');
  const [formCnpj, setFormCnpj] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formWhatsapp, setFormWhatsapp] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getSuppliers(false);
      setSuppliers(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar fornecedores');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setFormName('');
    setFormCnpj('');
    setFormPhone('');
    setFormWhatsapp('');
    setFormEmail('');
    setFormContact('');
    setFormNotes('');
    setEditingId(null);
  };

  const handleEdit = (s: Supplier) => {
    setEditingId(s.id);
    setFormName(s.name);
    setFormCnpj(s.cnpj || '');
    setFormPhone(s.phone || '');
    setFormWhatsapp(s.whatsapp || '');
    setFormEmail(s.email || '');
    setFormContact(s.contact_person || '');
    setFormNotes(s.notes || '');
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      const payload = {
        name: formName,
        cnpj: formCnpj || null,
        phone: formPhone || null,
        whatsapp: formWhatsapp || null,
        email: formEmail || null,
        contact_person: formContact || null,
        notes: formNotes || null,
      };

      if (editingId) {
        await updateSupplier(editingId, payload);
      } else {
        await createSupplier(payload);
      }

      setShowForm(false);
      resetForm();
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar fornecedor');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    setConfirmState({ open: true, data: id, loading: false });
  };

  const handleConfirmDelete = async () => {
    if (!confirmState.data) return;
    setConfirmState(prev => ({ ...prev, loading: true }));
    try {
      await deleteSupplier(confirmState.data);
      toast.success('Fornecedor excluído com sucesso');
      setConfirmState({ open: false, data: null, loading: false });
      await fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir fornecedor');
      setConfirmState(prev => ({ ...prev, loading: false }));
    }
  };

  const handleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setSupplierItems([]);
      return;
    }
    try {
      setExpandedId(id);
      setLoadingItems(true);
      const items = await getSupplierItems(id);
      setSupplierItems(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar itens');
    } finally {
      setLoadingItems(false);
    }
  };

  const handleLinkItems = (supplier: Supplier) => {
    setLinkingSupplierId(supplier.id);
    setLinkingSupplierName(supplier.name);
  };

  const handleLinkSaved = async () => {
    if (expandedId) {
      const items = await getSupplierItems(expandedId);
      setSupplierItems(items);
    }
  };

  const handleSendQuoteRequest = (supplier: Supplier) => {
    if (!supplier.whatsapp) {
      setError('Este fornecedor não possui WhatsApp cadastrado');
      return;
    }
    setQuoteSupplier(supplier);
  };

  const suppliersWithWhatsapp = suppliers.filter((s) => s.whatsapp && s.is_active);

  const handleSendAllQuotes = () => {
    if (suppliersWithWhatsapp.length === 0) {
      setError('Nenhum fornecedor ativo com WhatsApp cadastrado');
      return;
    }
    setQuoteAllMode(true);
    setQuoteSupplier(suppliersWithWhatsapp[0]);
  };

  const handleQuoteModalSent = async () => {
    if (!quoteAllMode) {
      toast.success('Pedido de cotação enviado via WhatsApp!');
      return;
    }

    // Modo "Cotar Todos": enviar a mesma mensagem para os demais fornecedores
    // A mensagem do primeiro já foi enviada pelo modal
    const remaining = suppliersWithWhatsapp.slice(1);
    if (remaining.length === 0) {
      toast.success(`Cotação enviada para ${suppliersWithWhatsapp.length} fornecedor(es) via WhatsApp!`);
      setQuoteAllMode(false);
      return;
    }

    setSendingAll(true);
    setError('');
    const errors: string[] = [];
    let sent = 1; // primeiro já foi enviado pelo modal

    for (const s of remaining) {
      try {
        setSendingQuote(s.id);
        const res = await fetch('/api/whatsapp/send-quote-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ supplierId: s.id }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Erro');
        sent++;
      } catch (err) {
        errors.push(`${s.name}: ${err instanceof Error ? err.message : 'Erro'}`);
      } finally {
        setSendingQuote(null);
      }
    }

    setSendingAll(false);
    setQuoteAllMode(false);

    if (errors.length > 0) {
      toast.error(`Enviado para ${sent} fornecedor(es). Falhas: ${errors.join('; ')}`);
    } else {
      toast.success(`Cotação enviada para ${sent} fornecedor(es) via WhatsApp!`);
    }
  };

  if (loading && suppliers.length === 0) {
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Fornecedores</h1>
          <p className="text-gray-500 dark:text-gray-400">Gerencie fornecedores, itens e cotações</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSendAllQuotes}
            disabled={sendingAll || suppliersWithWhatsapp.length === 0}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {sendingAll ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {sendingAll ? 'Enviando...' : `Cotar Todos (${suppliersWithWhatsapp.length})`}
          </button>
          <button
            onClick={() => { resetForm(); setShowForm(!showForm); }}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Novo Fornecedor
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950 p-3 text-sm text-red-600 dark:text-red-400">{error}</div>
      )}

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {editingId ? 'Editar Fornecedor' : 'Novo Fornecedor'}
            </h3>
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }}>
              <X className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome *</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">CNPJ</label>
              <input
                type="text"
                value={formCnpj}
                onChange={(e) => setFormCnpj(e.target.value)}
                placeholder="00.000.000/0000-00"
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Telefone</label>
              <input
                type="tel"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="(11) 1234-5678"
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">WhatsApp</label>
              <input
                type="tel"
                value={formWhatsapp}
                onChange={(e) => setFormWhatsapp(e.target.value)}
                placeholder="5511999999999"
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Pessoa de contato</label>
              <input
                type="text"
                value={formContact}
                onChange={(e) => setFormContact(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Observações</label>
              <textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
              />
            </div>
          </div>
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

      {/* Supplier List */}
      {suppliers.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-12 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum fornecedor cadastrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {suppliers.map((supplier) => (
            <div
              key={supplier.id}
              className={cn(
                'rounded-xl border bg-white dark:bg-gray-800',
                supplier.is_active
                  ? 'border-gray-200 dark:border-gray-700'
                  : 'border-gray-100 dark:border-gray-800 opacity-60'
              )}
            >
              {/* Supplier header */}
              <div className="flex items-center justify-between p-4">
                <button
                  onClick={() => handleExpand(supplier.id)}
                  className="flex items-center gap-3 text-left"
                >
                  {expandedId === supplier.id ? (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  )}
                  <div>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{supplier.name}</span>
                    <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      {supplier.cnpj && <span>{supplier.cnpj}</span>}
                      {supplier.contact_person && <span>{supplier.contact_person}</span>}
                      {supplier.phone && <span>{supplier.phone}</span>}
                    </div>
                  </div>
                </button>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleLinkItems(supplier)}
                    title="Vincular Itens"
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-600"
                  >
                    <Link2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleSendQuoteRequest(supplier)}
                    title="Pedir Cotação via WhatsApp"
                    disabled={sendingQuote === supplier.id || !supplier.whatsapp}
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-green-600 disabled:opacity-30"
                  >
                    {sendingQuote === supplier.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MessageCircle className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleEdit(supplier)}
                    title="Editar"
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-600"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(supplier.id)}
                    title="Excluir"
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Expanded: supplier items */}
              {expandedId === supplier.id && (
                <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3">
                  {loadingItems ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                    </div>
                  ) : supplierItems.length === 0 ? (
                    <p className="py-2 text-sm text-gray-500 dark:text-gray-400">
                      Nenhum item vinculado.{' '}
                      <button
                        onClick={() => handleLinkItems(supplier)}
                        className="text-blue-600 hover:underline"
                      >
                        Vincular itens
                      </button>
                    </p>
                  ) : (
                    <div className="space-y-1">
                      <p className="mb-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                        Itens vinculados ({supplierItems.length})
                      </p>
                      {supplierItems.map((si) => (
                        <div
                          key={si.id}
                          className="flex items-center justify-between rounded-lg px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <span className="text-gray-700 dark:text-gray-300">
                            {si.purchase_item?.name ?? 'Item desconhecido'}
                            <span className="ml-2 text-xs text-gray-400">
                              ({si.purchase_item?.unit ?? '—'})
                            </span>
                          </span>
                          <span className="text-sm tabular-nums text-gray-500 dark:text-gray-400">
                            {si.last_unit_price
                              ? Number(si.last_unit_price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                              : '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmState.open}
        onCancel={() => setConfirmState({ open: false, data: null, loading: false })}
        onConfirm={handleConfirmDelete}
        loading={confirmState.loading}
        title="Excluir fornecedor"
        message="Tem certeza que deseja excluir este fornecedor?"
        confirmLabel="Excluir"
      />

      {/* Link Items Modal */}
      {linkingSupplierId && (
        <SupplierItemLink
          supplierId={linkingSupplierId}
          supplierName={linkingSupplierName}
          onClose={() => setLinkingSupplierId(null)}
          onSaved={handleLinkSaved}
        />
      )}

      {/* Quote Message Modal */}
      {quoteSupplier && (
        <QuoteMessageModal
          supplier={quoteSupplier}
          onClose={() => {
            setQuoteSupplier(null);
            setQuoteAllMode(false);
          }}
          onSent={handleQuoteModalSent}
        />
      )}
    </div>
  );
}
