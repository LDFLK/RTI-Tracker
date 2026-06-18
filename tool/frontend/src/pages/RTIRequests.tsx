import { useState, Fragment, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ChevronLeft, FileText, ArrowRight, Save, Send, User, Upload } from 'lucide-react';
import { generateRTIPDF, downloadBlob } from '../utils/pdfUtils';
import { Button } from '../components/Button';
import { DataTable } from '../components/DataTable';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Input } from '../components/Input';
import { SearchableSelect } from '../components/SearchableSelect';
import { SmartEditor, SmartEditorRef } from '../components/SmartEditor';
import { FieldError } from '../components/FieldError';
import { templateService } from '../services/templateService';
import { receiversService } from '../services/receiversService';
import { RTIRequest, Sender, Receiver } from '../types/db';
import { Column } from '../types/table';
import { sendersService } from '../services/sendersService';
import { getVariableValues } from '../utils/variableUtils';
import getStatusColor from '../utils/styleUtils';
import {
  getDefaultGeneratedFileSpec,
  fileTypePolicies,
  getAcceptValue,
  isAcceptedFile,
  stripPrimaryExtension,
} from '../constants/fileTypes';

import { useRTIRequest } from '../hooks/useRTIRequest';
import { useEntityData } from '../hooks/useEntityData';
import { useTemplates } from '../hooks/useTemplates';
import { useDebounce } from '../hooks/useDebounce';

type View = 'list' | 'create';

