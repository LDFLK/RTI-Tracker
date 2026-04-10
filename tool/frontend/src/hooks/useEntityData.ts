import { useState, useCallback, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { Pagination, ListResponse } from '../types/api';

export function useEntityData<T>(
  listFn: (page: number, pageSize: number, search?: string) => Promise<ListResponse<T>>,
  removeFn: (id: string) => Promise<void>,
  entityLabel: string,
  pageSize: number = 10
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize,
    totalPages: 1,
    totalItems: 0,
  });

  const loadData = useCallback(async (page: number = 1, search: string = searchTerm) => {
    setLoading(true);
    try {
      const res = await listFn(page, pageSize, search);
      setData(res.data);
      setPagination(res.pagination);
    } catch (e) {
      toast.error((e as Error).message || `Failed to load ${entityLabel.toLowerCase()}s`);
    } finally {
      setLoading(false);
    }
  }, [listFn, entityLabel, pageSize, searchTerm]);

  // Debounced search
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();
  const onSearch = (value: string) => {
    setSearchTerm(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      loadData(1, value);
    }, 500);
  };

  const confirmDelete = useCallback(async (id: string) => {
    try {
      await removeFn(id);
      toast.success(`${entityLabel} deleted`);
      
      const pageToFetch = data.length === 1 && pagination.page > 1 
        ? pagination.page - 1 
        : pagination.page;
        
      await loadData(pageToFetch);
    } catch (e) {
      toast.error((e as Error).message || `Failed to delete ${entityLabel.toLowerCase()}`);
    }
  }, [removeFn, entityLabel, data.length, pagination.page, loadData]);

  useEffect(() => {
    loadData(1);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [listFn]);

  return {
    data,
    loading,
    searchTerm,
    onSearch,
    pagination,
    onPageChange: loadData,
    confirmDelete,
    setData,
  };
}
