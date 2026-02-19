'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Loader2, Camera, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/formatters';
import {
  uploadDeliverySignature,
  uploadDeliveryPhoto,
  getDeliveryFileUrl,
  completeDelivery,
} from '@/services/logistics/logistics.service';
import { SignaturePad } from '@/components/logistics/signature-pad';
import type { Delivery } from '@/types/logistics.types';

interface DeliveryDetailModalProps {
  delivery: Delivery;
  onClose: () => void;
  onUpdated: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  aguardando: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
  em_rota: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  entregue: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
};

const STATUS_LABELS: Record<string, string> = {
  aguardando: 'Aguardando',
  em_rota: 'Em Rota',
  entregue: 'Entregue',
};

export function DeliveryDetailModal({ delivery, onClose, onUpdated }: DeliveryDetailModalProps) {
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState('');
  const [signatureSaved, setSignatureSaved] = useState(!!delivery.signature_url);
  const [photoSaved, setPhotoSaved] = useState(!!delivery.photo_url);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const address = [
    delivery.client_address,
    delivery.client_address_number,
    delivery.client_neighborhood,
    delivery.client_city,
  ]
    .filter(Boolean)
    .join(', ');

  const showProofSection = delivery.status === 'em_rota' || delivery.status === 'entregue';
  const canComplete = signatureSaved && photoSaved && delivery.status !== 'entregue';

  useEffect(() => {
    async function loadUrls() {
      try {
        if (delivery.signature_url) {
          const url = await getDeliveryFileUrl(delivery.signature_url);
          setSignatureUrl(url);
        }
        if (delivery.photo_url) {
          const url = await getDeliveryFileUrl(delivery.photo_url);
          setPhotoUrl(url);
        }
      } catch {
        // URLs nao carregadas, nao critico
      }
    }
    loadUrls();
  }, [delivery.signature_url, delivery.photo_url]);

  const handleSignatureSave = async (blob: Blob) => {
    try {
      setUploading(true);
      setError('');
      await uploadDeliverySignature(delivery.id, blob);
      setSignatureSaved(true);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar assinatura');
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError('');
      const path = await uploadDeliveryPhoto(delivery.id, file);
      const url = await getDeliveryFileUrl(path);
      setPhotoUrl(url);
      setPhotoSaved(true);
      onUpdated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar foto');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleComplete = async () => {
    try {
      setCompleting(true);
      setError('');
      await completeDelivery(delivery.id);
      onUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao concluir entrega');
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl bg-white dark:bg-gray-800 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="truncate text-lg font-bold text-gray-900 dark:text-gray-100">
              {delivery.client_name}
            </span>
            <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS_COLORS[delivery.status])}>
              {STATUS_LABELS[delivery.status] || delivery.status}
            </span>
            {delivery.sale_id && (
              <span className="shrink-0 rounded-full bg-blue-100 dark:bg-blue-900 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:text-blue-300">
                VENDA
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950 p-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Cliente */}
          <div>
            <h3 className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400 mb-1">
              Cliente
            </h3>
            <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
              <p className="font-medium text-gray-900 dark:text-gray-100">{delivery.client_name}</p>
              {delivery.client_phone && (
                <p>
                  <span className="text-gray-500 dark:text-gray-400">Telefone: </span>
                  {delivery.client_phone}
                </p>
              )}
              {address && (
                <p>
                  <span className="text-gray-500 dark:text-gray-400">Endereco: </span>
                  {address}
                </p>
              )}
            </div>
          </div>

          {/* Pedido */}
          <div>
            <h3 className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400 mb-1">
              Pedido
            </h3>
            <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
              <p>{delivery.items_summary}</p>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-green-600 dark:text-green-400">
                  {formatCurrency(delivery.total)}
                </span>
                {delivery.payment_method && (
                  <span className="text-gray-500 dark:text-gray-400">
                    | {delivery.payment_method}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Logistica */}
          <div>
            <h3 className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400 mb-1">
              Logística
            </h3>
            <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
              {delivery.driver_name && (
                <p>
                  <span className="text-gray-500 dark:text-gray-400">Motorista: </span>
                  {delivery.driver_name}
                </p>
              )}
              {delivery.notes && (
                <p>
                  <span className="text-gray-500 dark:text-gray-400">Observações: </span>
                  {delivery.notes}
                </p>
              )}
              <p>
                <span className="text-gray-500 dark:text-gray-400">Criado em: </span>
                {formatDate(delivery.created_at)}
              </p>
              {delivery.completed_at && (
                <p>
                  <span className="text-gray-500 dark:text-gray-400">Concluido em: </span>
                  {formatDate(delivery.completed_at)}
                </p>
              )}
            </div>
          </div>

          {/* Assinatura do Cliente */}
          {showProofSection && (
            <div>
              <h3 className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400 mb-2">
                Assinatura do Cliente
              </h3>
              {signatureSaved && signatureUrl ? (
                <div className="space-y-2">
                  <img
                    src={signatureUrl}
                    alt="Assinatura do cliente"
                    className="h-48 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white object-contain"
                  />
                  {delivery.status !== 'entregue' && (
                    <SignaturePad
                      onSave={handleSignatureSave}
                      disabled={uploading}
                      existingUrl={signatureUrl}
                    />
                  )}
                </div>
              ) : (
                <SignaturePad
                  onSave={handleSignatureSave}
                  disabled={uploading || delivery.status === 'entregue'}
                />
              )}
              {signatureSaved && (
                <p className="mt-1 flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                  <Check className="h-3 w-3" />
                  Assinatura registrada
                </p>
              )}
            </div>
          )}

          {/* Foto da Entrega */}
          {showProofSection && (
            <div>
              <h3 className="text-xs font-medium uppercase text-gray-500 dark:text-gray-400 mb-2">
                Foto da Entrega
              </h3>
              {photoSaved && photoUrl ? (
                <div className="space-y-2">
                  <img
                    src={photoUrl}
                    alt="Foto da entrega"
                    className="max-h-64 w-full rounded-lg border border-gray-200 dark:border-gray-700 object-contain bg-gray-50 dark:bg-gray-900"
                  />
                  {delivery.status !== 'entregue' && (
                    <>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <Camera className="h-3 w-3" />
                        Tirar nova foto
                      </button>
                    </>
                  )}
                  <p className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                    <Check className="h-3 w-3" />
                    Foto registrada
                  </p>
                </div>
              ) : (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || delivery.status === 'entregue'}
                    className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 p-6 text-gray-400 dark:text-gray-500 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors disabled:opacity-40"
                  >
                    {uploading ? (
                      <Loader2 className="h-8 w-8 animate-spin" />
                    ) : (
                      <>
                        <Camera className="h-8 w-8" />
                        <span className="text-sm font-medium">Tirar foto ou escolher arquivo</span>
                        <span className="text-xs">Toque para abrir a camera</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-200 dark:border-gray-700 px-6 py-4 shrink-0">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            FECHAR
          </button>
          {canComplete && (
            <button
              onClick={handleComplete}
              disabled={completing}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {completing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              CONCLUIR ENTREGA
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
