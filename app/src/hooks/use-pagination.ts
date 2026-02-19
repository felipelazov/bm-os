'use client';

import { useState, useMemo } from 'react';

export interface UsePaginationOptions {
  pageSize?: number;
}

export function usePagination<T>(items: T[], options?: UsePaginationOptions) {
  const pageSize = options?.pageSize ?? 20;
  const [currentPage, setCurrentPage] = useState(1);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Reset to page 1 if current page is out of bounds
  const safePage = currentPage > totalPages ? 1 : currentPage;

  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  return {
    items: paginatedItems,
    currentPage: safePage,
    totalPages,
    totalItems,
    pageSize,
    goToPage,
  };
}
