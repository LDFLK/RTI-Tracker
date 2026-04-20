import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Modal } from '../components/Modal';
import { SearchableSelect } from '../components/SearchableSelect';
import { DataTable } from '../components/DataTable';
import { TabButton } from '../components/TabButton';
import { FormLabel } from '../components/FormLabel';
import { FieldError } from '../components/FieldError';

import { receiversService } from '../services/receiversService';
import { institutionService } from '../services/institutionService';
import { positionService } from '../services/positionService';
import { Institution, Position, Receiver } from '../types/db';
import { useEntityData } from '../hooks/useEntityData';
import { Column } from '../types/table';

type TabKey = 'receivers' | 'institutions' | 'positions';

// Validation Schemas 

const receiverSchema = yup.object().shape({
  institutionId: yup.string().required('Institution is required'),
  positionId: yup.string().required('Position is required'),
  email: yup.string().nullable().transform(v => v === '' ? null : v)
    .email('Please enter a valid email address'),
  contactNo: yup.string().nullable().transform(v => v === '' ? null : v),
  address: yup.string().nullable().transform(v => v === '' ? null : v),
}).test('contact-required', 'Either Email or Contact No is required', function (value) {
  if (!value.email && !value.contactNo) {
    return this.createError({ path: 'email', message: 'Email or Contact No is required' });
  }
  return true;
});

const nameEntitySchema = yup.object({
  name: yup.string().required('Name is required').trim(),
});

