import { useState, useCallback } from 'react';

interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function usePagination(initialPageSize = 20) {
  const [state, setState] = useState<PaginationState>({
    page: 1,
    pageSize: initialPageSize,
    total: 0,
    totalPages: 1,
  });

  const setPage = useCallback((page: number) => {
    setState((s) => ({ ...s, page }));
  }, []);

  const setMeta = useCallback((total: number, totalPages: number) => {
    setState((s) => ({ ...s, total, totalPages }));
  }, []);

  const reset = useCallback(() => {
    setState((s) => ({ ...s, page: 1 }));
  }, []);

  return { ...state, setPage, setMeta, reset };
}
