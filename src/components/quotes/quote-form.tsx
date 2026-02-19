'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Search,
  User,
  Package,
  Settings2,
  StickyNote,
  Trash2,
  Plus,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { getClients } from '@/services/clients/clients.service';
import { getProducts } from '@/services/products/products.service';
import type { Client } from '@/types/clients.types';
import type { Product } from '@/types/products.types';
import type { QuoteItem, QuoteDeliveryType } from '@/types/quotes.types';
import { QUOTE_PAYMENT_METHODS } from '@/types/quotes.types';

interface QuoteFormProps {
  selectedClient: Client | null;
  onClientChange: (client: Client | null) => void;
  items: QuoteItem[];
  onItemsChange: (items: QuoteItem[]) => void;
  deliveryType: QuoteDeliveryType;
  onDeliveryTypeChange: (type: QuoteDeliveryType) => void;
  paymentMethod: string | null;
  onPaymentMethodChange: (method: string | null) => void;
  validityDays: number;
  onValidityDaysChange: (days: number) => void;
  discountEnabled: boolean;
  onDiscountEnabledChange: (enabled: boolean) => void;
  discountPercent: number;
  onDiscountPercentChange: (percent: number) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
}

export function QuoteForm({
  selectedClient,
  onClientChange,
  items,
  onItemsChange,
  deliveryType,
  onDeliveryTypeChange,
  paymentMethod,
  onPaymentMethodChange,
  validityDays,
  onValidityDaysChange,
  discountEnabled,
  onDiscountEnabledChange,
  discountPercent,
  onDiscountPercentChange,
  notes,
  onNotesChange,
}: QuoteFormProps) {
  return (
    <div className="space-y-6">
      <ClientSection
        selectedClient={selectedClient}
        onClientChange={onClientChange}
      />
      <ProductsSection items={items} onItemsChange={onItemsChange} />
      <ConditionsSection
        deliveryType={deliveryType}
        onDeliveryTypeChange={onDeliveryTypeChange}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={onPaymentMethodChange}
        validityDays={validityDays}
        onValidityDaysChange={onValidityDaysChange}
        discountEnabled={discountEnabled}
        onDiscountEnabledChange={onDiscountEnabledChange}
        discountPercent={discountPercent}
        onDiscountPercentChange={onDiscountPercentChange}
      />
      <NotesSection notes={notes} onNotesChange={onNotesChange} />
    </div>
  );
}

// ============================================
// Card 1 - Cadastro do Cliente
// ============================================

