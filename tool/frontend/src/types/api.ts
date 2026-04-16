export interface Pagination {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
}

export interface ListResponse<T> {
  data: T[];
  pagination: Pagination;
}
