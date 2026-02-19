'use client';

import { TrendingUp, TrendingDown, Minus, ExternalLink, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MarketSignal } from '@/types/compras.types';

interface MarketSignalCardProps {
  signal: MarketSignal;
  onDelete?: (id: string) => void;
}

const impactConfig = {
  alta: {
    icon: TrendingUp,
    label: '↑ Alta',
    bg: 'bg-red-50 dark:bg-red-950',
    text: 'text-red-700 dark:text-red-400',
    badge: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
  },
  baixa: {
    icon: TrendingDown,
    label: '↓ Baixa',
    bg: 'bg-green-50 dark:bg-green-950',
    text: 'text-green-700 dark:text-green-400',
    badge: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
  },
  estavel: {
    icon: Minus,
    label: '→ Estável',
    bg: 'bg-gray-50 dark:bg-gray-800',
    text: 'text-gray-600 dark:text-gray-400',
    badge: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
  },
};

export function MarketSignalCard({ signal, onDelete }: MarketSignalCardProps) {
  const config = impactConfig[signal.impact];
  const Icon = config.icon;

  return (
    <div className={cn('rounded-xl border border-gray-200 dark:border-gray-700 p-4', config.bg)}>
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', config.badge)}>
            <Icon className="h-3 w-3" />
            {config.label}
          </span>
          {signal.category && (
            <span className="rounded-full bg-blue-100 dark:bg-blue-900 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300">
              {signal.category}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {signal.url && (
            <a
              href={signal.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded p-1 text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700 hover:text-blue-600"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(signal.id)}
              className="rounded p-1 text-gray-400 hover:bg-white/50 dark:hover:bg-gray-700 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <h3 className="mb-1 text-sm font-semibold text-gray-900 dark:text-gray-100">{signal.title}</h3>
      <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">{signal.summary}</p>
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500">
        <span>{signal.source}</span>
        <span>{new Date(signal.published_at).toLocaleDateString('pt-BR')}</span>
      </div>
    </div>
  );
}