export function Receivers() {
  const [tab, setTab] = useState<TabKey>('receivers');

  // Entities Hook Instances
  const receiversHook = useEntityData(receiversService.listReceivers, receiversService.removeReceiver, 'Receiver');
  const institutionsHook = useEntityData(institutionService.listInstitutions, institutionService.removeInstitution, 'Institution');
  const positionsHook = useEntityData(positionService.listPositions, positionService.removePosition, 'Position');

  // Deletion state
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: TabKey } | null>(null);

  // Receiver Form
  const [receiverEdit, setReceiverEdit] = useState<Receiver | null>(null);
  const [receiverModalOpen, setReceiverModalOpen] = useState(false);

  const {
    control: receiverControl,
    handleSubmit: handleReceiverSubmit,
    reset: resetReceiverForm,
    setValue: setReceiverValue,
    formState: { errors: receiverErrors }
  } = useForm({
    resolver: yupResolver(receiverSchema),
    defaultValues: {
      institutionId: '', positionId: '', email: '', contactNo: '', address: ''
    }
  });

  // Institution/Position Shared Modal State
  const [nameModal, setNameModal] = useState<{ open: boolean; edit: Institution | Position | null; type: 'institution' | 'position' }>({
    open: false, edit: null, type: 'institution'
  });

  const {
    register: registerName,
    handleSubmit: handleNameSubmit,
    reset: resetNameForm,
    formState: { errors: nameErrors }
  } = useForm({
    resolver: yupResolver(nameEntitySchema),
    defaultValues: { name: '' }
  });

  const [redirectType, setRedirectType] = useState<'institution' | 'position' | null>(null);

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
    setRedirectType(type);
    setNameModal({ open: true, edit: null, type });
    resetNameForm({ name: name });
    setReceiverModalOpen(false);
    setTab(type === 'institution' ? 'institutions' : 'positions');
  };

  const openReceiverModal = (r?: Receiver) => {
    setReceiverEdit(r || null);
    resetReceiverForm({
      institutionId: r?.institutionId || '',
      positionId: r?.positionId || '',
      email: r?.email || '',
      contactNo: r?.contactNo || '',
      address: r?.address || ''
    });
    setReceiverModalOpen(true);
  };

  const onSaveReceiver = async (data: Partial<Receiver>) => {
    try {
      if (receiverEdit) await receiversService.updateReceiver(receiverEdit.id, data);
      else await receiversService.createReceiver(data);

      toast.success(`Receiver ${receiverEdit ? 'updated' : 'created'}`);
      setReceiverModalOpen(false);
      await receiversHook.refresh(true);
    } catch (e) {
      toast.error((e as Error).message || 'Failed to save receiver');
    }
  };

  const openNameModal = (type: 'institution' | 'position', item?: Institution | Position) => {
    setNameModal({ open: true, edit: item || null, type });
    resetNameForm({ name: item?.name || '' });
  };

  const onSaveNameEntity = async (formData: { name: string }) => {
    const { type, edit } = nameModal;
    const name = formData.name.trim();

    // Duplicate Validation (using existing data from hooks)
    const list = type === 'institution' ? institutionsHook.data : positionsHook.data;
    const duplicate = list.find(i => i.name.toLowerCase() === name.toLowerCase() && i.id !== edit?.id);

    if (duplicate) {
      toast.error(`${type.charAt(0).toUpperCase() + type.slice(1)} "${name}" already exists.`);
      if (!edit && redirectType === type) {
        setReceiverValue(`${type}Id` as any, duplicate.id);
        setTab('receivers');
        setReceiverModalOpen(true);
      }
      setNameModal(s => ({ ...s, open: false }));
      setRedirectType(null);
      return;
    }

    try {
      let res: any;
      if (type === 'institution') {
        res = edit ? await institutionService.updateInstitution(edit.id, { name }) : await institutionService.createInstitution({ name });
        await institutionsHook.refresh(true);
      } else {
        res = edit ? await positionService.updatePosition(edit.id, { name }) : await positionService.createPosition({ name });
        await positionsHook.refresh(true);
      }

      toast.success(`${type} ${edit ? 'updated' : 'created'}`);

      if (!edit && redirectType === type && res) {
        setReceiverValue(`${type}Id` as any, res.id);
        setTab('receivers');
        setReceiverModalOpen(true);
      }
      setNameModal(s => ({ ...s, open: false }));
      setRedirectType(null);
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
            onEdit={item => openNameModal(tab === 'institutions' ? 'institution' : 'position', item)}
            onDelete={item => setDeleteConfirm({ id: item.id, type: tab })}
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
            <Button onClick={handleReceiverSubmit(onSaveReceiver)}>{receiverEdit ? 'Save Changes' : 'Create Receiver'}</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <FormLabel label="Institution" required />
            <Controller
              name="institutionId"
              control={receiverControl}
              render={({ field }) => (
                <SearchableSelect
                  placeholder="Select institution"
                  value={field.value}
                  onChange={field.onChange}
                  options={institutionsHook.data}
                  onAddSpecial={n => startRedirect('institution', n)}
                />
              )}
            />
            <FieldError error={receiverErrors.institutionId?.message} />
          </div>
          <div className="flex flex-col gap-1.5">
            <FormLabel label="Position" required />
            <Controller
              name="positionId"
              control={receiverControl}
              render={({ field }) => (
                <SearchableSelect
                  placeholder="Select position"
                  value={field.value}
                  onChange={field.onChange}
                  options={positionsHook.data}
                  onAddSpecial={n => startRedirect('position', n)}
                />
              )}
            />
            <FieldError error={receiverErrors.positionId?.message} />
          </div>
          <div className="flex flex-col gap-1.5">
            <FormLabel label="Email" />
            <Controller
              name="email"
              control={receiverControl}
              render={({ field }) => (
                <input
                  type="email"
                  autoComplete="off"
                  className={`px-3 py-2 rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-900 ${receiverErrors.email ? 'border-red-500' : ''}`}
                  {...field}
                  value={field.value || ''}
                  placeholder="receiver@example.com"
                />
              )}
            />
            <FieldError error={receiverErrors.email?.message} />
          </div>
          <div className="flex flex-col gap-1.5">
            <FormLabel label="Contact No" />
            <Controller
              name="contactNo"
              control={receiverControl}
              render={({ field }) => (
                <input
                  autoComplete="off"
                  className={`px-3 py-2 rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-900 ${receiverErrors.contactNo ? 'border-red-500' : ''}`}
                  {...field}
                  value={field.value || ''}
                  onChange={e => field.onChange(e.target.value.replace(/[^0-9\-]/g, ''))}
                  placeholder="Phone number"
                />
              )}
            />
            <FieldError error={receiverErrors.contactNo?.message} />
          </div>
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <FormLabel label="Address" />
            <Controller
              name="address"
              control={receiverControl}
              render={({ field }) => (
                <input
                  autoComplete="off"
                  className={`px-3 py-2 rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-900 ${receiverErrors.address ? 'border-red-500' : ''}`}
                  {...field}
                  value={field.value || ''}
                  placeholder="Address (optional)"
                />
              )}
            />
            <FieldError error={receiverErrors.address?.message} />
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
            <Button onClick={handleNameSubmit(onSaveNameEntity)}>{nameModal.edit ? 'Save Changes' : 'Create'}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-1.5">
          <FormLabel label="Name" required />
          <input
            className={`px-3 py-2 rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-900 ${nameErrors.name ? 'border-red-500' : ''}`}
            {...registerName('name')}
            placeholder="Name"
          />
          <FieldError error={nameErrors.name?.message} />
        </div>
      </Modal>
    </div>
  );
}