import { Pencil, Trash2, Plus, Search } from 'lucide-react';
import { Button } from './Button';
import { Pagination as PaginationComponent } from './Pagination';
import { TableProps } from '../types/table';

const TableHeader = ({
  title,
  onAdd,
  searchTerm,
  onSearch
}: {
  title: string;
  onAdd: () => void;
  searchTerm?: string;
  onSearch?: (v: string) => void;
}) => (
  <div className="p-3 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between gap-3">
    <div className="font-semibold text-xs uppercase tracking-wider text-gray-500">{title} List</div>
    <div className="flex items-center gap-3 flex-1 justify-end">
      {onSearch && (
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={`Search ${title.toLowerCase()}s...`}
            value={searchTerm || ''}
            onChange={(e) => onSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900/10 focus:border-blue-900 transition-all"
          />
        </div>
      )}
      <Button onClick={onAdd} size="sm" className="flex items-center gap-2 whitespace-nowrap">
        <Plus className="w-4 h-4" /> New {title}
      </Button>
    </div>
  </div>
);

export function DataTable<T>({
  title,
  onAdd,
  searchTerm,
  onSearch,
  data,
  columns,
  onEdit,
  onDelete,
  loading,
  loadingMessage = "Loading...",
  emptyMessage = "No data found.",
  rowKey = 'id' as any,
  pagination,
  onPageChange
}: TableProps<T>) {

  const getKey = (item: T): string => {
    if (typeof rowKey === 'function') return rowKey(item);
    return (item as any)[rowKey] as string;
  };

  let content;
  if (loading) {
    content = <div className="p-10 text-center text-sm text-gray-500">{loadingMessage}</div>;
  } else if (data.length === 0) {
    content = <div className="p-10 text-center text-sm text-gray-500">{emptyMessage}</div>;
  } else {
    content = (
      <div className="overflow-x-auto overflow-y-auto max-h-[370px]">
        <table className="min-w-full text-sm border-separate border-spacing-0">
          <thead className="bg-white sticky top-0 z-10">
            <tr className="text-left text-xs uppercase tracking-wider text-gray-500 border-b border-gray-100">
              {columns.map((col, i) => (
                <th key={i} className={`px-4 py-3 bg-white border-b border-gray-100 ${col.headerClassName || ''}`}>
                  {col.header}
                </th>
              ))}
              {(onEdit || onDelete) && <th className="px-4 py-3 bg-white border-b border-gray-100 w-[140px]">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((item) => (
              <tr key={getKey(item)} className="hover:bg-gray-50/50">
                {columns.map((col, i) => (
                  <td key={i} className={`px-4 py-3 ${col.className || ''}`}>
                    {col.accessor ? String((item as any)[col.accessor] ?? '-') : '-'}
                  </td>
                ))}
                {(onEdit || onDelete) && (
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {onEdit && (
                        <Button variant="outline" size="sm" className="px-2" onClick={() => onEdit(item)} title="Edit">
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button variant="danger" size="sm" className="px-2" onClick={() => onDelete(item)} title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {title && <TableHeader title={title} onAdd={onAdd!} searchTerm={searchTerm} onSearch={onSearch} />}
      {content}
      {pagination && !loading && pagination.totalPages > 1 && onPageChange && (
        <div className="p-3 border-t border-gray-100 bg-gray-50/30">
          <PaginationComponent
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  );
}
