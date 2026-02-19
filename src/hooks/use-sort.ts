'use client';

import { useState, useMemo } from 'react';

export interface SortState {
  key: string;
  direction: 'asc' | 'desc';
}

export function useSort<T>(items: T[], defaultSort?: SortState) {
  const [sort, setSort] = useState<SortState | null>(defaultSort ?? null);

  const toggleSort = (key: string) => {
    setSort((prev) => {
      if (prev?.key === key) {
        return prev.direction === 'asc' ? { key, direction: 'desc' } : null;
      }
      return { key, direction: 'asc' };
    });
  };

  const sorted = useMemo(() => {
    if (!sort) return items;

    return [...items].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sort.key];
      const bVal = (b as Record<string, unknown>)[sort.key];

      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      let comparison = 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal), 'pt-BR', { numeric: true });
      }

      return sort.direction === 'asc' ? comparison : -comparison;
    });
  }, [items, sort]);

  return { sorted, sort, toggleSort };
}
