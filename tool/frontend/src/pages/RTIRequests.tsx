import { useState, Fragment, useRef, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ChevronLeft, FileText, ArrowRight, Save, Send, User } from 'lucide-react';
import { generateRTIPDF } from '../utils/pdfUtils';
import { StatusBadge } from '../components/StatusBadge';
import { Button } from '../components/Button';
import { DataTable } from '../components/DataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Input } from '../components/Input';
import { SearchableSelect } from '../components/SearchableSelect';
import { SmartEditor, SmartEditorRef } from '../components/SmartEditor';
import { FieldError } from '../components/FieldError';
import { rtiRequestsService } from '../services/rtiRequestsService';
import { templateService } from '../services/templateService';
import { receiversService } from '../services/receiversService';
import { RTIRequest, Sender, Receiver } from '../types/db';
import { Template } from '../types/rti';
import { Column } from '../types/table';
import { mockSenders } from '../data/mockData';


type View = 'list' | 'create';

export function RTIRequests() {
  const navigate = useNavigate();
  const [view, setView] = useState<View>('list');
  const [isLoading, setIsLoading] = useState(true);
  const [rows, setRows] = useState<RTIRequest[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalItems: 0, pageSize: 10 });

  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Creation Flow State
  const [step, setStep] = useState(1);
  const editorRef = useRef<SmartEditorRef>(null);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [receivers, setReceivers] = useState<Receiver[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const [selectionMode, setSelectionMode] = useState<'none' | 'template'>('none');
  const [formData, setFormData] = useState({
    templateId: '',
    title: '',
    description: '',
    senderId: '',
    receiverId: '',
    content: '',
    requestDate: new Date().toISOString().split('T')[0]
  });

  const loadData = async (page = 1) => {
    setIsLoading(true);
    try {
      const res = await rtiRequestsService.list(page, 10);
      setRows(res.data);
      setPagination(p => ({ ...p, ...res.pagination }));
    } catch (e) {
      toast.error((e as Error).message || 'Failed to load RTI requests');
    } finally {
      setIsLoading(false);
    }
  };

  const loadLookups = async () => {
    try {
      const [r, t] = await Promise.all([
        receiversService.listReceivers(1, 100),
        templateService.getRTITemplates(1, 100)
      ]);
      setSenders(mockSenders);
      setReceivers(r.data);
      setTemplates(t.data);
    } catch (e) {
      toast.error('Failed to load form data');
    }
  };


  useEffect(() => {
    if (view === 'list') {
      loadData(pagination.page);
    } else {
      loadLookups();
    }
  }, [view, pagination.page]);

  const openCreate = () => {
    setStep(1);
    setSelectionMode('none');
    setFormData({
      templateId: '',
      title: '',
      description: '',
      senderId: '',
      receiverId: '',
      content: '',
      requestDate: new Date().toISOString().split('T')[0]
    });
    setView('create');
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await rtiRequestsService.remove(deleteId);
      toast.success('RTI request deleted');
      loadData(rows.length === 1 && pagination.page > 1 ? pagination.page - 1 : pagination.page);
    } catch (e) {
      toast.error('Failed to delete');
    } finally {
      setDeleteId(null);
    }
  };

  const handleStartFromScratch = () => {
    setFormData(prev => ({ ...prev, templateId: 'scratch', content: '', title: '' }));
    setStep(2);
  };

  const handleTemplateSelect = async (templateId: string, fileLink: string, title: string) => {
    try {
      const content = await templateService.getTemplateContent(fileLink);
      setFormData(prev => ({ ...prev, templateId, content: content || '', title }));
      setStep(2);
    } catch (e) {
      toast.error('Failed to load template content');
    }
  };

  const handleSave = async (isDispatch: boolean) => {
    const rawContent = editorRef.current?.getMarkdown() || formData.content;

    // 1. Generate PDF and final content via utility
    const sender = senders.find(s => s.id === formData.senderId);
    const receiver = receivers.find(r => r.id === formData.receiverId);

    try {
      const { blob, fileName, finalMarkdown } = await generateRTIPDF({
        title: formData.title,
        requestDate: formData.requestDate,
        sender,
        receiver,
        content: rawContent
      });

      const pdfFile = new File([blob], fileName, { type: 'application/pdf' });

      // Download PDF locally
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      // Save to backend
      await rtiRequestsService.create({
        title: formData.title,
        description: formData.description,
        senderId: formData.senderId,
        receiverId: formData.receiverId,
        rtiTemplateId: formData.templateId === 'scratch' ? '' : formData.templateId,
        content: finalMarkdown,
        file: pdfFile
      });

      toast.success(`RTI request ${isDispatch ? 'dispatched' : 'saved'} and PDF downloaded`);
      setView('list');
    } catch (e) {
      console.error('PDF Generation Error:', e);
      toast.error('Failed to generate or save RTI request');
    }
  };

  const columns: Column<RTIRequest>[] = [
    {
      header: 'Reference ID',
      accessor: 'referenceId',
      className: 'font-mono text-xs text-gray-500 font-bold'
    },
    { header: 'Title', accessor: 'title', className: 'font-medium text-gray-900' },
    {
      header: 'Receiver',
      render: (r: RTIRequest) => (
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-gray-900">{r.institutionName}</span>
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">{r.positionName}</span>
        </div>
      )
    },
    {
      header: 'Status',
      render: (r: RTIRequest) => <StatusBadge status={r.status} />
    },
    {
      header: 'Last Updated',
      render: (r: RTIRequest) => (
        <span className="text-xs text-gray-500">
          {new Date(r.updatedAt).toLocaleDateString()}
        </span>
      )
    },
  ];

  const placeholders = useMemo(() => {
    const sender = senders.find((s: Sender) => s.id === formData.senderId);
    const receiver = receivers.find((r: Receiver) => r.id === formData.receiverId);

    return {
      '{{date}}': formData.requestDate,
      '{{sender_name}}': sender?.name || '',
      '{{sender_email}}': sender?.email || '',
      '{{sender_address}}': sender?.address || '',
      '{{sender_contact_no}}': sender?.contactNo || '',
      '{{receiver_institution}}': receiver?.institutionName || '',
      '{{receiver_position}}': receiver?.positionName || '',
      '{{receiver_email}}': receiver?.email || '',
      '{{receiver_address}}': receiver?.address || '',
      '{{receiver_contact_no}}': receiver?.contactNo || '',
    };
  }, [formData.senderId, formData.receiverId, formData.requestDate, senders, receivers]);

  if (view === 'create') {
    return (
      <div className="max-w-7xl mx-auto pb-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create New RTI Request</h1>
            <p className="text-sm text-gray-600 mt-1">Generate an official Right to Information request.</p>
          </div>
          <Button variant="secondary" onClick={() => setView('list')}>
            <ChevronLeft className="w-4 h-4 mr-2" /> Back to List
          </Button>
        </div>

        <div className="flex items-center justify-center mb-8">
          {[1, 2, 3].map((num) => (
            <Fragment key={num}>
              <div className="flex flex-col items-center relative">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ${step === num ? 'bg-blue-900 text-white border-blue-900 shadow-lg scale-110' : step > num ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-400 border-gray-200'}`}>
                  {step > num ? '✓' : num}
                </div>
                <span className={`absolute -bottom-6 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap ${step === num ? 'text-blue-900' : 'text-gray-400'}`}>
                  {num === 1 ? 'Template' : num === 2 ? 'Details' : 'Finalize'}
                </span>
              </div>
              {num < 3 && <div className={`w-16 h-0.5 mx-3 rounded-full transition-all duration-500 ${step > num ? 'bg-green-500' : 'bg-gray-200'}`} />}
            </Fragment>
          ))}
        </div>

        <div className="mt-4">
          {step === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {selectionMode === 'none' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto pt-8">
                  <div className="group bg-white border-2 border-dashed border-gray-200 rounded-3xl p-10 flex flex-col items-center text-center hover:border-blue-900 hover:bg-blue-50/30 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-xl" onClick={handleStartFromScratch}>
                    <div className="bg-blue-100 w-20 h-20 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-900 group-hover:text-white transition-all duration-300 transform group-hover:scale-110">
                      <Save className="w-10 h-10 text-blue-900 group-hover:text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">New Document</h3>
                    <p className="text-gray-600 mb-8">Begin with a clean document</p>
                    <Button variant="outline" className="px-8">Create Custom</Button>
                  </div>
                  <div className="group bg-white border-2 border-gray-200 rounded-3xl p-10 flex flex-col items-center text-center hover:border-blue-900 hover:shadow-xl transition-all duration-300 cursor-pointer shadow-sm" onClick={() => setSelectionMode('template')}>
                    <div className="bg-blue-900/10 w-20 h-20 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-900 group-hover:text-white transition-all duration-300 transform group-hover:scale-110">
                      <FileText className="w-10 h-10 text-blue-900 group-hover:text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3">Use a Template</h3>
                    <p className="text-gray-600 mb-8">Choose from the library of templates</p>
                    <Button className="bg-blue-900 hover:bg-blue-800 px-8">Browse Templates</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-1 bg-blue-900 rounded-full" />
                      <h2 className="text-xl font-bold text-gray-900">Step 1: Select a Template</h2>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => setSelectionMode('none')} className="text-xs">
                      <ChevronLeft className="w-4 h-4 mr-1" /> Back
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.map((template) => (
                      <div key={template.id} className="group bg-white border border-gray-200 rounded-2xl p-6 flex flex-col hover:border-blue-900 hover:shadow-xl transition-all duration-300 cursor-pointer" onClick={() => handleTemplateSelect(template.id, template.file, template.title)}>
                        <div className="bg-blue-50 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-900 group-hover:text-white transition-colors">
                          <FileText className="w-6 h-6 text-blue-900 group-hover:text-white" />
                        </div>
                        <h3 className="font-bold text-gray-900 text-lg mb-2">{template.title}</h3>
                        <p className="text-sm text-gray-600 line-clamp-3 mb-6 flex-1">{template.description}</p>
                        <Button variant="outline" fullWidth className="group-hover:bg-blue-900 group-hover:text-white group-hover:border-blue-900">Use Template</Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-sm space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex items-center gap-2">
                <div className="h-8 w-1 bg-blue-900 rounded-full" />
                <h2 className="text-xl font-bold text-gray-900">Step 2: Configure Request Details</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className={`space-y-6 ${formData.templateId === 'scratch' ? 'max-w-2xl mx-auto w-full' : ''}`}>
                  <div className="flex flex-col space-y-1">
                    <Input label="Request Title" placeholder="e.g., Annual Budget Report 2023" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                    {showErrors && !formData.title && <FieldError error="Request title is required" />}
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Description</label>
                    <textarea className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-blue-900 min-h-[120px]" placeholder="Brief description..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                  </div>
                  <Input label="Request Date" type="date" value={formData.requestDate} onChange={(e) => setFormData({ ...formData, requestDate: e.target.value })} />
                </div>
                <div className="space-y-6 bg-gray-50 p-6 rounded-2xl border border-dashed border-gray-300 animate-in fade-in zoom-in-95 duration-300">
                  <div className="flex items-center gap-2 mb-2 text-blue-900 font-semibold uppercase tracking-wider text-xs">
                    <User className="w-4 h-4" /> Entity Selection
                  </div>
                  <div className="flex flex-col space-y-1">
                    <label className="text-sm font-medium text-gray-700">Sender (Applicant)</label>
                    <SearchableSelect placeholder="Search for a sender..." options={senders.map(s => ({ id: s.id, name: s.name }))} value={formData.senderId} onChange={(id) => setFormData({ ...formData, senderId: id })} />
                    {showErrors && !formData.senderId && <FieldError error="Please select a sender" />}
                  </div>
                  <div className="flex flex-col space-y-1">
                    <label className="text-sm font-medium text-gray-700">Receiver (Institution - Position)</label>
                    <SearchableSelect placeholder="Search for a receiver..." options={receivers.map(r => ({ id: r.id, name: `${r.institutionName} - ${r.positionName}` }))} value={formData.receiverId} onChange={(id) => setFormData({ ...formData, receiverId: id })} />
                    {showErrors && !formData.receiverId && <FieldError error="Please select a receiver" />}
                  </div>
                </div>
              </div>
              <div className="flex justify-between pt-6 border-t border-gray-100">
                <Button variant="secondary" onClick={() => setStep(1)} className="flex items-center gap-2"><ChevronLeft className="w-4 h-4" /> Back</Button>
                <Button onClick={() => {
                  if (formData.title && formData.senderId && formData.receiverId) {
                    setStep(3);
                    setShowErrors(false);
                  } else {
                    setShowErrors(true);
                  }
                }} className="flex items-center gap-2 bg-blue-900 hover:bg-blue-800">Continue <ArrowRight className="w-4 h-4" /></Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-1 bg-blue-900 rounded-full" />
                  <h2 className="text-xl font-bold text-gray-900">Step 3: Document Finalization</h2>
                </div>
              </div>
              <div className="h-[650px]">
                <div className="flex flex-col bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden border-t-4 border-t-blue-900 h-full">
                  <div className="bg-gray-50 border-b border-gray-200 px-6 py-2 flex items-center justify-between">
                    <h6 className="text-md font-bold text-gray-900">{formData.title || 'Untitled Request'}</h6>
                  </div>
                  <SmartEditor ref={editorRef} initialMarkdown={formData.content} placeholders={placeholders} className="flex-1" onChange={(markdown) => setFormData(prev => ({ ...prev, content: markdown }))} />
                </div>
              </div>
              <div className="flex justify-between items-center pt-4">
                <Button variant="secondary" onClick={() => setStep(2)} className="flex items-center gap-2"><ChevronLeft className="w-4 h-4" /> Back</Button>
                <div className="flex gap-4">
                  <Button onClick={() => handleSave(true)} className="flex items-center gap-2 bg-blue-900 shadow-lg"><Send className="w-4 h-4" /> Dispatch & Download</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div className="min-w-[200px]">
          <h1 className="text-2xl font-bold text-gray-900">RTI Requests</h1>
          <p className="text-sm text-gray-600 mt-1">Manage and track your RTI requests.</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <DataTable
          title="RTI Request"
          onAdd={openCreate}
          data={rows}
          columns={columns}
          loading={isLoading}
          pagination={pagination}
          onPageChange={(p) => setPagination(prev => ({ ...prev, page: p }))}
          onView={(r) => navigate(`/rti-requests/${r.id}`)}
          onDelete={(r) => setDeleteId(r.id)}
        />
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="Delete RTI Request?"
        message="Are you sure you want to delete this RTI request? This action cannot be undone."
        onCancel={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        confirmText="Delete"
      />
    </div>
  );
}
