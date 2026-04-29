import { useState, useEffect, useRef } from 'react';
import { templateService } from '../services/templateService';
import { Template } from '../types/rti';
import { Button } from '../components/Button';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Save, Plus, Move, Trash2, Bold, Italic, Heading1, Heading2, Type } from 'lucide-react';
import toast from 'react-hot-toast';
import { Pagination } from '../components/Pagination';

// import { useAsgardeo } from '@asgardeo/react'; import this to use the http client provided by IdP


export function Templates() {

  // const { http, isSignedIn } = useAsgardeo(); grab these states. signin check and the http client for authenticated http requests

  // example request porcedure
  // useEffect(() => {
  //   if (!isSignedIn) {
  //     return;
  //   }

  //   (async () => {
  //     try {
  //       since we are using the http client provided by the IdP , the token get injected when the request is made.
  //       const response = await http.request({
  //         url: '<base-url>/scim2/Me',
  //         headers: {
  //           Accept: 'application/json',
  //           'Content-Type': 'application/scim+json',
  //         },
  //         method: 'GET',
  //       });

  //       setUserData(response.data);
  //     } catch (error) {
  //       console.error('Error fetching user data:', error);
  //     }
  //   })();
  // }, [http, isSignedIn]);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [templateToDelete, setTemplateToDelete] = useState<{ id: string, title: string } | null>(null);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });

  const editorRef = useRef<HTMLDivElement>(null);

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

  // Helper to create a pill element
  const createPillHtml = (code: string, name: string) => {
    return `<span class="pill-chip inline-flex items-center gap-1 pl-2 pr-1 py-0.5 border border-blue-200 rounded mx-0.5 bg-blue-100 text-blue-800 text-xs font-semibold align-baseline cursor-default select-none" data-code="${code}" contenteditable="false">${name}<span class="pill-remove hover:bg-blue-300 rounded px-1 cursor-pointer opacity-80 hover:opacity-100 transition-opacity flex items-center justify-center font-bold ml-0.5" onclick="this.parentElement.remove()">×</span></span>`;
  };

  // Convert Markdown to HTML with pills and formatting
  const parseMarkdownToHtml = (markdown: string) => {
    let html = markdown || '';

    // 1. Handle Bold & Italic
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>'); // double asterik bold
    html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>'); // single asterik italic
    html = html.replace(/(?<!_|\{)_([^_\{}]+)_(?!_|\})/g, '<em>$1</em>'); // underscore italic

    // 2. Handle variables (pills)
    html = html.replace(/{{([^}]+)}}/g, (match, p1) => {
      const formatted = p1.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
      return createPillHtml(match, formatted);
    });

    // 3. Handle lines and headings
    html = html.split('\n').map(line => {
      if (line.startsWith('# ')) return `<h1>${line.slice(2)}</h1>`;
      if (line.startsWith('## ')) return `<h2>${line.slice(3)}</h2>`;
      return line ? `<div>${line}</div>` : `<div><br></div>`;
    }).join('');

    return html;
  };

  // Convert HTML back to Markdown
  const serializeHtmlToMarkdown = (html: string) => {
    let cleanHtml = html.replace(/<br\s*\/?>/gi, '\n'); // Convert brs to \n

    cleanHtml = cleanHtml.replace(/<div[^>]*>/gi, '\n'); // Convert opening divs to a newline
    cleanHtml = cleanHtml.replace(/<\/div>/gi, ''); // Erase closing divs
    cleanHtml = cleanHtml.replace(/<p[^>]*>/gi, '\n'); // Convert opening paragraphs to a newline
    cleanHtml = cleanHtml.replace(/<\/p>/gi, ''); // Erase closing paragraphs

    cleanHtml = cleanHtml.replace(/<h1[^>]*>/gi, '\n# '); // Convert Heading 1 into a newline + markdown '# '
    cleanHtml = cleanHtml.replace(/<\/h1>/gi, ''); // Erase closing h1
    cleanHtml = cleanHtml.replace(/<h2[^>]*>/gi, '\n## '); // Convert Heading 2 into a newline + markdown '## '
    cleanHtml = cleanHtml.replace(/<\/h2>/gi, ''); // Erase closing h2

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = cleanHtml;

    const pills = tempDiv.querySelectorAll('.pill-chip');
    pills.forEach((pill) => {
      const code = pill.getAttribute('data-code');
      pill.replaceWith(code || '');
    });

    const bolds = tempDiv.querySelectorAll('strong, b');
    bolds.forEach(bold => bold.replaceWith(`**${bold.textContent}**`));

    const italics = tempDiv.querySelectorAll('em, i');
    italics.forEach(italic => italic.replaceWith(`*${italic.textContent}*`));

    let text = tempDiv.textContent || '';
    return text.replace(/\n{3,}/g, '\n\n').trim();
  };

  // Sync editor when template changes
  useEffect(() => {
    const loadContent = async () => {
      if (selectedTemplate) {
        let content = selectedTemplate.content;

        // load the file content from the URL if haven't already fetched it
        if (content === undefined && selectedTemplate.file) {
          try {
            const res = await fetch(selectedTemplate.file);
            content = await res.text();

            // Cache the downloaded text back into the templates array so we don't fetch it again
            setTemplates(prev => prev.map(t =>
              t.id === selectedTemplate.id ? { ...t, content: content } : t
            ));
            selectedTemplate.content = content; // update local pointer instantly
          } catch (e) {
            console.error("Failed to load file content:", e);
            content = '';
          }
        }

        if (editorRef.current && content !== undefined) {
          editorRef.current.innerHTML = parseMarkdownToHtml(content || '');
        }
        setEditedName(selectedTemplate.title);
      }
    };
    loadContent();
  }, [selectedTemplate]);

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
    const markdown = serializeHtmlToMarkdown(editorRef.current.innerHTML);

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

  const insertHtmlAtSelection = (html: string, selection: Selection | null) => {
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);

    // Check if the user dropped inside an existing pill
    let container = range.startContainer;
    if (container.nodeType === Node.TEXT_NODE) {
      container = container.parentNode as Element;
    }
    const closestPill = (container as Element)?.closest?.('.pill-chip');
    if (closestPill) {
      range.setStartAfter(closestPill);
      range.collapse(true);
    }

    // Create a temporary container for our new HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    const fragment = document.createDocumentFragment();
    let node;
    while ((node = tempDiv.firstChild)) {
      fragment.appendChild(node);
    }

    // Make sure we have a text node (an invisible zero-width character) to place the cursor onto
    const spaceNode = document.createTextNode('\u200B');
    fragment.appendChild(spaceNode);

    range.deleteContents(); // Deletes any text the user currently has highlighted
    range.insertNode(fragment);// Inserts the new variable

    // Force the cursor position right after the space node
    range.setStartAfter(spaceNode);
    range.setEndAfter(spaceNode);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('application/json');
    if (!data) return;

    const variable = JSON.parse(data);
    const pillHtml = createPillHtml(variable.code, variable.name);

    let range: Range | null = null;

    // Use standard caretPositionFromPoint if available (Firefox)
    // @ts-ignore - Type definitions might not include this yet
    if (document.caretPositionFromPoint) {
      // @ts-ignore
      const pos = document.caretPositionFromPoint(e.clientX, e.clientY);
      if (pos) {
        range = document.createRange();
        range.setStart(pos.offsetNode, pos.offset);
        range.collapse(true);
      }
    }
    // Fallback to older webkit/blink way (Chrome/Edge/Safari)
    // @ts-ignore
    else if (document.caretRangeFromPoint) {
      // @ts-ignore
      range = document.caretRangeFromPoint(e.clientX, e.clientY);
    }

    if (range) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      insertHtmlAtSelection(pillHtml, window.getSelection());
    }
  };

  const insertVariableAtCursor = (variable: any) => {
    const pillHtml = createPillHtml(variable.code, variable.name);
    editorRef.current?.focus();
    insertHtmlAtSelection(pillHtml, window.getSelection());
  };

  const applyFormat = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
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

              <div className="flex items-center gap-1 p-2 border-b border-gray-200 bg-gray-50/50">
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyFormat('bold')}
                  className="p-1.5 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-gray-200 text-gray-600 transition-all"
                  title="Bold"
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyFormat('italic')}
                  className="p-1.5 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-gray-200 text-gray-600 transition-all flex items-center gap-1"
                  title="Italic"
                >
                  <Italic className="w-4 h-4" />
                </button>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyFormat('formatBlock', 'h1')}
                  className="p-1.5 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-gray-200 text-gray-600 transition-all flex items-center gap-1"
                  title="Heading 1"
                >
                  <Heading1 className="w-5 h-5" />
                </button>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyFormat('formatBlock', 'h2')}
                  className="p-1.5 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-gray-200 text-gray-600 transition-all flex items-center gap-1"
                  title="Heading 2"
                >
                  <Heading2 className="w-4 h-4" />
                </button>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyFormat('formatBlock', 'p')}
                  className="p-1.5 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-gray-200 text-gray-600 transition-all flex items-center gap-1"
                  title="Normal Text"
                >
                  <Type className="w-4 h-4" />
                </button>
              </div>

              <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onDrop={onDrop}
                onDragOver={(e) => e.preventDefault()}
                className="flex-1 p-8 bg-white overflow-y-auto outline-none text-[16px] text-gray-800 leading-relaxed white-space-pre-wrap cursor-text empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:pointer-events-none empty:before:italic [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:text-gray-900 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mb-3 [&_h2]:text-gray-800 [&_strong]:font-bold [&_em]:italic [&_i]:italic"
                style={{ whiteSpace: 'pre-wrap' }}
                data-placeholder="Start typing your template here..."
                data-gramm="false"
                data-gramm_editor="false"
                data-enable-grammarly="false"
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