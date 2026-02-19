'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Send } from 'lucide-react';
import { getSupplierItems } from '@/services/compras/suppliers.service';
import type { Supplier, SupplierItem } from '@/types/compras.types';

interface QuoteMessageModalProps {
  supplier: Supplier;
  onClose: () => void;
  onSent: () => void;
}

export function QuoteMessageModal({ supplier, onClose, onSent }: QuoteMessageModalProps) {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function buildMessage() {
      try {
        const items = await getSupplierItems(supplier.id);

        if (items.length === 0) {
          setError('Nenhum item vinculado a este fornecedor. Vincule itens antes de solicitar cotação.');
          setLoading(false);
          return;
        }

        const itemList = items
          .map((si: SupplierItem, i: number) => {
            const item = si.purchase_item;
            return `${i + 1}. ${item?.name ?? 'Item'} (${item?.unit ?? 'un'})`;
          })
          .join('\n');

        // Buscar nome da empresa via API
        let companyName = 'nossa empresa';
        try {
          const res = await fetch('/api/tenant/info');
          if (res.ok) {
            const data = await res.json();
            if (data.name) companyName = data.name;
          }
        } catch {
          // usa fallback
        }

        const defaultMessage =
          `Olá! Somos a ${companyName}. Gostaríamos de cotação para:\n\n${itemList}\n\nPor favor, envie os preços unitários atualizados. Obrigado!`;

        setMessage(defaultMessage);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar itens');
      } finally {
        setLoading(false);
      }
    }
    buildMessage();
  }, [supplier.id]);

  const handleSend = async () => {
    try {
      setSending(true);
      setError('');

      const res = await fetch('/api/whatsapp/send-quote-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: supplier.id,
          customMessage: message,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Erro ao enviar');

      onSent();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar cotação');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-lg rounded-xl bg-white dark:bg-gray-800 shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Cotação — {supplier.name}
          </h3>
          <button onClick={onClose}>
            <X className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
          </button>
        </div>

        {error && (
          <div className="mx-4 mt-4 rounded-lg bg-red-50 dark:bg-red-950 p-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : !error || message ? (
            <>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Mensagem para o fornecedor
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={10}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-200 focus:border-green-500 focus:ring-1 focus:ring-green-500"
              />
              <p className="mt-1 text-xs text-gray-400">
                WhatsApp: {supplier.whatsapp}
              </p>
            </>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-200 dark:border-gray-700 p-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancelar
          </button>
          <button
            onClick={handleSend}
            disabled={sending || !message}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {sending ? 'Enviando...' : 'Enviar via WhatsApp'}
          </button>
        </div>
      </div>
    </div>
  );
}
