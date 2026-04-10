import { Pagination } from './api';

export interface Column<T> {
  header: string;
  accessor?: keyof T;
  className?: string;
  headerClassName?: string;
}

export interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  loading?: boolean;
  loadingMessage?: string;
  emptyMessage?: string;
  rowKey?: keyof T | ((item: T) => string);
  pagination?: Pagination;
  onPageChange?: (page: number) => void;
  title?: string;
  onAdd?: () => void;
  searchTerm?: string;
  onSearch?: (value: string) => void;
}
