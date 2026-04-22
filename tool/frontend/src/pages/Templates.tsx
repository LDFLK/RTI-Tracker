import { useState, useEffect, useRef } from 'react';
import { templateService } from '../services/templateService';
import { Template } from '../types/rti';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Save, Plus, Move, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Pagination } from '../components/Pagination';
import { SmartEditor, SmartEditorRef } from '../components/SmartEditor';

export function Templates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [templateToDelete, setTemplateToDelete] = useState<{ id: string, title: string } | null>(null);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });

  const editorRef = useRef<SmartEditorRef>(null);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');


  const fetchTemplates = async (page: number = 1) => {
    setIsLoading(true);
    try {
      const response = await templateService.getRTITemplates(page, 10);

      setTemplates(response.data);
      setPagination(response.pagination);

      if (response.data.length > 0 && !selectedTemplate) {
        setSelectedTemplate(response.data[0]);
      }
      return response.data;

    } catch (error) {
      toast.error('Failed to load templates');
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates(1);
  }, []);

  const variables = [
    { name: 'Date', code: '{{date}}', desc: 'Current Date' },
    { name: 'Sender Name', code: '{{sender_name}}', desc: 'Applicant Name' },
    { name: 'Sender Email', code: '{{sender_email}}', desc: 'Applicant Email' },
    { name: 'Sender Address', code: '{{sender_address}}', desc: 'Applicant Address' },
    { name: 'Sender Contact No', code: '{{sender_contact_no}}', desc: 'Applicant Contact No' },
    { name: 'Receiver Institution', code: '{{receiver_institution}}', desc: 'Target Institution' },
    { name: 'Receiver Position', code: '{{receiver_position}}', desc: 'Target Position' },
    { name: 'Receiver Email', code: '{{receiver_email}}', desc: 'Receiver Email' },
    { name: 'Receiver Address', code: '{{receiver_address}}', desc: 'Receiver Address' },
    { name: 'Receiver Contact No', code: '{{receiver_contact_no}}', desc: 'Receiver Contact No' },
  ];

  // Sync editor when template changes
  useEffect(() => {
    const loadContent = async () => {
      if (selectedTemplate) {
        let content = selectedTemplate.content;

        // load the file content from the service if haven't already fetched it
        if (content === undefined && selectedTemplate.file) {
          try {
            content = await templateService.getTemplateContent(selectedTemplate.file);

            setTemplates(prev => prev.map(t =>
              t.id === selectedTemplate.id ? { ...t, content: content } : t
            ));

            setSelectedTemplate(prev => prev && prev.id === selectedTemplate.id ? { ...prev, content } : prev);
          } catch (e) {
            console.error("Failed to load file content:", e);
            content = '';
          }
        }

        if (editorRef.current && content !== undefined) {
          editorRef.current.setMarkdown(content || '');
        }
        setEditedName(selectedTemplate.title);
      }
    };
    loadContent();
  }, [selectedTemplate?.id]);


  const handleSelect = (template: Template | null) => {
    setSelectedTemplate(template);
  };


  const addNewTemplate = () => {
    const newTemplate: Template = {
      id: `new-${Date.now()}`,
      title: 'Untitled Template',
      description: 'New template',
      file: '',
      content: '',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setTemplates([newTemplate, ...templates]);
    setSelectedTemplate(newTemplate);
  };

  const saveTemplate = async () => {
    if (!editorRef.current || !selectedTemplate) return;
    const markdown = editorRef.current.getMarkdown();

    const isNew = selectedTemplate.id.startsWith('new-');

    try {
      let savedTemplate;

      if (isNew) {
        savedTemplate = await templateService.createRTITemplate({
          title: editedName,
          description: selectedTemplate.description || '',
          content: markdown,
          file: '',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        toast.success('New template created!');
      } else {
        savedTemplate = await templateService.updateRTITemplate(selectedTemplate.id, {
          title: editedName,
          content: markdown
        });
        toast.success('Template updated!');
      }

      await fetchTemplates(1);

      setSelectedTemplate(savedTemplate);
      setIsEditingName(false);
    } catch (error) {
      toast.error('Failed to save template');
    }
  };

  const deleteTemplate = (id: string, title: string) => {
    setTemplateToDelete({ id, title });
  };

  const confirmDelete = async () => {
    if (!templateToDelete) return;

    setTemplateToDelete(null);

    try {
      await templateService.deleteRTITemplate(templateToDelete.id);
      toast.success('Template deleted');

      const pageToFetch = templates.length === 1 && pagination.page > 1
        ? pagination.page - 1
        : pagination.page;

      const isDeletingSelected = selectedTemplate?.id === templateToDelete.id;

      const newData = await fetchTemplates(pageToFetch);

      if (isDeletingSelected) {
        if (newData && newData.length > 0) {
          setSelectedTemplate(newData[0]);
        } else {
          setSelectedTemplate(null);
        }
      }
    } catch (error) {
      toast.error('Failed to delete template');
    }
  };

  const onDragStart = (e: React.DragEvent, variable: any) => {
    e.dataTransfer.setData('application/json', JSON.stringify(variable));
  };

  const insertVariableAtCursor = (variable: any) => {
    editorRef.current?.insertVariable(variable.code, variable.name);
  };

  return (
    <div className="flex flex-col space-y-4 lg:h-[calc(100vh-4rem)]">
      <div className="flex flex-wrap justify-between items-end gap-4">
        <div className="min-w-[200px]">
          <h1 className="text-2xl font-bold text-gray-900">RTI Template Manager</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage RTI templates for RTI generation.
          </p>
        </div>
        {templates.length > 0 && (
          <Button onClick={addNewTemplate} className="flex items-center gap-2 whitespace-nowrap flex-shrink-0">
            <Plus className="w-4 h-4" /> New Template
          </Button>
        )}
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 lg:overflow-hidden">
        {/* Sidebar */}
        {templates.length > 0 && (
          <div className="w-full lg:w-60 h-80 lg:h-auto flex flex-col bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex-shrink-0">
            <div className="p-3 border-b border-gray-200 bg-gray-50/50 font-semibold text-xs uppercase tracking-wider text-gray-500">
              Saved Templates
            </div>
            <div className="flex-1 overflow-y-auto">
              {templates.map((template: Template) => (
                <div key={template.id} className="group relative">
                  <button
                    onClick={() => handleSelect(template)}
                    className={`w-full text-left p-4 border-b border-gray-100 text-sm transition-all relative ${selectedTemplate?.id === template.id
                      ? 'bg-blue-50 text-blue-900 font-medium'
                      : 'hover:bg-gray-50 text-gray-600'
                      }`}
                  >
                    {selectedTemplate?.id === template.id && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600" />
                    )}
                    {template.title}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTemplate(template.id, template.title);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            {/* Pagination Controls */}
            <div className="p-3 border-t border-gray-100 bg-gray-50/30">
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={(nextPage) => fetchTemplates(nextPage)}
                variant="simple"
                loading={isLoading}
              />
            </div>
          </div>
        )}

        {/* Smart Editor or Empty State */}
        <div className="flex-1 min-h-[600px] lg:min-h-0 flex flex-col bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden relative">
          {templates.length > 0 && selectedTemplate ? (
            <>
              <div className="p-3 border-b border-gray-200 bg-white flex flex-wrap justify-between items-center gap-2 z-10">
                <div className="flex items-center gap-2 flex-1 min-w-[150px]">
                  {isEditingName ? (
                    <input
                      autoFocus
                      className="text-sm font-semibold text-gray-700 bg-gray-50 px-2 py-1 rounded border border-blue-200 focus:outline-none"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      onBlur={() => setIsEditingName(false)}
                    />
                  ) : (
                    <span
                      onClick={() => setIsEditingName(true)}
                      className="font-semibold text-sm text-gray-700 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
                    >
                      {editedName}
                    </span>
                  )}
                </div>
                <Button size="sm" variant="primary" onClick={saveTemplate} className="flex items-center gap-2 whitespace-nowrap flex-shrink-0">
                  <Save className="w-4 h-4" /> Save Template
                </Button>
              </div>

              <SmartEditor
                ref={editorRef}
                initialMarkdown={selectedTemplate.content}
                placeholderText="Start typing your template here..."
                className="flex-1"
              />

            </>
          ) : isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50/50">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-500 text-sm">Loading templates...</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/50">
              <p className="text-gray-500 mb-4 max-w-sm">
                Get started by creating a new template.
              </p>
              <Button onClick={addNewTemplate} className="flex items-center gap-2 whitespace-nowrap flex-shrink-0">
                <Plus className="w-4 h-4" /> Create Template
              </Button>
            </div>
          )}
        </div>

        {/* Variables */}
        {templates.length > 0 && (
          <div className="w-full lg:w-60 h-[350px] lg:h-auto flex flex-col bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex-shrink-0">
            <div className="p-3 border-b border-gray-200 bg-gray-50/50 font-semibold text-xs uppercase tracking-wider text-gray-500">
              Variables
            </div>
            <div className="p-4 bg-blue-50/50 border-b border-blue-100">
              <p className="text-[11px] text-blue-700 leading-tight">
                <strong>Tip:</strong> Click a variable to insert it at your cursor, or drag and drop it into the editor.
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {variables.map((v) => (
                <div
                  key={v.name}
                  draggable
                  onDragStart={(e) => onDragStart(e, v)}
                  onClick={() => insertVariableAtCursor(v)}
                  className="group cursor-pointer bg-white border border-gray-200 rounded-lg p-3 hover:border-blue-400 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-2">
                    <div className="p-1 bg-blue-50 rounded text-blue-600">
                      <Move className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-sm font-bold text-gray-900">{v.name}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{v.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!templateToDelete}
        title="Delete Template?"
        message={`Are you sure you want to delete "${templateToDelete?.title}"? This action cannot be undone.`}
        onCancel={() => setTemplateToDelete(null)}
        onConfirm={confirmDelete}
        confirmText="Delete Template"
      />
    </div>
  );
}