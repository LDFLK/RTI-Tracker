import { useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';
import { SearchableSelect } from '../components/SearchableSelect';
import { DataTable } from '../components/DataTable';
import { TabButton } from '../components/TabButton';
import { SectionHeader } from '../components/SectionHeader';
import { receiversService } from '../services/receiversService';
import { Institution, Position, Receiver } from '../types/db';
import { useEntityData } from '../hooks/useEntityData';

type TabKey = 'receivers' | 'institutions' | 'positions';

export function Receivers() {
  const [tab, setTab] = useState<TabKey>('receivers');

  // Entities Data
  const { 
    data: receivers, loading: receiversLoading, pagination: receiversPagination, 
    loadData: loadReceivers, confirmDelete: deleteReceiver 
  } = useEntityData(receiversService.listReceivers, receiversService.removeReceiver, 'Receiver');

  const { 
    data: institutions, loading: institutionsLoading, pagination: institutionsPagination, 
    loadData: loadInstitutions, confirmDelete: deleteInstitution 
  } = useEntityData(receiversService.listInstitutions, receiversService.removeInstitution, 'Institution');

  const { 
    data: positions, loading: positionsLoading, pagination: positionsPagination, 
    loadData: loadPositions, confirmDelete: deletePosition 
  } = useEntityData(receiversService.listPositions, receiversService.removePosition, 'Position');

  // Deletion state
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: TabKey } | null>(null);

  // Receiver Form/Modal
  const [receiverEdit, setReceiverEdit] = useState<Receiver | null>(null);
  const [receiverModalOpen, setReceiverModalOpen] = useState(false);
  const [receiverForm, setReceiverForm] = useState({
    institutionId: '',
    positionId: '',
    email: '',
    contactNo: '',
    address: ''
  });

  // Institution/Position Shared Modal
  const [nameModal, setNameModal] = useState<{ open: boolean; edit: Institution | Position | null; type: 'institution' | 'position'; name: string }>({
    open: false,
    edit: null,
    type: 'institution',
    name: ''
  });

  // Redirection
  const [isRedirecting, setIsRedirecting] = useState<'institution' | 'position' | null>(null);

  const startInstitutionRedirect = (name: string) => {
    setIsRedirecting('institution');
    setNameModal({ open: true, edit: null, type: 'institution', name });
    setReceiverModalOpen(false);
    setTab('institutions');
  };

  const startPositionRedirect = (name: string) => {
    setIsRedirecting('position');
    setNameModal({ open: true, edit: null, type: 'position', name });
    setReceiverModalOpen(false);
    setTab('positions');
  };

  const openReceiverCreate = () => {
    setReceiverEdit(null);
    setReceiverForm({ institutionId: '', positionId: '', email: '', contactNo: '', address: '' });
    setReceiverModalOpen(true);
  };

  const openReceiverEdit = (r: Receiver) => {
    setReceiverEdit(r);
    setReceiverForm({
      institutionId: r.institutionId,
      positionId: r.positionId,
      email: r.email ?? '',
      contactNo: r.contactNo ?? '',
      address: r.address ?? ''
    });
    setReceiverModalOpen(true);
  };

  const saveReceiver = async () => {
    const payload = {
      institutionId: receiverForm.institutionId,
      positionId: receiverForm.positionId,
      email: receiverForm.email.trim() || null,
      contactNo: receiverForm.contactNo.trim() || null,
      address: receiverForm.address.trim() || null
    };

    if (!payload.institutionId) return toast.error('Institution is required');
    if (!payload.positionId) return toast.error('Position is required');
    if (!payload.email && !payload.contactNo) return toast.error('Email or Contact No is required');

    try {
      if (receiverEdit) {
        await receiversService.updateReceiver(receiverEdit.id, payload);
        toast.success('Receiver updated');
      } else {
        await receiversService.createReceiver(payload);
        toast.success('Receiver created');
      }
      setReceiverModalOpen(false);
      setReceiverEdit(null);
      await loadReceivers(receiversPagination.page);
    } catch (e) {
      toast.error((e as Error).message || 'Failed to save receiver');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    const { id, type } = deleteConfirm;
    setDeleteConfirm(null);

    if (type === 'receivers') await deleteReceiver(id);
    else if (type === 'institutions') await deleteInstitution(id);
    else if (type === 'positions') await deletePosition(id);
  };

  const openNameModal = (type: 'institution' | 'position', item?: Institution | Position) => {
    setNameModal({
      open: true,
      edit: item || null,
      type,
      name: item?.name || ''
    });
  };

  const closeNameModal = () => {
    setNameModal(s => ({ ...s, open: false, edit: null }));
    if (isRedirecting) {
      setTab('receivers');
      setReceiverModalOpen(true);
      setIsRedirecting(null);
    }
  };

  const saveNameEntity = async () => {
    const { type, name, edit } = nameModal;
    const trimmed = name.trim();
    if (!trimmed) return toast.error('Name is required');

    const source = type === 'institution' ? institutions : positions;
    const isDuplicate = source.some(i => i.name.toLowerCase() === trimmed.toLowerCase() && i.id !== edit?.id);
    if (isDuplicate) return toast.error(`A ${type} with this name already exists`);

    try {
      let res;
      if (type === 'institution') {
        if (edit) await receiversService.updateInstitution(edit.id, { name: trimmed });
        else res = await receiversService.createInstitution({ name: trimmed });
        await loadInstitutions(institutionsPagination.page);
      } else {
        if (edit) await receiversService.updatePosition(edit.id, { name: trimmed });
        else res = await receiversService.createPosition({ name: trimmed });
        await loadPositions(positionsPagination.page);
      }

      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} ${edit ? 'updated' : 'created'}`);
      
      if (!edit && isRedirecting === type && res) {
        setReceiverForm(s => ({ ...s, [`${type}Id`]: res.id }));
        setTab('receivers');
        setReceiverModalOpen(true);
        setIsRedirecting(null);
      }
      
      setNameModal(s => ({ ...s, open: false, edit: null }));
    } catch (e) {
      toast.error((e as Error).message || `Failed to save ${type}`);
    }
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
          <>
            <SectionHeader title="Receiver" onAdd={openReceiverCreate} />
            <DataTable
              data={receivers}
              columns={[
                { header: 'Institution', accessor: 'institutionName', className: 'font-medium text-gray-900' },
                { header: 'Position', accessor: 'positionName', className: 'text-gray-700' },
                { header: 'Email', accessor: 'email', className: 'text-gray-600' },
                { header: 'Contact No', accessor: 'contactNo', className: 'text-gray-600' },
                { header: 'Address', accessor: 'address', className: 'text-gray-600' },
              ]}
              onEdit={openReceiverEdit}
              onDelete={(r) => setDeleteConfirm({ id: r.id, type: 'receivers' })}
              loading={receiversLoading}
              loadingMessage="Loading receivers..."
              emptyMessage="No receivers found."
              rowKey="id"
              currentPage={receiversPagination.page}
              totalPages={receiversPagination.totalPages}
              onPageChange={loadReceivers}
            />
          </>
        )}

        {tab === 'institutions' && (
          <>
            <SectionHeader title="Institution" onAdd={() => openNameModal('institution')} />
            <DataTable
              data={institutions}
              columns={[{ header: 'Name', accessor: 'name', className: 'font-medium text-gray-900' }]}
              onEdit={(i) => openNameModal('institution', i)}
              onDelete={(i) => setDeleteConfirm({ id: i.id, type: 'institutions' })}
              loading={institutionsLoading}
              loadingMessage="Loading institutions..."
              emptyMessage="No institutions found."
              rowKey="id"
              currentPage={institutionsPagination.page}
              totalPages={institutionsPagination.totalPages}
              onPageChange={loadInstitutions}
            />
          </>
        )}

        {tab === 'positions' && (
          <>
            <SectionHeader title="Position" onAdd={() => openNameModal('position')} />
            <DataTable
              data={positions}
              columns={[{ header: 'Name', accessor: 'name', className: 'font-medium text-gray-900' }]}
              onEdit={(p) => openNameModal('position', p)}
              onDelete={(p) => setDeleteConfirm({ id: p.id, type: 'positions' })}
              loading={positionsLoading}
              loadingMessage="Loading positions..."
              emptyMessage="No positions found."
              rowKey="id"
              currentPage={positionsPagination.page}
              totalPages={positionsPagination.totalPages}
              onPageChange={loadPositions}
            />
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteConfirm}
        title={`Delete ${deleteConfirm?.type.slice(0, -1)}?`}
        message={`Are you sure you want to delete this ${deleteConfirm?.type.slice(0, -1)}? This action cannot be undone.`}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={handleConfirmDelete}
        confirmText="Delete"
      />

      <Modal
        open={receiverModalOpen}
        title={receiverEdit ? 'Edit Receiver' : 'New Receiver'}
        onClose={() => { setReceiverModalOpen(false); setReceiverEdit(null); }}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setReceiverModalOpen(false); setReceiverEdit(null); }}>Cancel</Button>
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
              onChange={(id) => setReceiverForm((s) => ({ ...s, institutionId: id }))}
              options={institutions}
              onAddSpecial={startInstitutionRedirect}
              addLabel="Add Institution"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Position</label>
            <SearchableSelect
              placeholder="Select position"
              value={receiverForm.positionId}
              onChange={(id) => setReceiverForm((s) => ({ ...s, positionId: id }))}
              options={positions}
              onAddSpecial={startPositionRedirect}
              addLabel="Add Position"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</label>
            <input
              className="px-3 py-2 rounded border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
              value={receiverForm.email}
              onChange={(e) => setReceiverForm((s) => ({ ...s, email: e.target.value }))}
              placeholder="receiver@example.com"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact No</label>
            <input
              className="px-3 py-2 rounded border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
              value={receiverForm.contactNo}
              onChange={(e) => setReceiverForm((s) => ({ ...s, contactNo: e.target.value }))}
              placeholder="Phone number"
            />
          </div>
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Address</label>
            <input
              className="px-3 py-2 rounded border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
              value={receiverForm.address}
              onChange={(e) => setReceiverForm((s) => ({ ...s, address: e.target.value }))}
              placeholder="Address (optional)"
            />
          </div>
          <div className="md:col-span-2 text-xs text-gray-500">
            Note: Per database rules, at least one of <strong>Email</strong> or <strong>Contact No</strong> must be provided.
          </div>
        </div>
      </Modal>

      <Modal
        open={nameModal.open}
        title={`${nameModal.edit ? 'Edit' : 'New'} ${nameModal.type.charAt(0).toUpperCase() + nameModal.type.slice(1)}`}
        onClose={closeNameModal}
        footer={
          <>
            <Button variant="secondary" onClick={closeNameModal}>Cancel</Button>
            <Button onClick={saveNameEntity}>{nameModal.edit ? 'Save Changes' : `Create ${nameModal.type.charAt(0).toUpperCase() + nameModal.type.slice(1)}`}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</label>
          <input
            className="px-3 py-2 rounded border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-900"
            value={nameModal.name}
            onChange={(e) => setNameModal(s => ({ ...s, name: e.target.value }))}
            placeholder={`${nameModal.type.charAt(0).toUpperCase() + nameModal.type.slice(1)} name`}
          />
        </div>
      </Modal>
    </div>
  );
}