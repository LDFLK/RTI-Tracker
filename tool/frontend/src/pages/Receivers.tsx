import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';
import { SearchableSelect } from '../components/SearchableSelect';
import { DataTable } from '../components/DataTable';
import { TabButton } from '../components/TabButton';
import { receiversService } from '../services/receiversService';
import { Institution, Position, Receiver } from '../types/db';
import { useEntityData } from '../hooks/useEntityData';
import { Column } from '../types/table';

type TabKey = 'receivers' | 'institutions' | 'positions';

export function Receivers() {
  const [tab, setTab] = useState<TabKey>('receivers');

  // Entities Hook Instances
  const receiversHook = useEntityData(receiversService.listReceivers, receiversService.removeReceiver, 'Receiver');
  const institutionsHook = useEntityData(receiversService.listInstitutions, receiversService.removeInstitution, 'Institution');
  const positionsHook = useEntityData(receiversService.listPositions, receiversService.removePosition, 'Position');

  // Deletion state
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: TabKey } | null>(null);

  // Receiver Form/Modal State
  const [receiverEdit, setReceiverEdit] = useState<Receiver | null>(null);
  const [receiverModalOpen, setReceiverModalOpen] = useState(false);
  const [receiverForm, setReceiverForm] = useState({
    institutionId: '', positionId: '', email: '', contactNo: '', address: ''
  });

  // Institution/Position Shared Modal State
  const [nameModal, setNameModal] = useState<{ open: boolean; edit: Institution | Position | null; type: 'institution' | 'position'; name: string }>({
    open: false, edit: null, type: 'institution', name: ''
  });

  const [isRedirecting, setIsRedirecting] = useState<'institution' | 'position' | null>(null);

  // Column Definitions
  const receiverColumns: Column<Receiver>[] = useMemo(() => [
    { header: 'Institution', accessor: 'institutionName', className: 'font-medium text-gray-900' },
    { header: 'Position', accessor: 'positionName', className: 'text-gray-700' },
    { header: 'Email', accessor: 'email', className: 'text-gray-600' },
    { header: 'Contact No', accessor: 'contactNo', className: 'text-gray-600' },
    { header: 'Address', accessor: 'address', className: 'text-gray-600' },
  ], []);

  const simpleEntityColumns = useMemo(() => [
    { header: 'Name', accessor: 'name' as any, className: 'font-medium text-gray-900' }
  ], []);

  // Handlers
  const startRedirect = (type: 'institution' | 'position', name: string) => {
    setIsRedirecting(type);
    setNameModal({ open: true, edit: null, type, name });
    setReceiverModalOpen(false);
    setTab(type === 'institution' ? 'institutions' : 'positions');
  };

  const openReceiverModal = (r?: Receiver) => {
    setReceiverEdit(r || null);
    setReceiverForm({
      institutionId: r?.institutionId || '',
      positionId: r?.positionId || '',
      email: r?.email || '',
      contactNo: r?.contactNo || '',
      address: r?.address || ''
    });
    setReceiverModalOpen(true);
  };

  const saveReceiver = async () => {
    const { institutionId, positionId, email, contactNo, address } = receiverForm;
    const payload = {
      institutionId, positionId,
      email: email.trim() || null,
      contactNo: contactNo.trim() || null,
      address: address.trim() || null
    };

    if (!payload.institutionId || !payload.positionId) return toast.error('Institution and Position are required');
    if (!payload.email && !payload.contactNo) return toast.error('Email or Contact No is required');

    if (payload.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      return toast.error('Please enter a valid email address');
    }

    try {
      if (receiverEdit) await receiversService.updateReceiver(receiverEdit.id, payload);
      else await receiversService.createReceiver(payload);

      toast.success(`Receiver ${receiverEdit ? 'updated' : 'created'}`);
      setReceiverModalOpen(false);
      receiversHook.onPageChange(receiversHook.pagination.page);
    } catch (e) {
      toast.error((e as Error).message || 'Failed to save receiver');
    }
  };

  const openNameModal = (type: 'institution' | 'position', item?: Institution | Position) => {
    setNameModal({ open: true, edit: item || null, type, name: item?.name || '' });
  };

  const saveNameEntity = async () => {
    const { type, name, edit } = nameModal;
    const trimmed = name.trim();
    if (!trimmed) return toast.error('Name is required');

    // Duplicate Validation
    const list = type === 'institution' ? institutionsHook.data : positionsHook.data;
    const duplicate = list.find(i => (i as any).name.toLowerCase() === trimmed.toLowerCase() && (i as any).id !== edit?.id);

    if (duplicate) {
      toast.error(`${type.charAt(0).toUpperCase() + type.slice(1)} "${trimmed}" already exists.`);
      if (!edit && isRedirecting === type) {
        setReceiverForm(s => ({ ...s, [`${type}Id`]: (duplicate as any).id }));
        setTab('receivers');
        setReceiverModalOpen(true);
      }
      setNameModal(s => ({ ...s, open: false }));
      setIsRedirecting(null);
      return;
    }

    try {
      let res: any;
      if (type === 'institution') {
        res = edit ? await receiversService.updateInstitution(edit.id, { name: trimmed }) : await receiversService.createInstitution({ name: trimmed });
        await institutionsHook.onPageChange(institutionsHook.pagination.page);
      } else {
        res = edit ? await receiversService.updatePosition(edit.id, { name: trimmed }) : await receiversService.createPosition({ name: trimmed });
        await positionsHook.onPageChange(positionsHook.pagination.page);
      }

      toast.success(`${type} ${edit ? 'updated' : 'created'}`);

      if (!edit && isRedirecting === type && res) {
        setReceiverForm(s => ({ ...s, [`${type}Id`]: res.id }));
        setTab('receivers');
        setReceiverModalOpen(true);
      }
      setNameModal(s => ({ ...s, open: false }));
      setIsRedirecting(null);
    } catch (e) {
      toast.error((e as Error).message || `Failed to save ${type}`);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const { id, type } = deleteConfirm;
    if (type === 'receivers') await receiversHook.confirmDelete(id);
    else if (type === 'institutions') await institutionsHook.confirmDelete(id);
    else await positionsHook.confirmDelete(id);
    setDeleteConfirm(null);
  };

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div className="min-w-[200px]">
          <h1 className="text-2xl font-bold text-gray-900">Receivers</h1>
          <p className="text-sm text-gray-600 mt-1">Manage receivers, institutions, and positions.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['receivers', 'institutions', 'positions'] as TabKey[]).map(t => (
          <TabButton key={t} active={tab === t} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </TabButton>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        {tab === 'receivers' && (
          <DataTable
            title="Receiver"
            onAdd={() => openReceiverModal()}
            {...receiversHook}
            columns={receiverColumns}
            onEdit={openReceiverModal}
            onDelete={r => setDeleteConfirm({ id: r.id, type: 'receivers' })}
          />
        )}

        {(tab === 'institutions' || tab === 'positions') && (
          <DataTable
            title={tab === 'institutions' ? 'Institution' : 'Position'}
            onAdd={() => openNameModal(tab === 'institutions' ? 'institution' : 'position')}
            {...(tab === 'institutions' ? institutionsHook : positionsHook)}
            searchTerm={undefined}
            onSearch={undefined}
            columns={simpleEntityColumns}
            onEdit={item => openNameModal(tab === 'institutions' ? 'institution' : 'position', item as any)}
            onDelete={item => setDeleteConfirm({ id: (item as any).id, type: tab })}
          />
        )}
      </div>

      <ConfirmDialog
        open={!!deleteConfirm}
        title={`Delete ${deleteConfirm?.type.slice(0, -1)}?`}
        message={`Are you sure you want to delete this ${deleteConfirm?.type.slice(0, -1)}?`}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        confirmText="Delete"
      />

      <Modal
        open={receiverModalOpen}
        title={receiverEdit ? 'Edit Receiver' : 'New Receiver'}
        onClose={() => setReceiverModalOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setReceiverModalOpen(false)}>Cancel</Button>
            <Button onClick={saveReceiver}>{receiverEdit ? 'Save Changes' : 'Create Receiver'}</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Institution</label>
            <SearchableSelect
              placeholder="Select institution"
              value={receiverForm.institutionId}
              onChange={id => setReceiverForm(s => ({ ...s, institutionId: id }))}
              options={institutionsHook.data as any}
              onAddSpecial={n => startRedirect('institution', n)}
              addLabel="Add Institution"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Position</label>
            <SearchableSelect
              placeholder="Select position"
              value={receiverForm.positionId}
              onChange={id => setReceiverForm(s => ({ ...s, positionId: id }))}
              options={positionsHook.data as any}
              onAddSpecial={n => startRedirect('position', n)}
              addLabel="Add Position"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</label>
            <input
              type="email"
              className="px-3 py-2 rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-900"
              value={receiverForm.email}
              onChange={e => setReceiverForm(s => ({ ...s, email: e.target.value }))}
              placeholder="receiver@example.com"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact No</label>
            <input
              className="px-3 py-2 rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-900"
              value={receiverForm.contactNo}
              onChange={e => setReceiverForm(s => ({ ...s, contactNo: e.target.value.replace(/[^0-9\-]/g, '') }))}
              placeholder="Phone number"
            />
          </div>
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Address</label>
            <input
              className="px-3 py-2 rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-900"
              value={receiverForm.address}
              onChange={e => setReceiverForm(s => ({ ...s, address: e.target.value }))}
              placeholder="Address (optional)"
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={nameModal.open}
        title={`${nameModal.edit ? 'Edit' : 'New'} ${nameModal.type}`}
        onClose={() => setNameModal(s => ({ ...s, open: false }))}
        footer={
          <>
            <Button variant="secondary" onClick={() => setNameModal(s => ({ ...s, open: false }))}>Cancel</Button>
            <Button onClick={saveNameEntity}>{nameModal.edit ? 'Save Changes' : 'Create'}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</label>
          <input
            className="px-3 py-2 rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-900"
            value={nameModal.name}
            onChange={e => setNameModal(s => ({ ...s, name: e.target.value }))}
            placeholder="Name"
          />
        </div>
      </Modal>
    </div>
  );
}