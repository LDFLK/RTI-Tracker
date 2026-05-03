import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { statusService } from '../services/statusService';
import { RTIStatus } from '../types/db';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { FieldError } from '../components/FieldError';
import { Column } from '../types/table';

export function Statuses() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<RTIStatus[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalItems: 0, pageSize: 10 });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RTIStatus | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    id: '',
    name: ''
  });
  const [showErrors, setShowErrors] = useState(false);

  const loadData = async (page = pagination.page, pageSize = pagination.pageSize) => {
    setLoading(true);
    try {
      const res = await statusService.list(page, pageSize);
      setData(res.data);
      setPagination(p => ({ ...p, ...res.pagination }));
    } catch (e) {
      toast.error('Failed to load statuses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(pagination.page, pagination.pageSize);
  }, [pagination.page, pagination.pageSize]);

  const handleOpenModal = (item?: RTIStatus) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        id: item.id,
        name: item.name
      });
    } else {
      setEditingItem(null);
      setFormData({
        id: '',
        name: ''
      });
    }
    setShowErrors(false);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      setShowErrors(true);
      return;
    }

    try {
      if (editingItem) {
        await statusService.update(editingItem.id, formData);
        toast.success('Status updated successfully');
      } else {
        await statusService.create(formData);
        toast.success('Status created successfully');
      }
      setIsModalOpen(false);
      loadData();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save status');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await statusService.remove(deleteId);
      toast.success('Status deleted successfully');
      loadData(data.length === 1 && pagination.page > 1 ? pagination.page - 1 : pagination.page);
    } catch (e) {
      toast.error('Failed to delete status');
    } finally {
      setDeleteId(null);
    }
  };

  const columns: Column<RTIStatus>[] = [
    {
      header: 'Name',
      accessor: 'name',
      className: 'font-medium text-gray-900'
    }
  ];

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Statuses</h1>
          <p className="text-sm text-gray-600 mt-1">Manage RTI request lifecycle statuses.</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <DataTable
          title="Status"
          onAdd={() => handleOpenModal()}
          data={data}
          columns={columns}
          loading={loading}
          pagination={pagination}
          onPageChange={(p) => setPagination(prev => ({ ...prev, page: p }))}
          onPageSizeChange={(size) => setPagination(prev => ({ ...prev, page: 1, pageSize: size }))}
          onEdit={handleOpenModal}
          onDelete={(item) => setDeleteId(item.id)}
        />
      </div>

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Status' : 'Add Status'}
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <Input
              label="Status Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. In Review"
            />
            {showErrors && !formData.name && <FieldError error="Name is required" />}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Status?"
        message="Are you sure you want to delete this status? If this status is used in existing history events, they might not display correctly."
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
