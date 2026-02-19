'use client';

import { useState } from 'react';
import type { DreCategory, DreCategoryType } from '@/types/dre.types';
import { DRE_CATEGORY_LABELS } from '@/lib/constants';
import { Plus, Trash2 } from 'lucide-react';

interface EntryFormData {
  category_id: string;
  description: string;
  value: number;
}

interface DreEntryFormProps {
  categories: DreCategory[];
  onSubmit: (entries: EntryFormData[]) => void;
  isSubmitting: boolean;
}

export function DreEntryForm({ categories, onSubmit, isSubmitting }: DreEntryFormProps) {
  const [entries, setEntries] = useState<EntryFormData[]>([
    { category_id: '', description: '', value: 0 },
  ]);

  const addEntry = () => {
    setEntries([...entries, { category_id: '', description: '', value: 0 }]);
  };

  const removeEntry = (index: number) => {
    setEntries(entries.filter((_, i) => i !== index));
  };

  const updateEntry = (index: number, field: keyof EntryFormData, value: string | number) => {
    const updated = [...entries];
    updated[index] = { ...updated[index], [field]: value };
    setEntries(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const valid = entries.filter((e) => e.category_id && e.description && e.value > 0);
    if (valid.length > 0) onSubmit(valid);
  };

  // Agrupa categorias por tipo
  const groupedCategories = categories.reduce<Record<string, DreCategory[]>>((acc, cat) => {
    const group = DRE_CATEGORY_LABELS[cat.type] ?? cat.type;
    if (!acc[group]) acc[group] = [];
    acc[group].push(cat);
    return acc;
  }, {});

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {entries.map((entry, idx) => (
        <div key={idx} className="flex items-end gap-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Categoria</label>
            <select
              value={entry.category_id}
              onChange={(e) => updateEntry(idx, 'category_id', e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              required
            >
              <option value="">Selecione...</option>
              {Object.entries(groupedCategories).map(([group, cats]) => (
                <optgroup key={group} label={group}>
                  {cats.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descrição</label>
            <input
              type="text"
              value={entry.description}
              onChange={(e) => updateEntry(idx, 'description', e.target.value)}
              placeholder="Ex: Vendas de produtos"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              required
            />
          </div>
          <div className="w-48">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Valor (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={entry.value || ''}
              onChange={(e) => updateEntry(idx, 'value', parseFloat(e.target.value) || 0)}
              placeholder="0,00"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-right tabular-nums focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              required
            />
          </div>
          {entries.length > 1 && (
            <button
              type="button"
              onClick={() => removeEntry(idx)}
              className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:text-gray-500 dark:hover:bg-red-900/30 dark:hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={addEntry}
          className="flex items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:border-blue-300 hover:text-blue-600 dark:border-gray-600 dark:text-gray-400 dark:hover:border-blue-500 dark:hover:text-blue-400"
        >
          <Plus className="h-4 w-4" />
          Adicionar Lançamento
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Salvando...' : 'Salvar Lançamentos'}
        </button>
      </div>
    </form>
  );
}
