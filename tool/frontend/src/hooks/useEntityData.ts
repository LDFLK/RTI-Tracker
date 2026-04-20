import { useState, useCallback, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Pagination, ListResponse } from '../types/api';

const SEARCH_DEBOUNCE_MS = 500;

export function useEntityData<T>(
  listFn: (page: number, pageSize: number, search?: string) => Promise<ListResponse<T>>,
  removeFn: (id: string) => Promise<void>,
  entityLabel: string,
  initialPageSize: number = 10
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize: initialPageSize,
    totalPages: 1,
    totalItems: 0,
  });

  const dataRef = useRef<T[]>([]);
  dataRef.current = data;

  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  const fetchData = useCallback(async (page: number, size: number, search: string) => {
    if (dataRef.current.length === 0) {
      setLoading(true);
    }

    try {
      const res = await listFn(page, size, search);
      setData(res.data);
      setPagination(res.pagination);
    } catch (e) {
      toast.error((e as Error).message || `Failed to load ${entityLabel.toLowerCase()}s`);
    } finally {
      setLoading(false);
    }
  }, [entityLabel, listFn]);

  useEffect(() => {
    fetchData(1, initialPageSize, '');
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [fetchData, initialPageSize]);

  const onPageChange = (page: number) => {
    setPagination(p => ({ ...p, page }));
    fetchData(page, pagination.pageSize, searchTerm);
  };

  const onPageSizeChange = (newSize: number) => {
    setPagination(p => ({ ...p, page: 1, pageSize: newSize }));
    fetchData(1, newSize, searchTerm);
  };

  const onSearch = (value: string) => {
    setSearchTerm(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const delay = value ? SEARCH_DEBOUNCE_MS : 0;
    searchTimer.current = setTimeout(() => {
      fetchData(1, pagination.pageSize, value);
    }, delay);
  };

  const refresh = useCallback(async (resetSearch = false) => {
    const nextSearch = resetSearch ? '' : searchTerm;
    if (resetSearch) setSearchTerm('');
    setPagination(p => ({ ...p, page: 1 }));
    await fetchData(1, pagination.pageSize, nextSearch);
  }, [fetchData, pagination.pageSize, searchTerm]);

  const confirmDelete = useCallback(async (id: string) => {
    try {
      await removeFn(id);
      toast.success(`${entityLabel} deleted`);

      const pageToFetch = dataRef.current.length === 1 && pagination.page > 1
        ? pagination.page - 1
        : pagination.page;

      fetchData(pageToFetch, pagination.pageSize, searchTerm);
    } catch (e) {
      toast.error((e as Error).message || `Failed to delete ${entityLabel.toLowerCase()}`);
    }
  }, [removeFn, entityLabel, pagination.page, pagination.pageSize, searchTerm, fetchData]);

  return {
    data,
    loading,
    searchTerm,
    onSearch,
    pagination,
    onPageChange,
    onPageSizeChange,
    confirmDelete,
    refresh,
    setData,
  };
}
