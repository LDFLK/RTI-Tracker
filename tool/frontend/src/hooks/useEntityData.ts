import { useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Pagination, ListResponse } from '../types/common';

export function useEntityData<T>(
  listFn: (page: number, pageSize: number) => Promise<ListResponse<T>>,
  removeFn: (id: string) => Promise<void>,
  entityLabel: string,
  pageSize: number = 10
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    pageSize,
    totalPages: 1,
    totalItems: 0,
  });

  const loadData = useCallback(async (page: number = 1) => {
    setLoading(true);
    try {
      const res = await listFn(page, pageSize);
      setData(res.data);
      setPagination(res.pagination);
    } catch (e) {
      toast.error((e as Error).message || `Failed to load ${entityLabel.toLowerCase()}s`);
    } finally {
      setLoading(false);
    }
  }, [listFn, entityLabel, pageSize]);

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
  }, [loadData]);

  return {
    data,
    loading,
    pagination,
    loadData,
    confirmDelete,
    setData,
  };
}
