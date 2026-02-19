'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Loader2,
  Pencil,
  Trash2,
  RotateCcw,
  ShoppingCart,
  FileText,
  ArrowLeft,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from '@/components/ui/toast';
import {
  getQuotes,
  getQuoteWithItems,
  getNextQuoteProtocol,
  createQuote,
  updateQuote,
  softDeleteQuote,
  restoreQuote,
  convertQuoteToSale,
} from '@/services/quotes/quotes.service';
import { QuoteForm } from '@/components/quotes/quote-form';
import { QuotePreview } from '@/components/quotes/quote-preview';
import { downloadQuotePdf, getQuotePdfBlob } from '@/services/quotes/quote-pdf';
import type { QuotePdfOptions } from '@/services/quotes/quote-pdf';
import type { Quote, QuoteItem, QuoteDeliveryType, CreateQuoteData } from '@/types/quotes.types';
import type { Client } from '@/types/clients.types';

type ViewMode = 'list' | 'create' | 'edit';
type ListTab = 'ativos' | 'convertidos' | 'excluidos';

const STATUS_COLORS: Record<string, string> = {
  pendente: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  aprovado: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  recusado: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  convertido: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
};

const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
  convertido: 'Convertido',
};

export default function OrcamentosPage() {
  const [mode, setMode] = useState<ViewMode>('list');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [listTab, setListTab] = useState<ListTab>('ativos');
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');

  // Form state
  const [protocol, setProtocol] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [deliveryType, setDeliveryType] = useState<QuoteDeliveryType>('entrega');
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [validityDays, setValidityDays] = useState(5);
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountPercent, setDiscountPercent] = useState(2);
  const [notes, setNotes] = useState('');
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [convertConfirm, setConvertConfirm] = useState<{
    open: boolean;
    quoteId: string | null;
    loading: boolean;
  }>({ open: false, quoteId: null, loading: false });

  const fetchQuotes = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getQuotes();
      setQuotes(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar orçamentos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  const resetForm = () => {
    setSelectedClient(null);
    setItems([]);
    setDeliveryType('entrega');
    setPaymentMethod(null);
    setValidityDays(5);
    setDiscountEnabled(false);
    setDiscountPercent(2);
    setNotes('');
    setEditingQuoteId(null);
    setProtocol('');
  };

  const handleNewQuote = async () => {
    resetForm();
    try {
      const nextProtocol = await getNextQuoteProtocol();
      setProtocol(nextProtocol);
    } catch {
      setProtocol('OP___-__');
    }
    setMode('create');
  };

  const handleEdit = async (quote: Quote) => {
    try {
      setLoading(true);
      const { quote: fullQuote, items: quoteItems } = await getQuoteWithItems(quote.id);
      setEditingQuoteId(fullQuote.id);
      setProtocol(fullQuote.protocol);
      setItems(quoteItems);
      setDeliveryType(fullQuote.delivery_type);
      setPaymentMethod(fullQuote.payment_method);
      setValidityDays(fullQuote.validity_days);
      setDiscountEnabled(fullQuote.discount_enabled);
      setDiscountPercent(fullQuote.discount_percent);
      setNotes(fullQuote.notes || '');
      // Client will be null until loaded - we set client_id info
      setSelectedClient(
        fullQuote.client_id
          ? ({ id: fullQuote.client_id, name: fullQuote.client_name || '' } as Client)
          : null
      );
      setMode('edit');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar orçamento');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (items.length === 0) {
      setError('Adicione pelo menos um item ao orçamento.');
      return;
    }

    try {
      setSaving(true);
      setError('');

      const data: CreateQuoteData = {
        client_id: selectedClient?.id || null,
        items: items.map((item) => ({
          product_id: item.product_id,
          product_name: item.product_name,
          product_sku: item.product_sku,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_amount: item.discount_amount,
          total_price: item.total_price,
        })),
        delivery_type: deliveryType,
        payment_method: paymentMethod,
        validity_days: validityDays,
        discount_enabled: discountEnabled,
        discount_percent: discountPercent,
        notes: notes || null,
      };

      if (mode === 'edit' && editingQuoteId) {
        await updateQuote(editingQuoteId, data);
        toast.success('Orçamento atualizado com sucesso');
      } else {
        await createQuote(data);
        toast.success('Orçamento criado com sucesso');
      }

      resetForm();
      setMode('list');
      await fetchQuotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar orçamento');
    } finally {
      setSaving(false);
    }
  };

  const handleSoftDelete = async (id: string) => {
    try {
      await softDeleteQuote(id);
      toast.success('Orçamento excluído com sucesso');
      await fetchQuotes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir orçamento');
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await restoreQuote(id);
      toast.success('Orçamento restaurado com sucesso');
      await fetchQuotes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao restaurar orçamento');
    }
  };

  const handleConvert = (id: string) => {
    setConvertConfirm({ open: true, quoteId: id, loading: false });
  };

  const handleConfirmConvert = async () => {
    if (!convertConfirm.quoteId) return;
    setConvertConfirm(prev => ({ ...prev, loading: true }));
    try {
      await convertQuoteToSale(convertConfirm.quoteId);
      toast.success('Orçamento convertido em venda com sucesso');
      setConvertConfirm({ open: false, quoteId: null, loading: false });
      await fetchQuotes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao converter orçamento');
      setConvertConfirm(prev => ({ ...prev, loading: false }));
    }
  };

  const handleBackToList = () => {
    resetForm();
    setMode('list');
  };

  // Build PDF options from current form state
  const buildPdfOptions = (): QuotePdfOptions => {
    const itemsTotal = items.reduce((sum, item) => sum + item.total_price, 0);
    const discAmount = discountEnabled
      ? Math.round(itemsTotal * (discountPercent / 100) * 100) / 100
      : 0;
    const clientAddress = selectedClient?.address
      ? `${selectedClient.address}${selectedClient.address_number ? `, ${selectedClient.address_number}` : ''} - ${selectedClient.neighborhood || ''}, ${selectedClient.city || ''}`
      : '';

    return {
      protocol,
      clientName: selectedClient?.name || 'NÃO IDENTIFICADO',
      clientPhone: selectedClient?.phone || '',
      clientAddress,
      items: items.map((item) => ({
        product_sku: item.product_sku,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_amount: item.discount_amount,
        total_price: item.total_price,
      })),
      deliveryType,
      paymentMethod,
      validityDays,
      discountEnabled,
      discountPercent,
      itemsTotal,
      discountAmount: discAmount,
      total: itemsTotal - discAmount,
      createdAt: new Date(),
    };
  };

  const handleDownloadPdf = () => {
    downloadQuotePdf(buildPdfOptions());
  };

  const handleSendWhatsApp = async () => {
    const phone = selectedClient?.whatsapp || selectedClient?.phone;
    if (!phone) return;

    try {
      setSendingWhatsApp(true);
      setError('');

      const blob = getQuotePdfBlob(buildPdfOptions());
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const fileName = `orcamento-${protocol}.pdf`;
      const response = await fetch('/api/whatsapp/send-quote-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phone,
          pdfBase64: base64,
          fileName,
          message: `Segue o orçamento ${protocol} em anexo.`,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Erro ao enviar WhatsApp');
      }

      toast.success('Orçamento enviado via WhatsApp com sucesso!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar WhatsApp');
    } finally {
      setSendingWhatsApp(false);
    }
  };

  // Filtered lists
  const activeQuotes = quotes.filter((q) => !q.is_deleted && q.status !== 'convertido');
  const convertedQuotes = quotes.filter((q) => !q.is_deleted && q.status === 'convertido');
  const deletedQuotes = quotes.filter((q) => q.is_deleted);
  const baseQuotes =
    listTab === 'ativos'
      ? activeQuotes
      : listTab === 'convertidos'
        ? convertedQuotes
        : deletedQuotes;
  const displayedQuotes = baseQuotes.filter((q) => {
    const term = searchTerm.toLowerCase();
    if (term && !q.protocol.toLowerCase().includes(term) && !(q.client_name || '').toLowerCase().includes(term)) return false;
    if (filterStatus && listTab === 'ativos' && q.status !== filterStatus) return false;
    if (filterDateStart && q.created_at < filterDateStart) return false;
    if (filterDateEnd && q.created_at.slice(0, 10) > filterDateEnd) return false;
    return true;
  });

  // ============================================
  // Render: Create / Edit mode
  // ============================================

  if (mode === 'create' || mode === 'edit') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Orçamentos
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              {mode === 'create' ? 'Novo orçamento' : `Editando ${protocol}`}
            </p>
          </div>
          <button
            onClick={handleBackToList}
            className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para listagem
          </button>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950 p-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Split layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left: Form */}
          <div>
            <QuoteForm
              selectedClient={selectedClient}
              onClientChange={setSelectedClient}
              items={items}
              onItemsChange={setItems}
              deliveryType={deliveryType}
              onDeliveryTypeChange={setDeliveryType}
              paymentMethod={paymentMethod}
              onPaymentMethodChange={setPaymentMethod}
              validityDays={validityDays}
              onValidityDaysChange={setValidityDays}
              discountEnabled={discountEnabled}
              onDiscountEnabledChange={setDiscountEnabled}
              discountPercent={discountPercent}
              onDiscountPercentChange={setDiscountPercent}
              notes={notes}
              onNotesChange={setNotes}
            />
          </div>

          {/* Right: Preview (sticky) */}
          <div className="lg:sticky lg:top-6 lg:self-start">
            <QuotePreview
              protocol={protocol}
              selectedClient={selectedClient}
              items={items}
              deliveryType={deliveryType}
              paymentMethod={paymentMethod}
              validityDays={validityDays}
              discountEnabled={discountEnabled}
              discountPercent={discountPercent}
              onDownloadPdf={handleDownloadPdf}
              onSendWhatsApp={handleSendWhatsApp}
              canSendWhatsApp={!!(selectedClient?.whatsapp || selectedClient?.phone)}
              sendingWhatsApp={sendingWhatsApp}
            />
          </div>
        </div>

        {/* Footer save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-6 py-3 text-sm font-bold text-white uppercase hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            'SALVAR ORÇAMENTO E FINALIZAR'
          )}
        </button>
      </div>
    );
  }

  // ============================================
  // Render: List mode
  // ============================================

  if (loading && quotes.length === 0) {
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
            Orçamentos
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Propostas comerciais e orçamentos (OP)
          </p>
        </div>
        <button
          onClick={handleNewQuote}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          <Plus className="h-4 w-4" />
          NOVO ORÇAMENTO
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950 p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
        <button
          onClick={() => setListTab('ativos')}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors',
            listTab === 'ativos'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          )}
        >
          ATIVOS
          <span
            className={cn(
              'rounded-full px-1.5 py-0.5 text-xs',
              listTab === 'ativos'
                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
            )}
          >
            {activeQuotes.length}
          </span>
        </button>
        <button
          onClick={() => setListTab('convertidos')}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors',
            listTab === 'convertidos'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          )}
        >
          CONVERTIDOS
          <span
            className={cn(
              'rounded-full px-1.5 py-0.5 text-xs',
              listTab === 'convertidos'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
            )}
          >
            {convertedQuotes.length}
          </span>
        </button>
        <button
          onClick={() => setListTab('excluidos')}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-medium transition-colors',
            listTab === 'excluidos'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          )}
        >
          EXCLUÍDOS
          <span
            className={cn(
              'rounded-full px-1.5 py-0.5 text-xs',
              listTab === 'excluidos'
                ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
            )}
          >
            {deletedQuotes.length}
          </span>
        </button>
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
          {listTab === 'ativos' && (
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm dark:text-gray-200"
            >
              <option value="">Todos os status</option>
              <option value="pendente">Pendente</option>
              <option value="aprovado">Aprovado</option>
              <option value="recusado">Recusado</option>
            </select>
          )}
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
      {displayedQuotes.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={quotes.length === 0
            ? 'Nenhum orçamento cadastrado'
            : `Nenhum orçamento ${listTab === 'ativos' ? 'ativo' : listTab === 'convertidos' ? 'convertido' : 'excluído'}`}
          description={quotes.length === 0 ? 'Crie seu primeiro orçamento para começar' : 'Tente ajustar os filtros de busca'}
          actionLabel={quotes.length === 0 ? 'Novo Orçamento' : undefined}
          onAction={quotes.length === 0 ? handleNewQuote : undefined}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Protocolo
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Cliente
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Total
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase text-gray-500 dark:text-gray-400">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {displayedQuotes.map((quote) => (
                <tr key={quote.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                  <td className="px-4 py-3">
                    <span className="text-sm font-mono font-medium text-gray-900 dark:text-gray-100">
                      {quote.protocol}
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(quote.created_at)}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-900 dark:text-gray-100">
                      {quote.client_name || 'Sem cliente'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-xs font-medium',
                        STATUS_COLORS[quote.status] || ''
                      )}
                    >
                      {STATUS_LABELS[quote.status] || quote.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                      {formatCurrency(quote.total)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                      {listTab === 'ativos' ? (
                        <>
                          <button
                            onClick={() => handleEdit(quote)}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-600 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            title="Editar"
                          >
                            <Pencil className="h-3 w-3" />
                            EDITAR
                          </button>
                          {(quote.status === 'pendente' || quote.status === 'aprovado') && (
                            <button
                              onClick={() => handleConvert(quote.id)}
                              className="inline-flex items-center gap-1 rounded-lg border border-blue-300 dark:border-blue-600 px-2.5 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
                              title="Converter em Venda"
                            >
                              <ShoppingCart className="h-3 w-3" />
                              CONVERTER
                            </button>
                          )}
                          <button
                            onClick={() => handleSoftDelete(quote.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-300 dark:border-red-600 px-2.5 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </>
                      ) : listTab === 'convertidos' ? (
                        <>
                          <span
                            className={cn(
                              'rounded-full px-2.5 py-0.5 text-xs font-medium',
                              'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                            )}
                          >
                            {quote.converted_sale_id ? `Venda vinculada` : 'Convertido'}
                          </span>
                          <button
                            onClick={() => handleEdit(quote)}
                            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-600 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            title="Visualizar"
                          >
                            <FileText className="h-3 w-3" />
                            VER
                          </button>
                          <button
                            onClick={() => handleSoftDelete(quote.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-300 dark:border-red-600 px-2.5 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleRestore(quote.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-green-300 dark:border-green-600 px-2.5 py-1.5 text-xs font-medium text-green-700 dark:text-green-300 hover:bg-green-50 dark:hover:bg-green-950 transition-colors"
                          title="Restaurar"
                        >
                          <RotateCcw className="h-3 w-3" />
                          RESTAURAR
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={convertConfirm.open}
        onCancel={() => setConvertConfirm({ open: false, quoteId: null, loading: false })}
        onConfirm={handleConfirmConvert}
        loading={convertConfirm.loading}
        title="Converter em venda"
        message="Converter este orçamento em venda? Uma nova venda (VP) será criada."
        confirmLabel="Converter"
        variant="warning"
      />
    </div>
  );
}
