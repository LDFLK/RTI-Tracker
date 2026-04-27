import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, FileText, CheckCircle, Upload, Clock, User, Building2, Mail, X, Plus, Edit2, AlertTriangle } from 'lucide-react';
import { rtiRequestsService } from '../services/rtiRequestsService';
import { statusService } from '../services/statusService';
import { RTIRequest, RTIStatusHistory, RTIStatus } from '../types/db';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import toast from 'react-hot-toast';

export function RTIDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState<RTIRequest | null>(null);
  const [history, setHistory] = useState<RTIStatusHistory[]>([]);
  const [statuses, setStatuses] = useState<RTIStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Event Modal State
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<RTIStatusHistory | null>(null);
  const [eventFormData, setEventFormData] = useState({
    statusId: '',
    direction: 'outgoing' as 'outgoing' | 'incoming',
    description: '',
    existingFiles: [] as string[],
    newFiles: [] as File[]
  });

  // Delete Confirmation State
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    const fetchAllData = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const [reqData, historyData, statusData] = await Promise.all([
          rtiRequestsService.details(id),
          rtiRequestsService.getHistory(id),
          statusService.getAll()
        ]);
        setRequest(reqData);
        setHistory(historyData.sort((a, b) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime()));
        setStatuses(statusData);
      } catch (e) {
        toast.error('Failed to load RTI details');
        navigate('/rti-requests');
      } finally {
        setIsLoading(false);
      }
    };
    fetchAllData();
  }, [id, navigate]);



  const handleAddEvent = () => {
    setIsEditing(false);
    setSelectedEntry(null);
    setEventFormData({ statusId: '', direction: 'outgoing', description: '', existingFiles: [], newFiles: [] });
    setIsEventModalOpen(true);
  };

  const handleEditEvent = (entry: RTIStatusHistory) => {
    setIsEditing(true);
    setSelectedEntry(entry);
    setEventFormData({
      statusId: entry.statusId,
      direction: entry.direction as any,
      description: entry.description || '',
      existingFiles: entry.files,
      newFiles: []
    });
    setIsEventModalOpen(true);
  };

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    // Validation: Require at least one document except for COMPLETED
    const totalFiles = eventFormData.existingFiles.length + eventFormData.newFiles.length;
    const selectedStatusToSave = statuses.find(s => s.id === eventFormData.statusId);
    if (selectedStatusToSave?.name !== 'COMPLETED' && totalFiles === 0) {
      toast.error('At least one document is required for this status');
      return;
    }

    try {
      if (isEditing && selectedEntry) {
        const updated = await rtiRequestsService.updateHistory(selectedEntry.id, {
          statusId: eventFormData.statusId,
          direction: eventFormData.direction,
          description: eventFormData.description,
          files: eventFormData.existingFiles,
          fileUploads: eventFormData.newFiles
        });
        setHistory(prev => prev.map(h => h.id === selectedEntry.id ? updated : h));
        setRequest(prev => prev ? { ...prev, updatedAt: new Date() } : null);
        toast.success('Event updated');
      } else {
        const newEntry = await rtiRequestsService.addHistory({
          rtiRequestId: id,
          statusId: eventFormData.statusId,
          direction: eventFormData.direction,
          description: eventFormData.description,
          fileUploads: eventFormData.newFiles
        });
        setHistory(prev => [newEntry, ...prev].sort((a, b) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime()));
        setRequest(prev => prev ? { ...prev, updatedAt: new Date() } : null);
        toast.success('Event added');
      }
      setIsEventModalOpen(false);
    } catch (e) {
      toast.error('Failed to save event');
    }
  };

  const handleDeleteEntry = () => {
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteEntry = async () => {
    if (!selectedEntry) return;

    try {
      await rtiRequestsService.deleteHistory(selectedEntry.id);
      setHistory(prev => prev.filter(h => h.id !== selectedEntry.id));
      setRequest(prev => prev ? { ...prev, updatedAt: new Date() } : null);
      toast.success('Event deleted');
      setIsDeleteConfirmOpen(false);
      setIsEventModalOpen(false);
    } catch (e) {
      toast.error('Failed to delete event');
    }
  };

  const completedStatus = statuses.find(s => s.name.toLowerCase() === 'completed');
  const isCompleted = completedStatus && history.some(h => h.statusId === completedStatus.id);

  const handleMarkCompleted = async () => {
    if (!id || !completedStatus) return;
    try {
      const newEntry = await rtiRequestsService.addHistory({
        rtiRequestId: id,
        statusId: completedStatus.id,
        direction: 'incoming',
        description: 'Request marked as completed.',
        fileUploads: []
      });
      setHistory(prev => [newEntry, ...prev].sort((a, b) => new Date(b.entryTime).getTime() - new Date(a.entryTime).getTime()));
      setRequest(prev => prev ? { ...prev, updatedAt: new Date() } : null);
      toast.success('Marked as Completed');
    } catch (e) {
      toast.error('Failed to mark as completed');
    }
  };

  if (isLoading || !request) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-900"></div>
        <p className="text-gray-500 font-medium">Loading RTI details...</p>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Navigation & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <button
            onClick={() => navigate('/rti-requests')}
            className="flex items-center text-sm font-medium text-gray-500 hover:text-blue-900 transition-colors group"
          >
            <ChevronLeft className="w-4 h-4 mr-1 transition-transform group-hover:-translate-x-1" />
            Back to RTI Requests
          </button>

          <div className="flex gap-3">
            {!isCompleted && completedStatus && (
              <Button variant="primary" className="flex items-center gap-2 bg-blue-900" onClick={handleMarkCompleted}>
                <CheckCircle className="w-4 h-4" /> Mark as Completed
              </Button>
            )}
          </div>
        </div>

        {/* Header Banner */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{request?.title}</h1>
              </div>
              <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-sm text-gray-500">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  Last Updated: {new Date(request.updatedAt).toLocaleString(undefined, { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="flex items-center gap-1.5 font-mono text-xs">
                  Ref: {request?.referenceId || request?.id.split('-')[1]?.toUpperCase() || 'N/A'}
                </div>
              </div>
            </div>

          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Left Columns: Core Info */}
          <div className="space-y-6">

            {/* Overview */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 space-y-6">
              <div>
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-900" />
                  Request Description
                </h2>
                <p className="text-gray-600 leading-relaxed text-xs">
                  {request?.description || 'No description provided.'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-3 border-t border-gray-50">
                {/* Sender Info */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Sender Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <User className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-gray-900">{request?.senderName}</p>
                        <p className="text-xs text-gray-500">Applicant</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <p className="text-xs text-gray-600">{request?.senderEmail || 'No email'}</p>
                    </div>
                  </div>
                </div>

                {/* Receiver Info */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Target Entity</h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Building2 className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-gray-900">{request?.institutionName}</p>
                        <p className="text-xs text-gray-500">{request?.positionName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <p className="text-xs text-gray-600">{request?.receiverEmail || 'No email'}</p>
                    </div>
                  </div>
                </div>

                {/* Template Info */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Template Information</h3>
                  <div className="flex items-start gap-3">
                    <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-gray-900">{request?.rtiTemplateTitle || 'Custom Request'}</p>
                      {request?.rtiTemplateFile && (
                        <p className="text-[10px] text-gray-400 font-mono break-all mt-1">{request?.rtiTemplateFile}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-900" />
                  Life-Cycle Timeline
                </h2>
                <Button size="sm" variant="outline" className="text-xs flex items-center gap-1" onClick={handleAddEvent}>
                  <Plus className="w-3 h-3" /> Add Event
                </Button>
              </div>
              <div className="p-6">
                {history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-400 space-y-2">
                    <Clock className="w-8 h-8 opacity-20" />
                    <p className="text-sm">No events logged yet.</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {history.map((h, idx) => (
                      <div key={h.id} className="relative pl-8 group">
                        {/* Line */}
                        {idx !== history.length - 1 && (
                          <div className="absolute left-[11px] top-6 bottom-[-32px] w-[2px] bg-gray-100 group-hover:bg-blue-100 transition-colors" />
                        )}

                        {/* Dot */}
                        <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-white border-2 border-blue-900 flex items-center justify-center z-10 shadow-sm">
                          <div className="w-2 h-2 rounded-full bg-blue-900" />
                        </div>

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold">
                                {statuses.find(s => s.id === h.statusId) ? (
                                  <span className="text-gray-900">{statuses.find(s => s.id === h.statusId)?.name}</span>
                                ) : (
                                  <span className="flex items-center gap-1.5 text-gray-400 italic text-sm font-medium">
                                    <AlertTriangle className="w-3.5 h-3.5 text-gray-400" />
                                    Error loading status
                                  </span>
                                )}
                              </h4>
                              {idx === 0 && statuses.find(s => s.id === h.statusId)?.name !== 'CREATED' && (
                                <button
                                  onClick={() => handleEditEvent(h)}
                                  className="p-1 text-gray-400 hover:text-blue-900 transition-colors"
                                  title="Edit latest event"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            <span className="text-[10px] font-medium text-gray-400">{new Date(h.entryTime).toLocaleString(undefined, { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>

                          <div className="flex items-center gap-3 py-1">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-widest border ${h.direction === 'outgoing' ? 'bg-orange-50 text-orange-700 border-orange-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
                              {h.direction}
                            </span>
                          </div>

                          <p className="text-sm text-gray-600 leading-relaxed">{h.description || 'No additional details provided.'}</p>

                          {h.files && h.files.length > 0 && (
                            <div className="pt-3 space-y-2">
                              <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Attachments</h5>
                              <div className="flex flex-wrap gap-2">
                                {h.files.map((file, fIdx) => (
                                  <div
                                    key={fIdx}
                                    className="flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-200 text-gray-700 rounded-lg shadow-sm hover:border-blue-300 hover:bg-blue-50/50 transition-all group"
                                  >
                                    <button
                                      onClick={() => {
                                        const link = document.createElement('a');
                                        link.href = file;
                                        link.download = file.split('/').pop() || 'document.pdf';
                                        link.click();
                                      }}
                                      className="flex items-center gap-1.5 hover:text-blue-900"
                                    >
                                      <FileText className="w-3 h-3 text-blue-900" />
                                      <span className="text-[10px] font-bold">
                                        {file.split('/').pop() || `File ${fIdx + 1}`}
                                      </span>
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Event Modal */}
      {isEventModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-lg font-bold text-gray-900">{isEditing ? 'Edit Latest Event' : 'Add New Timeline Event'}</h3>
              <button onClick={() => setIsEventModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleEventSubmit} className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Status</label>
                <select
                  required
                  value={eventFormData.statusId}
                  onChange={(e) => {
                    const statusId = e.target.value;
                    let direction = eventFormData.direction;

                    setEventFormData({ ...eventFormData, statusId, direction });
                  }}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-900 transition-colors"
                >
                  <option value="">Select Status</option>
                  {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Direction</label>
                <div className="flex gap-4">
                  {['outgoing', 'incoming'].map((dir) => {
                    return (
                      <label key={dir} className="flex-1 cursor-pointer">
                        <input
                          type="radio"
                          className="sr-only peer"
                          name="direction"
                          value={dir}
                          checked={eventFormData.direction === dir}
                          onChange={() => setEventFormData({ ...eventFormData, direction: dir as any })}
                        />
                        <div className="text-center py-2 text-xs font-bold uppercase tracking-widest border-2 rounded-xl border-gray-100 text-gray-400 peer-checked:border-blue-900 peer-checked:text-blue-900 peer-checked:bg-blue-50 transition-all capitalize">
                          {dir}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Description</label>
                <textarea
                  value={eventFormData.description}
                  onChange={(e) => setEventFormData({ ...eventFormData, description: e.target.value })}
                  placeholder="Describe this event (optional)..."
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-900 min-h-[100px] transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Attachments (PDF)</label>
                <div className="flex flex-col gap-2">
                  <input
                    id="file-upload"
                    type="file"
                    multiple
                    accept=".pdf"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      setEventFormData({ ...eventFormData, newFiles: [...eventFormData.newFiles, ...files] });
                    }}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-fit flex items-center gap-2 text-xs border-dashed border-2 hover:border-blue-900 hover:text-blue-900"
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    <Upload className="w-3.3 h-3.3" /> Select Documents
                  </Button>

                  {/* Chips for Existing and New Files */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    {/* Existing Files */}
                    {eventFormData.existingFiles.map((file, i) => (
                      <div key={`exist-${i}`} className="flex items-center gap-1.5 text-[10px] bg-blue-50 border border-blue-100 px-2 py-1 rounded-lg text-blue-700 font-bold group">
                        <FileText className="w-2.5 h-2.5" />
                        <span className="truncate max-w-[120px]">{file.split('/').pop()}</span>
                        <button
                          type="button"
                          onClick={() => setEventFormData({
                            ...eventFormData,
                            existingFiles: eventFormData.existingFiles.filter((_, idx) => idx !== i)
                          })}
                          className="text-blue-400 hover:text-red-600 transition-colors"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}

                    {/* New Files */}
                    {eventFormData.newFiles.map((f, i) => (
                      <div key={`new-${i}`} className="flex items-center gap-1.5 text-[10px] bg-green-50 border border-green-100 px-2 py-1 rounded-lg text-green-700 font-bold group">
                        <Upload className="w-2.5 h-2.5" />
                        <span className="truncate max-w-[120px]">{f.name}</span>
                        <button
                          type="button"
                          onClick={() => setEventFormData({
                            ...eventFormData,
                            newFiles: eventFormData.newFiles.filter((_, idx) => idx !== i)
                          })}
                          className="text-green-400 hover:text-red-600 transition-colors"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 flex flex-col gap-3">
                <div className="flex gap-3">
                  <Button variant="secondary" fullWidth onClick={() => setIsEventModalOpen(false)}>Cancel</Button>
                  <Button variant="primary" fullWidth type="submit" className="bg-blue-900">
                    {isEditing ? 'Update Event' : 'Add Event'}
                  </Button>
                </div>
                {isEditing && (
                  <button
                    type="button"
                    onClick={handleDeleteEntry}
                    className="w-full py-2 text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100"
                  >
                    Delete Entry
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={isDeleteConfirmOpen}
        title="Delete Timeline Event"
        message="Are you sure you want to delete this event? This action cannot be undone and will remove all associated file references."
        onConfirm={confirmDeleteEntry}
        onCancel={() => setIsDeleteConfirmOpen(false)}
        confirmText="Yes, Delete Event"
        variant="danger"
      />
    </>
  );
}
