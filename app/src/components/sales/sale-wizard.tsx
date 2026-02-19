'use client';

import { useState } from 'react';
import { X, User, Loader2, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/formatters';
import { createSale, updateSalePayment } from '@/services/sales/sales.service';
import { StepClient } from './step-client';
import { StepProducts } from './step-products';
import { StepDelivery } from './step-delivery';
import { StepPayment } from './step-payment';
import type { Client } from '@/types/clients.types';
import type { SaleItem, DeliveryType, PaymentStatus } from '@/types/sales.types';

const STEPS = [
  { key: 'client', label: 'Cliente' },
  { key: 'products', label: 'Produtos' },
  { key: 'delivery', label: 'Entrega' },
  { key: 'payment', label: 'Pagamento' },
] as const;

interface SaleWizardProps {
  onClose: () => void;
  onCreated: () => void;
  editMode?: {
    saleId: string;
    currentPaymentStatus: PaymentStatus;
    currentPaymentMethod: string | null;
    itemsTotal: number;
    freightAmount: number;
  };
}

export function SaleWizard({ onClose, onCreated, editMode }: SaleWizardProps) {
  const [step, setStep] = useState(editMode ? 3 : 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Step 1 — Client
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Step 2 — Products
  const [items, setItems] = useState<SaleItem[]>([]);

  // Step 3 — Delivery
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('entrega');
  const [deliveryLocationId, setDeliveryLocationId] = useState<string | null>(null);
  const [freightEnabled, setFreightEnabled] = useState(false);
  const [freightAmount, setFreightAmount] = useState(0);

  // Step 4 — Payment
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(
    editMode?.currentPaymentStatus ?? 'pendente'
  );
  const [paymentMethod, setPaymentMethod] = useState(
    editMode?.currentPaymentMethod ?? ''
  );

  const itemsTotal = editMode ? editMode.itemsTotal : items.reduce((sum, i) => sum + i.total_price, 0);
  const currentFreight = editMode
    ? editMode.freightAmount
    : freightEnabled ? freightAmount : 0;
  const total = itemsTotal + currentFreight;

  const canAdvance = () => {
    switch (step) {
      case 0: return !!selectedClient;
      case 1: return items.length > 0;
      case 2: return deliveryType === 'entrega' || !!deliveryLocationId;
      case 3: return true;
      default: return false;
    }
  };

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0 && !editMode) setStep(step - 1);
  };

  const handleFinalize = async () => {
    try {
      setSaving(true);
      setError('');

      if (editMode) {
        await updateSalePayment(editMode.saleId, {
          payment_status: paymentStatus,
          payment_method: paymentMethod || undefined,
        });
      } else {
        await createSale({
          client_id: selectedClient!.id,
          items,
          delivery_type: deliveryType,
          delivery_location_id: deliveryType === 'retirada' ? deliveryLocationId ?? undefined : undefined,
          freight_enabled: freightEnabled,
          freight_amount: freightEnabled ? freightAmount : 0,
          payment_status: paymentStatus,
          payment_method: paymentMethod,
        });
      }

      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar venda');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 flex h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white dark:bg-gray-900 shadow-2xl">
        {/* Header */}
        <div className="shrink-0 border-b border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {selectedClient && !editMode ? (
                <>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                    <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">{selectedClient.name}</p>
                    <button
                      onClick={() => setStep(0)}
                      className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      TROCAR CLIENTE
                    </button>
                  </div>
                </>
              ) : (
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {editMode ? 'Editar Pagamento' : 'Nova Venda (VP)'}
                </h2>
              )}
            </div>
            <div className="flex items-center gap-4">
              {total > 0 && (
                <div className="text-right">
                  <p className="text-xs text-gray-500 dark:text-gray-400">TOTAL</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(total)}
                  </p>
                </div>
              )}
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Step Indicator */}
          {!editMode && (
            <div className="mt-4 flex items-center gap-2">
              {STEPS.map((s, i) => (
                <div key={s.key} className="flex items-center gap-2">
                  <div className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium',
                    i === step
                      ? 'bg-blue-600 text-white'
                      : i < step
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-400'
                        : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
                  )}>
                    {i + 1}
                  </div>
                  <span className={cn(
                    'text-xs font-medium',
                    i === step
                      ? 'text-gray-900 dark:text-gray-100'
                      : 'text-gray-400 dark:text-gray-500'
                  )}>
                    {s.label}
                  </span>
                  {i < STEPS.length - 1 && (
                    <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-950 p-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {step === 0 && (
            <StepClient
              selectedClient={selectedClient}
              onSelect={(client) => {
                setSelectedClient(client);
                setStep(1);
              }}
            />
          )}

          {step === 1 && (
            <StepProducts items={items} onItemsChange={setItems} />
          )}

          {step === 2 && (
            <StepDelivery
              deliveryType={deliveryType}
              deliveryLocationId={deliveryLocationId}
              freightEnabled={freightEnabled}
              freightAmount={freightAmount}
              onDeliveryTypeChange={setDeliveryType}
              onLocationChange={setDeliveryLocationId}
              onFreightEnabledChange={setFreightEnabled}
              onFreightAmountChange={setFreightAmount}
            />
          )}

          {step === 3 && (
            <StepPayment
              paymentStatus={paymentStatus}
              paymentMethod={paymentMethod}
              itemsTotal={itemsTotal}
              freightAmount={currentFreight}
              onPaymentStatusChange={setPaymentStatus}
              onPaymentMethodChange={setPaymentMethod}
            />
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center justify-between">
            <div>
              {step > 0 && !editMode && (
                <button
                  onClick={handleBack}
                  className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                >
                  VOLTAR
                </button>
              )}
              {editMode && (
                <button
                  onClick={onClose}
                  className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                >
                  SAIR
                </button>
              )}
            </div>
            <div>
              {step < 3 ? (
                <button
                  onClick={handleNext}
                  disabled={!canAdvance()}
                  className="rounded-lg bg-gray-900 dark:bg-gray-100 px-6 py-2.5 text-sm font-medium text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  PROXIMO PASSO
                </button>
              ) : (
                <button
                  onClick={handleFinalize}
                  disabled={saving}
                  className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {saving ? 'Salvando...' : 'FINALIZAR VENDA'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