function ClientSection({
  selectedClient,
  onClientChange,
}: {
  selectedClient: Client | null;
  onClientChange: (client: Client | null) => void;
}) {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await getClients(true);
        setClients(data);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.cpf_cnpj && c.cpf_cnpj.includes(q)) ||
      (c.phone && c.phone.includes(q))
    );
  });

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
          <User className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase">
          Cadastro do Cliente
        </h3>
      </div>

      <div className="p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, razao social ou CPF/CNPJ..."
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 pl-10 pr-3 py-2.5 text-sm dark:text-gray-200"
              />
            </div>

            {search && (
              <div className="max-h-48 overflow-y-auto space-y-1">
                {filtered.length === 0 ? (
                  <p className="py-3 text-center text-sm text-gray-500 dark:text-gray-400">
                    Nenhum cliente encontrado
                  </p>
                ) : (
                  filtered.map((client) => (
                    <button
                      key={client.id}
                      onClick={() => {
                        onClientChange(client);
                        setSearch('');
                      }}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors',
                        selectedClient?.id === client.id
                          ? 'border-green-500 bg-green-50 dark:bg-green-950 dark:border-green-400'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      )}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                        <User className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {client.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {client.cpf_cnpj || 'Sem documento'} {client.phone ? `| ${client.phone}` : ''}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {selectedClient ? (
              <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {selectedClient.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {selectedClient.cpf_cnpj || '---'} | {selectedClient.phone || '---'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {selectedClient.address
                        ? `${selectedClient.address}${selectedClient.address_number ? `, ${selectedClient.address_number}` : ''} - ${selectedClient.neighborhood || ''}, ${selectedClient.city || ''}`
                        : '---'}
                    </p>
                  </div>
                  <button
                    onClick={() => onClientChange(null)}
                    className="text-xs text-red-500 hover:text-red-700"
                  >
                    Remover
                  </button>
                </div>
              </div>
            ) : (
              !search && (
                <div className="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 p-4 text-center">
                  <User className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
                  <p className="mt-1 text-xs text-gray-400">
                    Busque e selecione um cliente acima
                  </p>
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ============================================
// Card 2 - Composicao da Proposta
// ============================================

function ProductsSection({
  items,
  onItemsChange,
}: {
  items: QuoteItem[];
  onItemsChange: (items: QuoteItem[]) => void;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [pendingQty, setPendingQty] = useState(1);
  const [pendingUnitPrice, setPendingUnitPrice] = useState(0);
  const [pendingDiscount, setPendingDiscount] = useState(0);
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getProducts(true);
        setProducts(data);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredProducts = products.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  });

  const selectProduct = (product: Product) => {
    const price = product.sale_price ?? product.cost_price ?? 0;
    setPendingProduct(product);
    setPendingUnitPrice(price);
    setPendingQty(1);
    setPendingDiscount(0);
    setSearch('');
    setShowDropdown(false);
  };

  const addToQuote = () => {
    if (!pendingProduct) return;
    const totalPrice = pendingQty * pendingUnitPrice - pendingDiscount;
    onItemsChange([
      ...items,
      {
        product_id: pendingProduct.id,
        product_name: pendingProduct.name,
        product_sku: pendingProduct.sku,
        quantity: pendingQty,
        unit_price: pendingUnitPrice,
        discount_amount: pendingDiscount,
        total_price: totalPrice > 0 ? totalPrice : 0,
      },
    ]);
    setPendingProduct(null);
    setPendingQty(1);
    setPendingUnitPrice(0);
    setPendingDiscount(0);
  };

  const removeItem = (index: number) => {
    onItemsChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
          <Package className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase">
          Composição da Proposta
        </h3>
      </div>

      <div className="p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : (
          <>
            {/* Search */}
            <div className="relative" ref={dropdownRef}>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => search && setShowDropdown(true)}
                placeholder="Buscar produto por nome, SKU ou categoria..."
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 pl-10 pr-3 py-2.5 text-sm dark:text-gray-200"
              />
              {showDropdown && search && (
                <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
                  {filteredProducts.length === 0 ? (
                    <p className="p-3 text-sm text-gray-500 dark:text-gray-400">Nenhum produto encontrado</p>
                  ) : (
                    filteredProducts.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => selectProduct(product)}
                        className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{product.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            SKU: {product.sku} | {product.category}
                          </p>
                        </div>
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">
                          {formatCurrency(product.sale_price ?? product.cost_price ?? 0)}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Pending product fields */}
            {pendingProduct && (
              <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 p-3 space-y-3">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {pendingProduct.name} <span className="text-xs text-gray-500">({pendingProduct.sku})</span>
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">QTD</label>
                    <input
                      type="number"
                      min={1}
                      value={pendingQty}
                      onChange={(e) => setPendingQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">UNIT R$</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={pendingUnitPrice}
                      onChange={(e) => setPendingUnitPrice(parseFloat(e.target.value) || 0)}
                      className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">DESC R$</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={pendingDiscount}
                      onChange={(e) => setPendingDiscount(parseFloat(e.target.value) || 0)}
                      className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
                    />
                  </div>
                </div>
                <button
                  onClick={addToQuote}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  <Plus className="h-4 w-4" />
                  INSERIR NA PROPOSTA
                </button>
              </div>
            )}

            {/* Items list */}
            {items.length > 0 && (
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div
                    key={`${item.product_id}-${index}`}
                    className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-2.5"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {item.product_name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {item.quantity}x {formatCurrency(item.unit_price)}
                        {item.discount_amount > 0 && ` (-${formatCurrency(item.discount_amount)})`}
                        {' = '}{formatCurrency(item.total_price)}
                      </p>
                    </div>
                    <button
                      onClick={() => removeItem(index)}
                      className="ml-2 rounded p-1 text-gray-400 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ============================================
// Card 3 - Condicoes Gerais
// ============================================

function ConditionsSection({
  deliveryType,
  onDeliveryTypeChange,
  paymentMethod,
  onPaymentMethodChange,
  validityDays,
  onValidityDaysChange,
  discountEnabled,
  onDiscountEnabledChange,
  discountPercent,
  onDiscountPercentChange,
}: {
  deliveryType: QuoteDeliveryType;
  onDeliveryTypeChange: (type: QuoteDeliveryType) => void;
  paymentMethod: string | null;
  onPaymentMethodChange: (method: string | null) => void;
  validityDays: number;
  onValidityDaysChange: (days: number) => void;
  discountEnabled: boolean;
  onDiscountEnabledChange: (enabled: boolean) => void;
  discountPercent: number;
  onDiscountPercentChange: (percent: number) => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900">
          <Settings2 className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase">
          Condições Gerais
        </h3>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
              Validade (dias)
            </label>
            <input
              type="number"
              min={1}
              value={validityDays}
              onChange={(e) => onValidityDaysChange(Math.max(1, parseInt(e.target.value) || 1))}
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
              Modalidade
            </label>
            <select
              value={deliveryType}
              onChange={(e) => onDeliveryTypeChange(e.target.value as QuoteDeliveryType)}
              className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
            >
              <option value="entrega">Entrega</option>
              <option value="retirada">Retirada</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
            Forma de Pagamento
          </label>
          <select
            value={paymentMethod || ''}
            onChange={(e) => onPaymentMethodChange(e.target.value || null)}
            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
          >
            <option value="">Selecione...</option>
            {QUOTE_PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={discountEnabled}
            onChange={(e) => onDiscountEnabledChange(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            APLICAR {discountPercent}% DE DESCONTO PROMOCIONAL
          </span>
        </label>

        {discountEnabled && (
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
              Percentual de desconto (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={discountPercent}
              onChange={(e) => onDiscountPercentChange(parseFloat(e.target.value) || 0)}
              className="mt-1 w-32 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// Card 4 - Notas Internas
// ============================================

function NotesSection({
  notes,
  onNotesChange,
}: {
  notes: string;
  onNotesChange: (notes: string) => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-4 py-3">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
          <StickyNote className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
        </div>
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 uppercase">
          Notas Internas
        </h3>
      </div>

      <div className="p-4">
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Observações internas (não aparecem no documento)..."
          rows={3}
          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm dark:text-gray-200 resize-none"
        />
      </div>
    </div>
  );
}