export function RTIRequests() {
  const requestFilePolicy = fileTypePolicies.rtiRequest;
  const navigate = useNavigate();
  const [view, setView] = useState<View>('list');
  const [search, setSearch] = useState('');
  const [pageParams, setPageParams] = useState({ page: 1, pageSize: 10 });
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [receiverSearch, setReceiverSearch] = useState('');

  const debouncedSearch = useDebounce(search);
  const debouncedReceiverSearch = useDebounce(receiverSearch);

  const {
    data: rows,
    pagination,
    createRTIRequest,
    isCreating,
    confirmDelete: confirmDeleteRTI,
    isDeleting,
    isLoading: isLoadingRequests,
    isFetching: isFetchingRequests
  } = useRTIRequest(pageParams.page, pageParams.pageSize, debouncedSearch);

  const { data: senders = [] } = useEntityData<Sender>('senders', { list: (page, pageSize, search, httpClient) => sendersService.listSenders(page, pageSize, httpClient) }, 1, 100);
  const { data: receivers = [] } = useEntityData<Receiver>('receivers', { list: receiversService.listReceivers }, 1, 6, debouncedReceiverSearch);
  const { data: templatesData } = useTemplates(1, 100);
  const templates = templatesData?.data || [];

  // Creation Flow State
  const [step, setStep] = useState(1);
  const editorRef = useRef<SmartEditorRef>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [selectionMode, setSelectionMode] = useState<'none' | 'template' | 'upload'>('none');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    templateId: '',
    title: '',
    description: '',
    senderId: '',
    receiverId: '',
    content: '',
    requestDate: new Date().toISOString().split('T')[0]
  });

  // Lookups are now managed by hooks

  const openCreate = () => {
    setStep(1);
    setUploadedFile(null);
    setFormData({
      templateId: '',
      title: '',
      description: '',
      senderId: '',
      receiverId: '',
      content: '',
      requestDate: new Date().toISOString().split('T')[0]
    });
    setSelectionMode('none');
    setView('create');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!isAcceptedFile(file, requestFilePolicy)) {
        toast.error('Please upload a PDF file');
        return;
      }
      setUploadedFile(file);
      setFormData(prev => ({ ...prev, title: stripPrimaryExtension(file.name, requestFilePolicy) }));
      setSelectionMode('upload');
      setStep(2);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await confirmDeleteRTI(deleteId);
      toast.success('RTI request deleted');
    } catch (e) {
      toast.error('Failed to delete');
    } finally {
      setDeleteId(null);
    }
  };

  const handleTemplateSelect = async (templateId?: string, fileLink?: string, title?: string) => {
    if (!templateId) {
      setFormData(prev => ({ ...prev, templateId: '', content: '', title: '' }));
      setStep(2);
      setSelectionMode('none');
      return;
    }

    try {
      const content = await templateService.getTemplateContent(fileLink!);
      setFormData(prev => ({ ...prev, templateId, content: content || '', title: title || '' }));
      setSelectionMode('template');
      setStep(2);
    } catch (e) {
      toast.error('Failed to load template content');
    }
  };

  const handleSave = async (isDispatch: boolean) => {
    const rawContent = editorRef.current?.getMarkdown() || formData.content;
    const sender = senders.find((s: Sender) => s.id === formData.senderId);
    const receiver = receivers.find((r: Receiver) => r.id === formData.receiverId);

    try {
      let pdfFile: File;
      let finalMarkdown = formData.content;

      if (selectionMode === 'upload' && uploadedFile) {
        pdfFile = uploadedFile;
        finalMarkdown = 'File uploaded manually';
      } else {
        const { mimeType } = getDefaultGeneratedFileSpec(requestFilePolicy);
        const { blob, fileName, finalMarkdown: generatedMarkdown } = await generateRTIPDF({
          title: formData.title,
          requestDate: formData.requestDate,
          sender,
          receiver,
          content: rawContent
        });
        pdfFile = new File([blob], fileName, { type: mimeType });
        finalMarkdown = generatedMarkdown;
        downloadBlob(blob, fileName);
      }

      // Save to backend
      await createRTIRequest({
        title: formData.title,
        description: formData.description,
        senderId: formData.senderId,
        receiverId: formData.receiverId,
        rtiTemplateId: formData.templateId || undefined,
        content: finalMarkdown,
        file: pdfFile,
        createdDate: selectionMode === 'upload' ? formData.requestDate : undefined
      });

      toast.success(`RTI request ${isDispatch ? 'dispatched' : 'saved'} successfully`);
      setView('list');
    } catch (e) {
      console.error('Save Error:', e);
      toast.error('Failed to save RTI request');
    }
  };

  const columns: Column<RTIRequest>[] = [
    { header: 'ID', accessor: 'id', className: 'font-medium text-gray-900' },
    { header: 'Title', accessor: 'title', className: 'font-medium text-gray-900' },
    {
      header: 'Receiver',
      cell: (r: RTIRequest) => (
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-gray-900">{r.receiver?.institution?.name}</span>
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">{r.receiver?.position?.name}</span>
        </div>
      )
    },
    {
      header: 'Current Status',
      cell: (r: RTIRequest) => (
        <div className="flex flex-col">
          <span className={`text-[10px] font-bold px-1 py-0.5 uppercase tracking-wider rounded-md border w-fit ${getStatusColor(r.currentStatus?.name || '')}`}>
            {r.currentStatus?.name}
          </span>
        </div>
      )
    },
    {
      header: 'Last Updated',
      cell: (r: RTIRequest) => (
        <span className="text-xs text-gray-500">
          {r.currentStatus?.updatedAt ? new Date(r.currentStatus.updatedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'numeric', day: 'numeric' }) : '-'}
        </span>
      )
    },
  ];

  const placeholders = useMemo(() => {
    const sender = senders.find((s: Sender) => s.id === formData.senderId);
    const receiver = receivers.find((r: Receiver) => r.id === formData.receiverId);
    return getVariableValues(formData.requestDate, sender, receiver);
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto pt-8">
                  <div className="group bg-white border-2 border-dashed border-gray-200 rounded-3xl p-8 flex flex-col items-center text-center hover:border-blue-900 hover:bg-blue-50/30 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-xl" onClick={() => handleTemplateSelect()}>
                    <div className="bg-blue-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-blue-900 group-hover:text-white transition-all duration-300 transform group-hover:scale-110">
                      <Save className="w-8 h-8 text-blue-900 group-hover:text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">New Document</h3>
                    <p className="text-sm text-gray-600 mb-6">Begin with a clean document</p>
                    <Button variant="outline" size="sm" className="px-6">Create Custom</Button>
                  </div>
                  <div className="group bg-white border-2 border-gray-200 rounded-3xl p-8 flex flex-col items-center text-center hover:border-blue-900 hover:shadow-xl transition-all duration-300 cursor-pointer shadow-sm" onClick={() => setSelectionMode('template')}>
                    <div className="bg-blue-900/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-blue-900 group-hover:text-white transition-all duration-300 transform group-hover:scale-110">
                      <FileText className="w-8 h-8 text-blue-900 group-hover:text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Use a Template</h3>
                    <p className="text-sm text-gray-600 mb-6">Choose from the library</p>
                    <Button variant="secondary" size="sm" className="px-6">Browse Templates</Button>
                  </div>
                  <div className="group bg-white border-2 border-gray-200 rounded-3xl p-8 flex flex-col items-center text-center hover:border-blue-900 hover:shadow-xl transition-all duration-300 cursor-pointer shadow-sm" onClick={() => fileInputRef.current?.click()}>
                    <div className="bg-green-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-green-600 group-hover:text-white transition-all duration-300 transform group-hover:scale-110">
                      <Upload className="w-8 h-8 text-green-700 group-hover:text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Upload File</h3>
                    <p className="text-sm text-gray-600 mb-6">Upload a PDF from device</p>
                    <Button variant="outline" size="sm" className="px-6 border-green-600 text-green-700 hover:bg-green-600 hover:text-white">Select PDF</Button>
                    <input type="file" ref={fileInputRef} className="hidden" accept={getAcceptValue(requestFilePolicy)} onChange={handleFileChange} />
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="template-selection-grid">
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
                <div className={`space-y-6 ${!formData.templateId ? 'max-w-2xl mx-auto w-full' : ''}`}>
                  <div className="flex flex-col space-y-1">
                    <Input label="Request Title" placeholder="e.g., Annual Budget Report 2023" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                    {showErrors && !formData.title && <FieldError error="Request title is required" />}
                  </div>
                  <div className="flex flex-col space-y-1.5">
                    <label htmlFor="rti-description" className="text-sm font-medium text-gray-700">Description</label>
                    <textarea id="rti-description" className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-blue-900 min-h-[120px]" placeholder="Brief description..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                  </div>
                  <Input label="Request Date" type="date" value={formData.requestDate} onChange={(e) => setFormData({ ...formData, requestDate: e.target.value })} />
                </div>
                <div className="space-y-6 bg-gray-50 p-6 rounded-2xl border border-dashed border-gray-300 animate-in fade-in zoom-in-95 duration-300">
                  <div className="flex items-center gap-2 mb-2 text-blue-900 font-semibold uppercase tracking-wider text-xs">
                    <User className="w-4 h-4" /> Entity Selection
                  </div>
                  <div className="flex flex-col space-y-1">
                    <label className="text-sm font-medium text-gray-700">Sender (Applicant)</label>
                    <SearchableSelect placeholder="Search for a sender..." options={senders.map((s: Sender) => ({ id: s.id, name: s.name }))} value={formData.senderId} onChange={(id) => setFormData({ ...formData, senderId: id })} />
                    {showErrors && !formData.senderId && <FieldError error="Please select a sender" />}
                  </div>
                  <div className="flex flex-col space-y-1">
                    <label className="text-sm font-medium text-gray-700">Receiver (Institution - Position)</label>
                    <SearchableSelect placeholder="Search for a receiver..." options={receivers.map((r: Receiver) => ({ id: r.id, name: `${r.institution?.name} - ${r.position?.name}` }))} value={formData.receiverId} onChange={(id) => setFormData({ ...formData, receiverId: id })} onSearchChange={setReceiverSearch} />
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
              {selectionMode === 'upload' ? (
                <div className="bg-white border border-gray-200 rounded-3xl p-12 flex flex-col items-center justify-center text-center space-y-6 shadow-sm border-t-4 border-t-green-600 min-h-[400px]">
                  <div className="bg-green-100 w-24 h-24 rounded-full flex items-center justify-center mb-2">
                    <FileText className="w-12 h-12 text-green-700" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">{uploadedFile?.name}</h3>
                    <p className="text-gray-500 mt-2">Manual file upload selected. No content editing available.</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => { setSelectionMode('none'); setUploadedFile(null); setStep(1); }}>Change File</Button>
                </div>
              ) : (
                <div className="h-[650px]">
                  <div className="flex flex-col bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden border-t-4 border-t-blue-900 h-full">
                    <div className="bg-gray-50 border-b border-gray-200 px-6 py-2 flex items-center justify-between">
                      <h6 className="text-md font-bold text-gray-900">{formData.title || 'Untitled Request'}</h6>
                    </div>
                    <SmartEditor ref={editorRef} initialMarkdown={formData.content} placeholders={placeholders} className="flex-1" onChange={(markdown) => setFormData(prev => ({ ...prev, content: markdown }))} />
                  </div>
                </div>
              )}
              <div className="flex justify-between items-center pt-4">
                <Button variant="secondary" onClick={() => setStep(2)} className="flex items-center gap-2"><ChevronLeft className="w-4 h-4" /> Back</Button>
                <div className="flex gap-4">
                  <Button onClick={() => handleSave(true)} disabled={isCreating} className="flex items-center gap-2 bg-blue-900 shadow-lg">
                    {isCreating ? 'Processing...' : <><Send className="w-4 h-4" /> {selectionMode === 'upload' ? "Submit" : "Dispatch & Download"}</>}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-2">
      <div className="mb-1">
        <h1 className="text-xl font-bold text-gray-900">RTI Requests</h1>
        <p className="text-xs text-gray-600">Manage and track your RTI requests.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <DataTable
          title="RTI Request"
          onAdd={openCreate}
          searchTerm={search}
          onSearch={setSearch}
          data={rows}
          columns={columns}
          loading={isLoadingRequests || isFetchingRequests || isDeleting}
          pagination={pagination}
          onPageChange={(p) => setPageParams(prev => ({ ...prev, page: p }))}
          onPageSizeChange={(size) => setPageParams(prev => ({ ...prev, page: 1, pageSize: size }))}
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
        confirmText={isDeleting ? "Deleting..." : "Delete"}
      />
    </div>
  );
}