import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Bold, Italic, Underline, Heading1, Heading2, Type, AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';

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
    return `<span class="pill-chip inline-flex items-center px-2 py-0.5 mx-1 rounded-md text-xs bg-blue-100 text-blue-800 border border-blue-200 select-none cursor-default" data-code="${code}" contenteditable="false" style="vertical-align: middle; display: inline-flex; font-weight: inherit; font-style: inherit; text-decoration: inherit;">` +
      `<span style="font-weight: inherit; font-style: inherit;">${name}</span>` +
      `<span class="pill-remove ml-1 hover:bg-blue-300 rounded-full w-4 h-4 flex items-center justify-center cursor-pointer transition-colors" onclick="this.parentElement.remove()" style="font-weight: bold; font-style: normal;">×</span>` +
      `</span>`;
  };

  const parseMarkdownToHtml = (markdown: string) => {
    if (!markdown || markdown.trim() === '') return '';

    const normalizedMarkdown = markdown.replace(/^(\s*)\*\s+(.*)$/gm, '$1- $2');
    const lines = normalizedMarkdown.split('\n');
    let html = '';
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      const olMatch = line.match(/^\d+\.\s+(.*)/);
      if (olMatch) {
        html += '<ol>';
        while (i < lines.length) {
          const lm = lines[i].match(/^\d+\.\s+(.*)/);
          if (!lm) break;
          html += `<li>${lm[1]}</li>`;
          i++;
        }
        html += '</ol>';
        continue;
      }

      const ulMatch = line.match(/^-\s+(.*)/);
      if (ulMatch) {
        html += '<ul>';
        while (i < lines.length) {
          const lm = lines[i].match(/^-\s+(.*)/);
          if (!lm) break;
          html += `<li>${lm[1]}</li>`;
          i++;
        }
        html += '</ul>';
        continue;
      }

      if (line.startsWith('<div style="text-align:') || line.trim() === '</div>') {
        html += line;
      } else if (line.startsWith('# ')) {
        html += `<h1>${line.slice(2)}</h1>`;
      } else if (line.startsWith('## ')) {
        html += `<h2>${line.slice(3)}</h2>`;
      } else if (line.trim()) {
        html += `<p>${line}</p>`;
      } else {
        html += `<p><br></p>`;
      }
      i++;
    }

    html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
    html = html.replace(/<u>(.*?)<\/u>/g, '<u>$1</u>');

    html = html.replace(/{{([^}]+)}}/g, (match) => {
      const code = match.trim();
      const cleanLabel = code.replace(/{{|}}/g, '').trim();
      const name = placeholders[code] || cleanLabel.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      return createPillHtml(code, name);
    });

    return html;
  };

  const serializeHtmlToMarkdown = (html: string) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    const normalizeGoogleDocsSpans = (root: HTMLElement) => {
      root.querySelectorAll('span').forEach(span => {
        const style = span.style;
        const fw = style.fontWeight;
        const fs = style.fontStyle;
        const td = style.textDecoration;

        // Replace span with semantic tags wrapping its content
        let inner: Node = span;

        if (td === 'underline' || td.includes('underline')) {
          const u = document.createElement('u');
          u.innerHTML = span.innerHTML;
          span.parentNode?.replaceChild(u, span);
          inner = u;
        }

        // Re-query since we may have replaced the node
        const current = inner as HTMLElement;

        if (fs === 'italic') {
          const em = document.createElement('em');
          em.innerHTML = current.innerHTML;
          current.parentNode?.replaceChild(em, current);
        }

        if (fw === 'bold' || fw === '700' || parseInt(fw) >= 600) {
          // Find the current node again after possible replacements
          const el = root.querySelector('em') || current;
          const strong = document.createElement('strong');
          strong.innerHTML = current.innerHTML;
          current.parentNode?.replaceChild(strong, current);
        }
      });
    };

    normalizeGoogleDocsSpans(tempDiv);

    const walk = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || '';
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return '';

      const el = node as HTMLElement;

      if (el.classList.contains('pill-chip')) {
        return el.getAttribute('data-code') || '';
      }

      const tag = el.tagName.toLowerCase();

      if (tag === 'ol') {
        let result = '';
        let index = 1;
        el.childNodes.forEach(child => {
          if (child.nodeType === Node.ELEMENT_NODE && (child as HTMLElement).tagName.toLowerCase() === 'li') {
            let liContent = '';
            child.childNodes.forEach(c => { liContent += walk(c); });
            liContent = liContent.replace(/<div[^>]*>/g, '').replace(/<\/div>/g, '').trim();
            result += `${index}. ${liContent}\n`;
            index++;
          }
        });
        return result;
      }

      if (tag === 'ul') {
        let result = '';
        el.childNodes.forEach(child => {
          if (child.nodeType === Node.ELEMENT_NODE && (child as HTMLElement).tagName.toLowerCase() === 'li') {
            let liContent = '';
            child.childNodes.forEach(c => { liContent += walk(c); });
            liContent = liContent.replace(/<div[^>]*>/g, '').replace(/<\/div>/g, '').trim();
            result += `- ${liContent}\n`;
          }
        });
        return result;
      }

      if (tag === 'li') {
        let content = '';
        el.childNodes.forEach(child => { content += walk(child); });
        return content;
      }

      let content = '';
      el.childNodes.forEach(child => {
        content += walk(child);
      });

      const wrapInTags = (inner: string, start: string, end: string) => {
        if (!inner || !inner.trim()) return inner || '';
        const match = inner.match(/^(\s*)([\s\S]*?)(\s*)$/);
        if (!match) return start + inner + end;
        return `${match[1]}${start}${match[2]}${end}${match[3]}`;
      };

      if (tag === 'strong' || tag === 'b') return wrapInTags(content, '**', '**');
      if (tag === 'em'     || tag === 'i') return wrapInTags(content, '*',  '*');
      if (tag === 'u') return wrapInTags(content, '<u>', '</u>');

      if (tag === 'h1') {
        const align = el.style.textAlign;
        const headerMd = `# ${content.trim()}`;
        return (align && align !== 'left')
          ? `<div style="text-align: ${align}">${headerMd}</div>\n`
          : `${headerMd}\n`;
      }
      if (tag === 'h2') {
        const align = el.style.textAlign;
        const headerMd = `## ${content.trim()}`;
        return (align && align !== 'left')
          ? `<div style="text-align: ${align}">${headerMd}</div>\n`
          : `${headerMd}\n`;
      }

      if (tag === 'p' || tag === 'div') {
        const align = el.style.textAlign;
        if (align && align !== 'left') {
          return `<div style="text-align: ${align}">${content}</div>\n`;
        }
        return content ? `${content}\n` : '\n';
      }

      if (tag === 'br') return '\n';

      if (tag === 'a') return content;

      if (tag === 'meta' || tag === 'style' || tag === 'script') return '';

      return content;
    };

    let markdown = walk(tempDiv);
    return markdown.replace(/\n{3,}/g, '\n\n').trim();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const editor = editorRef.current;
    if (!editor) return;

    // Try to get HTML from clipboard first
    const htmlData = e.clipboardData.getData('text/html');

    if (htmlData) {
      // Clean Google Docs specific wrappers
      let cleaned = htmlData
        // Remove the outer <b id="docs-internal-guid-..."> wrapper Google Docs adds
        .replace(/<b\s+id="docs-internal-guid[^"]*"[^>]*>([\s\S]*?)<\/b>/gi, '$1')
        // Remove Google Docs meta tags
        .replace(/<meta[^>]*>/gi, '')
        // Remove style blocks
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        // Remove Google Docs specific attributes
        .replace(/\s*id="docs-internal-guid[^"]*"/gi, '')
        // Normalise font-weight:700 spans to <strong>
        .replace(/<span([^>]*)font-weight\s*:\s*(?:bold|700|600)([^>]*)>([\s\S]*?)<\/span>/gi,
          '<strong>$3</strong>')
        // Normalise font-style:italic spans to <em>
        .replace(/<span([^>]*)font-style\s*:\s*italic([^>]*)>([\s\S]*?)<\/span>/gi,
          '<em>$3</em>')
        // Normalise text-decoration:underline spans to <u>
        .replace(/<span([^>]*)text-decoration\s*:[^;]*underline([^>]*)>([\s\S]*?)<\/span>/gi,
          '<u>$3</u>')
        // Strip remaining empty spans
        .replace(/<span[^>]*>([\s\S]*?)<\/span>/gi, '$1');

      // Insert cleaned HTML
      document.execCommand('insertHTML', false, cleaned);
    } else {
      // Fallback to plain text
      const text = e.clipboardData.getData('text/plain');
      document.execCommand('insertText', false, text);
    }

    setTimeout(triggerChange, 0);
  };

  const cleanEditorHtml = (editor: HTMLElement) => {
    editor.querySelectorAll('strong, b, em, i, u').forEach(tag => {
      if (tag.textContent?.trim() === '' && tag.children.length === 0) {
        tag.remove();
      }
    });
  };

  const applyFormat = (command: string, value: string | undefined = undefined) => {
    const editor = editorRef.current;
    if (!editor) return;

    const isFormatting  = ['bold', 'italic', 'underline'].includes(command);
    const isAlignment   = ['justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull'].includes(command);

    if (isAlignment) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        let container = selection.getRangeAt(0).startContainer;
        const parent = container.nodeType === Node.TEXT_NODE ? container.parentNode : container;
        const block = (parent as HTMLElement)?.closest('p, div, h1, h2');
        if (block) {
          const align = command.replace('justify', '').toLowerCase();
          const finalAlign = align === 'full' ? 'justify' : (align === '' ? 'left' : align);
          (block as HTMLElement).style.textAlign = finalAlign;
        } else {
          document.execCommand(command, false, value);
        }
      }
    } else if (isFormatting) {
      const pills = editor.querySelectorAll('.pill-chip');
      pills.forEach(pill => pill.setAttribute('contenteditable', 'true'));
      document.execCommand(command, false, value);
      pills.forEach(pill => pill.setAttribute('contenteditable', 'false'));
      cleanEditorHtml(editor);
    } else {
      document.execCommand(command, false, value);
      cleanEditorHtml(editor);
    }

    editor.focus();
    setTimeout(triggerChange, 0);
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
    while ((node = tempDiv.firstChild)) fragment.appendChild(node);
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
    document.execCommand('defaultParagraphSeparator', false, 'p');
    document.execCommand('styleWithCSS', false, 'false');
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
      if (pos) { range = document.createRange(); range.setStart(pos.offsetNode, pos.offset); range.collapse(true); }
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
    <div className={`flex flex-col h-full min-h-0 ${className}`}>
      {showToolbar && (
        <div className="flex items-center gap-1 p-2 border-b border-gray-200 bg-gray-50/50 flex-shrink-0">
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('bold')} className="p-1.5 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-gray-200 text-gray-600 transition-all" title="Bold"><Bold className="w-4 h-4" /></button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('italic')} className="p-1.5 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-gray-200 text-gray-600 transition-all" title="Italic"><Italic className="w-4 h-4" /></button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('underline')} className="p-1.5 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-gray-200 text-gray-600 transition-all" title="Underline"><Underline className="w-4 h-4" /></button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('formatBlock', 'h1')} className="p-1.5 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-gray-200 text-gray-600 transition-all" title="Heading 1"><Heading1 className="w-5 h-5" /></button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('formatBlock', 'h2')} className="p-1.5 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-gray-200 text-gray-600 transition-all" title="Heading 2"><Heading2 className="w-4 h-4" /></button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('formatBlock', 'p')} className="p-1.5 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-gray-200 text-gray-600 transition-all" title="Normal Text"><Type className="w-4 h-4" /></button>
          <div className="w-px h-4 bg-gray-200 mx-1" />
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('justifyLeft')} className="p-1.5 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-gray-200 text-gray-600 transition-all" title="Align Left"><AlignLeft className="w-4 h-4" /></button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('justifyCenter')} className="p-1.5 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-gray-200 text-gray-600 transition-all" title="Align Center"><AlignCenter className="w-4 h-4" /></button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('justifyRight')} className="p-1.5 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-gray-200 text-gray-600 transition-all" title="Align Right"><AlignRight className="w-4 h-4" /></button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('justifyFull')} className="p-1.5 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-gray-200 text-gray-600 transition-all" title="Justify"><AlignJustify className="w-4 h-4" /></button>
        </div>
      )}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={triggerChange}
        onPaste={handlePaste}
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        className="flex-1 p-8 bg-white overflow-y-auto outline-none text-[16px] text-gray-800 leading-relaxed white-space-pre-wrap cursor-text empty:before:content-[attr(data-placeholder)] empty:before:text-gray-400 empty:before:pointer-events-none empty:before:italic [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:text-gray-900 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mb-3 [&_h2]:text-gray-800 [&_p]:m-0 [&_strong]:font-bold [&_em]:italic [&_i]:italic [&_u]:underline [&_ol]:list-decimal [&_ol]:pl-8 [&_ol]:my-2 [&_ul]:list-disc [&_ul]:pl-8 [&_ul]:my-2 [&_li]:mb-1 min-h-0"
        style={{ whiteSpace: 'pre-wrap', fontFamily: '"Times New Roman", Times, serif', textAlign: 'justify', textJustify: 'inter-word' }}
        data-placeholder={placeholderText}
        data-gramm="false"
      />
    </div>
  );
});

SmartEditor.displayName = 'SmartEditor';