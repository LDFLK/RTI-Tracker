import { Pencil, Trash2, Plus, Search, Eye } from 'lucide-react';
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
  onView,
  onEdit,
  onDelete,
  loading,
  loadingMessage = "Loading...",
  emptyMessage = "No data found.",
  pagination,
  onPageChange,
  onPageSizeChange
}: TableProps<T> & { onView?: (item: T) => void }) {

  let content;
  if (loading && data.length === 0) {
    content = <div className="p-10 text-center text-sm text-gray-500">{loadingMessage}</div>;
  } else if (data.length === 0) {
    content = <div className="p-10 text-center text-sm text-gray-500">{emptyMessage}</div>;
  } else {
    content = (
      <div className="overflow-x-auto overflow-y-auto max-h-[370px] relative">
        {loading && (
          <div className="absolute inset-0 bg-white/40 z-20 flex items-center justify-center backdrop-blur-[1px]">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-4 border-blue-900/20 border-t-blue-900 rounded-full animate-spin"></div>
              <span className="text-xs font-semibold text-blue-900 uppercase tracking-widest">Refreshing</span>
            </div>
          </div>
        )}
        <table className="min-w-full text-sm border-separate border-spacing-0">
          <thead className="bg-white sticky top-0 z-10">
            <tr className="text-left text-xs uppercase tracking-wider text-gray-500 border-b border-gray-100">
              {columns.map((col, i) => (
                <th key={i} className={`px-4 py-3 bg-white border-b border-gray-100 ${col.headerClassName || ''}`}>
                  {col.header}
                </th>
              ))}
              {(onView || onEdit || onDelete) && <th className="px-4 py-3 bg-white border-b border-gray-100 w-[140px]">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((item, rowIndex) => (
              <tr key={(item as any).id} className="hover:bg-gray-50/50">
                {columns.map((col, i) => (
                  <td key={i} className={`px-4 py-3 ${col.className || ''}`}>
                    {col.render ? col.render(item, rowIndex) : (col.accessor ? String((item as any)[col.accessor] ?? '-') : '-')}
                  </td>
                ))}

                {(onView || onEdit || onDelete) && (
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {onView && (
                        <Button variant="outline" size="sm" className="px-2" onClick={() => onView(item)} title="View">
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
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
      {pagination && data.length > 0 && onPageChange && (
        <PaginationComponent
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          pageSize={pagination.pageSize}
          totalItems={pagination.totalItems}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          variant="full"
          loading={loading}
        />
      )}
    </div>
  );
}

