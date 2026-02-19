'use client';

import { useState } from 'react';
import { X, Loader2, Send } from 'lucide-react';
import type { Client } from '@/types/clients.types';

interface ClientMessageModalProps {
  clients: Client[];
  onClose: () => void;
  onSent: () => void;
}

export function ClientMessageModal({ clients, onClose, onSent }: ClientMessageModalProps) {
  const [message, setMessage] = useState(
    'Olá {nome_cliente}! Temos novidades especiais para você. Entre em contato conosco para saber mais!'
  );
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');

  const handleSend = async () => {
    try {
      setSending(true);
      setError('');
      setProgress(`Enviando para ${clients.length} cliente(s)...`);

      const res = await fetch('/api/whatsapp/send-client-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientIds: clients.map((c) => c.id),
          customMessage: message,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Erro ao enviar');

      setProgress(`Enviado para ${result.sent} de ${result.total} cliente(s)`);
      if (result.errors?.length > 0) {
        setError(`Falhas: ${result.errors.join('; ')}`);
      }

      setTimeout(() => {
        onSent();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar mensagens');
      setProgress('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-lg rounded-xl bg-white dark:bg-gray-800 shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Enviar WhatsApp — {clients.length} cliente(s)
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

        {progress && (
          <div className="mx-4 mt-4 rounded-lg bg-blue-50 dark:bg-blue-950 p-3 text-sm text-blue-600 dark:text-blue-400">
            {progress}
          </div>
        )}

        <div className="p-4">
          <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Mensagem personalizada
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-200 focus:border-green-500 focus:ring-1 focus:ring-green-500"
          />
          <p className="mt-1 text-xs text-gray-400">
            Use <code className="rounded bg-gray-100 dark:bg-gray-700 px-1">{'{nome_cliente}'}</code> para inserir o nome do cliente automaticamente.
            Variações anti-bloqueio são aplicadas automaticamente.
          </p>

          <div className="mt-3 rounded-lg bg-gray-50 dark:bg-gray-900 p-3">
            <p className="mb-1 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Destinatários</p>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {clients.map((c) => (
                <div key={c.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300">{c.name}</span>
                  <span className="text-xs text-gray-400">{c.whatsapp}</span>
                </div>
              ))}
            </div>
          </div>
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
