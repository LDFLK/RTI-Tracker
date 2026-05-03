import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Bold, Italic, Heading1, Heading2, Type } from 'lucide-react';

export interface SmartEditorRef {
  getMarkdown: () => string;
  setMarkdown: (markdown: string) => void;
  insertVariable: (code: string, name: string) => void;
  applyFormat: (command: string, value?: string) => void;
}

interface SmartEditorProps {
  initialMarkdown?: string;
  onChange?: (markdown: string) => void;
  placeholders?: Record<string, string>;
  className?: string;
  placeholderText?: string;
  showToolbar?: boolean;
}

export const SmartEditor = forwardRef<SmartEditorRef, SmartEditorProps>(({
  initialMarkdown = '',
  onChange,
  placeholders = {},
  className = '',
  placeholderText = 'Start typing...',
  showToolbar = true
}, ref) => {
  const editorRef = useRef<HTMLDivElement>(null);

  const createPillHtml = (code: string, name: string) => {
    return `<span class="pill-chip inline-flex items-center gap-1 pl-2 pr-1 py-0.5 border border-blue-200 rounded mx-0.5 bg-blue-100 text-blue-800 text-xs font-semibold align-baseline cursor-default select-none" data-code="${code}" contenteditable="false">${name}<span class="pill-remove hover:bg-blue-300 rounded px-1 cursor-pointer opacity-80 hover:opacity-100 transition-opacity flex items-center justify-center font-bold ml-0.5" onclick="this.parentElement.remove()">×</span></span>`;
  };

  const parseMarkdownToHtml = (markdown: string) => {
    let html = markdown || '';

    // 1. Handle variables (pills)
    html = html.replace(/{{([^}]+)}}/g, (match) => {
      const code = match.trim();
      const cleanLabel = code.replace(/{{|}}/g, '').trim();
      const name = placeholders[code] || cleanLabel.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      return createPillHtml(code, name);
    });

    // 2. Handle Bold & Italic
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
    html = html.replace(/(?<!_|\{)_([^_\{}]+)_(?!_|\})/g, '<em>$1</em>');

    // 3. Handle lines and headings
    if (!markdown || markdown.trim() === '') return '';
    html = html.split('\n').map(line => {
      if (line.startsWith('# ')) return `<h1>${line.slice(2)}</h1>`;
      if (line.startsWith('## ')) return `<h2>${line.slice(3)}</h2>`;
      return line ? `<div>${line}</div>` : `<div><br></div>`;
    }).join('');

    return html;
  };

  const serializeHtmlToMarkdown = (html: string) => {
    let cleanHtml = html.replace(/<br\s*\/?>/gi, '\n');
    cleanHtml = cleanHtml.replace(/<div[^>]*>/gi, '');
    cleanHtml = cleanHtml.replace(/<\/div>/gi, '\n');
    cleanHtml = cleanHtml.replace(/<p[^>]*>/gi, '');
    cleanHtml = cleanHtml.replace(/<\/p>/gi, '\n');
    cleanHtml = cleanHtml.replace(/<h1[^>]*>/gi, '# ');
    cleanHtml = cleanHtml.replace(/<\/h1>/gi, '\n');
    cleanHtml = cleanHtml.replace(/<h2[^>]*>/gi, '## ');
    cleanHtml = cleanHtml.replace(/<\/h2>/gi, '\n');

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
    return text.replace(/\n{3,}/g, '\n\n').replace(/\n+$/, '');
  };

  const applyFormat = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    triggerChange();
  };

  const triggerChange = () => {
    if (onChange && editorRef.current) {
      onChange(serializeHtmlToMarkdown(editorRef.current.innerHTML));
    }
  };

  const insertHtmlAtSelection = (html: string, selection: Selection | null) => {
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);

    let container = range.startContainer;
    if (container.nodeType === Node.TEXT_NODE) {
      container = container.parentNode as Element;
    }
    const closestPill = (container as Element)?.closest?.('.pill-chip');
    if (closestPill) {
      range.setStartAfter(closestPill);
      range.collapse(true);
    }

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    const fragment = document.createDocumentFragment();
    let node;
    while ((node = tempDiv.firstChild)) {
      fragment.appendChild(node);
    }

    const spaceNode = document.createTextNode('\u200B');
    fragment.appendChild(spaceNode);

    range.deleteContents();
    range.insertNode(fragment);

    range.setStartAfter(spaceNode);
    range.setEndAfter(spaceNode);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  useImperativeHandle(ref, () => ({
    getMarkdown: () => editorRef.current ? serializeHtmlToMarkdown(editorRef.current.innerHTML) : '',
    setMarkdown: (markdown: string) => {
      if (editorRef.current) {
        editorRef.current.innerHTML = parseMarkdownToHtml(markdown);
      }
    },
    insertVariable: (code: string, name: string) => {
      const pillHtml = createPillHtml(code, name);
      editorRef.current?.focus();
      insertHtmlAtSelection(pillHtml, window.getSelection());
      triggerChange();
    },
    applyFormat: (command: string, value: string | undefined = undefined) => {
      applyFormat(command, value);
    }
  }));

  useEffect(() => {
    if (editorRef.current && initialMarkdown !== undefined) {
      const currentMarkdown = serializeHtmlToMarkdown(editorRef.current.innerHTML);
      if (initialMarkdown !== currentMarkdown) {
        editorRef.current.innerHTML = parseMarkdownToHtml(initialMarkdown);
      }
    }
  }, [initialMarkdown]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('application/json');
    if (!data) return;

    const variable = JSON.parse(data);
    const pillHtml = createPillHtml(variable.code, variable.name);

    let range: Range | null = null;
    // @ts-ignore
    if (document.caretPositionFromPoint) {
      // @ts-ignore
      const pos = document.caretPositionFromPoint(e.clientX, e.clientY);
      if (pos) {
        range = document.createRange();
        range.setStart(pos.offsetNode, pos.offset);
        range.collapse(true);
      }
    }
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
      triggerChange();
    }
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {showToolbar && (
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
            className="p-1.5 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-gray-200 text-gray-600 transition-all"
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat('formatBlock', 'h1')}
            className="p-1.5 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-gray-200 text-gray-600 transition-all"
            title="Heading 1"
          >
            <Heading1 className="w-5 h-5" />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat('formatBlock', 'h2')}
            className="p-1.5 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-gray-200 text-gray-600 transition-all"
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat('formatBlock', 'p')}
            className="p-1.5 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-gray-200 text-gray-600 transition-all"
            title="Normal Text"
          >
            <Type className="w-4 h-4" />
          </button>
        </div>
      )}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={triggerChange}
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        className="flex-1 p-8 bg-white overflow-y-auto outline-none text-[16px] text-gray-800 leading-relaxed white-space-pre-wrap cursor-text empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:pointer-events-none empty:before:italic [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:text-gray-900 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mb-3 [&_h2]:text-gray-800 [&_strong]:font-bold [&_em]:italic [&_i]:italic"
        style={{ whiteSpace: 'pre-wrap' }}
        data-placeholder={placeholderText}
        data-gramm="false"
      />
    </div>
  );
});

SmartEditor.displayName = 'SmartEditor';
