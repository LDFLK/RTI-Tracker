import React, { useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import { Bold, Italic, Underline, Heading1, Heading2, Type, AlignLeft, AlignCenter, AlignRight, AlignJustify } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExtension from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';

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

// ── Pill rendering ────────────────────────────────────────────────────────────
const createPillHtml = (code: string, name: string) =>
  `<span class="pill-chip inline-flex items-center px-2 py-0.5 mx-1 rounded-md text-xs bg-blue-100 text-blue-800 border border-blue-200 select-none cursor-default" data-code="${code}" contenteditable="false" style="vertical-align:middle;display:inline-flex;font-weight:inherit;font-style:inherit;text-decoration:inherit;">` +
  `<span style="font-weight:inherit;font-style:inherit;">${name}</span>` +
  `<span class="pill-remove ml-1 hover:bg-blue-300 rounded-full w-4 h-4 flex items-center justify-center cursor-pointer transition-colors" onclick="this.parentElement.remove()" style="font-weight:bold;font-style:normal;">×</span>` +
  `</span>`;

// ── Apply inline markdown formatting to a text string ────────────────────────
// REPLACE the entire applyInlineMarkdown function:
function applyInlineMarkdown(text: string): string {
  // If the text already contains HTML bold/italic tags (e.g. from paste cleanup),
  // don't also apply markdown conversion — it would double-wrap
  if (/<strong>|<em>|<b>|<i>/.test(text)) {
    // Only pass through <u> tags, leave existing HTML as-is
    return text;
  }
  return text
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*(?!\*)([\s\S]+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    .replace(/<u>(.*?)<\/u>/g, '<u>$1</u>');
}

// ── HTML → Markdown serializer (TipTap-aware) ─────────────────────────────────
function htmlToMarkdown(html: string, placeholders: Record<string, string> = {}): string {
  const div = document.createElement('div');
  div.innerHTML = html;

  const normalizeWhitespace = (text: string) =>
    text.replace(/[ \t]+/g, ' ');

  function walkNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return normalizeWhitespace(node.textContent ?? '');
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const el = node as HTMLElement;

    // Pills → variable code
    if (el.classList?.contains('pill-chip')) {
      return el.getAttribute('data-code') ?? '';
    }

    const tag = el.tagName.toLowerCase();

    if (['script', 'style', 'meta'].includes(tag)) return '';

    const children = Array.from(el.childNodes).map(walkNode).join('');

    if (tag === 'br') return '\n';

    if (tag === 'p' || tag === 'div') {
      const align = el.style?.textAlign;
      const inner = children.trim();
      if (!inner) return '\n';
      if (align && align !== 'left') {
        return `<div style="text-align:${align}">${inner}</div>\n`;
      }
      return `${inner}\n`;
    }

    if (tag === 'h1') {
      const align = el.style?.textAlign;
      const inner = children.trim();
      const md = `# ${inner}`.trim().replace(/^#\s*/, '# ');
      return align && align !== 'left'
        ? `<div style="text-align:${align}">${md}</div>\n`
        : `${md}\n`;
    }
    if (tag === 'h2') {
      const align = el.style?.textAlign;
      const inner = children.trim();
      const md = `## ${inner}`.trim().replace(/^##\s*/, '## ');
      return align && align !== 'left'
        ? `<div style="text-align:${align}">${md}</div>\n`
        : `${md}\n`;
    }

    if (tag === 'ul') {
      return Array.from(el.children)
        .filter(c => c.tagName.toLowerCase() === 'li')
        .map(li => `- ${Array.from(li.childNodes).map(walkNode).join('').trim()}`)
        .join('\n') + '\n';
    }
    if (tag === 'ol') {
      return Array.from(el.children)
        .filter(c => c.tagName.toLowerCase() === 'li')
        .map((li, i) => `${i + 1}. ${Array.from(li.childNodes).map(walkNode).join('').trim()}`)
        .join('\n') + '\n';
    }
    if (tag === 'li') {
      return children;
    }

    // Inline formatting — preserve leading/trailing whitespace outside markers
    const wrapInline = (inner: string, open: string, close: string) => {
      const m = inner.match(/^(\s*)([\s\S]*?)(\s*)$/);
      if (!m) return `${open}${inner}${close}`;
      return `${m[1]}${open}${m[2]}${close}${m[3]}`;
    };

    if (tag === 'strong' || tag === 'b') return wrapInline(children, '**', '**');
    if (tag === 'em' || tag === 'i')     return wrapInline(children, '*', '*');
    if (tag === 'u')                      return wrapInline(children, '<u>', '</u>');

    // Span — handle pasted styles from Google Docs / Word
    if (tag === 'span') {
      const style = el.style ?? {};
      let result = children;
      const fw = style.fontWeight;
      const fs = style.fontStyle;
      const td = style.textDecoration;
      if (td?.includes('underline')) result = wrapInline(result, '<u>', '</u>');
      if (fs === 'italic')           result = wrapInline(result, '*', '*');
      if (fw === 'bold' || fw === '700' || (parseInt(fw) >= 600)) result = wrapInline(result, '**', '**');
      return result;
    }

    return children;
  }

  let md = walkNode(div);
  md = md.replace(/\n{3,}/g, '\n\n').trim();
  return md;
}

// ── Markdown → HTML (for initialising TipTap) ────────────────────────────────
function markdownToHtml(markdown: string, placeholders: Record<string, string> = {}): string {
  if (!markdown?.trim()) return '';

  const normalised = markdown.replace(/^\s*\*\s+(.*)$/gm, '- $1');
  const lines = normalised.split('\n');
  let html = '';
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Ordered list block
    if (/^\d+\.\s+/.test(line)) {
      html += '<ol>';
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        // Apply inline formatting to list item content
        const content = applyInlineMarkdown(lines[i].replace(/^\d+\.\s+/, ''));
        html += `<li>${content}</li>`;
        i++;
      }
      html += '</ol>';
      continue;
    }

    // Unordered list block
    if (/^-\s+/.test(line)) {
      html += '<ul>';
      while (i < lines.length && /^-\s+/.test(lines[i])) {
        const content = applyInlineMarkdown(lines[i].replace(/^-\s+/, ''));
        html += `<li>${content}</li>`;
        i++;
      }
      html += '</ul>';
      continue;
    }

    // Alignment divs — pass through as-is (content inside may have markdown, apply formatting)
    if (line.startsWith('<div style="text-align:') || line.startsWith('<div style="text-align: ')) {
      // Try to extract and format content inside inline div
      const inlineDiv = line.match(/^(<div[^>]*>)([\s\S]*?)(<\/div>)$/i);
      if (inlineDiv) {
        html += `${inlineDiv[1]}${applyInlineMarkdown(inlineDiv[2])}${inlineDiv[3]}`;
      } else {
        // Multi-line div opening — pass through unchanged
        html += line;
      }
    } else if (line.trim() === '</div>') {
      html += line;
    } else if (line.startsWith('# ')) {
      // Apply inline formatting to heading content
      html += `<h1>${applyInlineMarkdown(line.slice(2))}</h1>`;
    } else if (line.startsWith('## ')) {
      html += `<h2>${applyInlineMarkdown(line.slice(3))}</h2>`;
    } else if (line.trim()) {
      // Regular paragraph — apply inline formatting per-line
      html += `<p>${applyInlineMarkdown(line)}</p>`;
    } else {
      html += `<p></p>`;
    }
    i++;
  }

  // NOTE: Do NOT apply inline formatting on the full html string here —
  // it would corrupt tag attributes. Per-line application above is correct.

  // Variables → pills
  html = html.replace(/{{([^}]+)}}/g, (match) => {
    const code = match.trim();
    const cleanLabel = code.replace(/{{|}}/g, '').trim();
    const name = placeholders[code] || cleanLabel.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    return createPillHtml(code, name);
  });

  return html;
}

// ── Clean pasted HTML (Google Docs / Word / browser) ─────────────────────────
function cleanPastedHtml(raw: string): string {
  return raw
    // Remove Google Docs outer wrapper bold tag (preserves inner content)
    .replace(/<b\s+id="docs-internal-guid[^"]*"[^>]*>([\s\S]*?)<\/b>/gi, '$1')
    .replace(/<meta[^>]*>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/\s*id="docs-internal-guid[^"]*"/gi, '')
    // Preserve font-weight bold spans as <strong>
    .replace(/<span([^>]*)font-weight\s*:\s*(?:bold|700|800|600)([^>]*)>([\s\S]*?)<\/span>/gi, '<strong>$3</strong>')
    // Preserve font-style italic spans as <em>
    .replace(/<span([^>]*)font-style\s*:\s*italic([^>]*)>([\s\S]*?)<\/span>/gi, '<em>$3</em>')
    // Preserve underline spans as <u>
    .replace(/<span([^>]*)text-decoration\s*:[^;]*underline([^>]*)>([\s\S]*?)<\/span>/gi, '<u>$3</u>')
    // Strip remaining spans but keep content
    .replace(/<span[^>]*>([\s\S]*?)<\/span>/gi, '$1')
    // Collapse multiple spaces (but not newlines)
    .replace(/[ \t]{2,}/g, ' ');
}

// ── SmartEditor component ─────────────────────────────────────────────────────
export const SmartEditor = forwardRef<SmartEditorRef, SmartEditorProps>(({
  initialMarkdown = '',
  onChange,
  placeholders = {},
  className = '',
  placeholderText = 'Start typing...',
  showToolbar = true
}, ref) => {
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
        hardBreak: false,
      }),
      UnderlineExtension,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: markdownToHtml(initialMarkdown, placeholders),
    editorProps: {
      attributes: {
        class: [
          'flex-1 p-8 bg-white overflow-y-auto outline-none text-base text-gray-800 leading-relaxed cursor-text',
          '[&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:text-gray-900',
          '[&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mb-3 [&_h2]:text-gray-800',
          '[&_p]:m-0 [&_p]:leading-[1.15] [&_p]:[orphans:3] [&_p]:[widows:3] [&_strong]:font-bold [&_em]:italic [&_u]:underline',
          '[&_ol]:list-decimal [&_ol]:pl-8 [&_ol]:my-2',
          '[&_ul]:list-disc [&_ul]:pl-8 [&_ul]:my-2',
          '[&_li]:mb-1',
        ].join(' '),
        style: 'font-family:"Times New Roman",Times,serif;white-space:pre-wrap;text-align:justify;text-justify:inter-word;line-height:1.15;orphans:3;widows:3;',
        'data-placeholder': placeholderText,
      },
      handlePaste(view, event) {
        event.preventDefault();
        const clipboardData = event.clipboardData;
        if (!clipboardData) return false;

        const htmlData = clipboardData.getData('text/html');
        if (htmlData) {
          const cleaned = cleanPastedHtml(htmlData);
          // Convert pasted HTML → markdown → clean HTML for TipTap
          const md = htmlToMarkdown(cleaned, placeholders);
          const cleanHtml = markdownToHtml(md, placeholders);
          window.dispatchEvent(new CustomEvent('tiptap-paste', { detail: { html: cleanHtml } }));
          return true;
        }

        const textData = clipboardData.getData('text/plain');
        if (textData) {
          const lines = textData.split(/\r?\n/);
          const cleanHtml = lines.map(l => l.trim() ? `<p>${applyInlineMarkdown(l)}</p>` : '<p></p>').join('');
          window.dispatchEvent(new CustomEvent('tiptap-paste', { detail: { html: cleanHtml } }));
          return true;
        }

        return false;
      },
    },
    onUpdate({ editor }) {
      const html = editor.getHTML();
      const md = htmlToMarkdown(html, placeholders);
      onChangeRef.current?.(md);
    },
  });

  // Listen for paste events dispatched from handlePaste
  useEffect(() => {
    const handler = (e: Event) => {
      const { html } = (e as CustomEvent).detail;
      editor?.commands.insertContent(html, {
        parseOptions: { preserveWhitespace: 'full' },
      });
    };
    window.addEventListener('tiptap-paste', handler);
    return () => window.removeEventListener('tiptap-paste', handler);
  }, [editor]);

  // Sync initialMarkdown changes
  useEffect(() => {
    if (!editor) return;
    const newHtml = markdownToHtml(initialMarkdown, placeholders);
    const currentHtml = editor.getHTML();
    if (newHtml !== currentHtml) {
      editor.commands.setContent(newHtml, false);
    }
  }, [initialMarkdown]); // eslint-disable-line

  const applyFormat = useCallback((command: string, value?: string) => {
    if (!editor) return;
    switch (command) {
      case 'bold':      editor.chain().focus().toggleBold().run();      break;
      case 'italic':    editor.chain().focus().toggleItalic().run();    break;
      case 'underline': editor.chain().focus().toggleUnderline().run(); break;
      case 'formatBlock':
        if (value === 'h1')      editor.chain().focus().toggleHeading({ level: 1 }).run();
        else if (value === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
        else                     editor.chain().focus().setParagraph().run();
        break;
      case 'justifyLeft':   editor.chain().focus().setTextAlign('left').run();    break;
      case 'justifyCenter': editor.chain().focus().setTextAlign('center').run();  break;
      case 'justifyRight':  editor.chain().focus().setTextAlign('right').run();   break;
      case 'justifyFull':   editor.chain().focus().setTextAlign('justify').run(); break;
    }
    setTimeout(() => {
      if (editor) {
        const md = htmlToMarkdown(editor.getHTML(), placeholders);
        onChangeRef.current?.(md);
      }
    }, 0);
  }, [editor, placeholders]);

  useImperativeHandle(ref, () => ({
    getMarkdown: () => {
      if (!editor) return '';
      return htmlToMarkdown(editor.getHTML(), placeholders);
    },
    setMarkdown: (markdown: string) => {
      editor?.commands.setContent(markdownToHtml(markdown, placeholders), false);
    },
    insertVariable: (code: string, name: string) => {
      editor?.chain().focus().insertContent(createPillHtml(code, name) + '\u200B').run();
      setTimeout(() => {
        const md = htmlToMarkdown(editor?.getHTML() ?? '', placeholders);
        onChangeRef.current?.(md);
      }, 0);
    },
    applyFormat,
  }), [editor, applyFormat, placeholders]);

  return (
    <div className={`flex flex-col h-full min-h-0 ${className}`}>
      {showToolbar && (
        <div className="flex items-center gap-1 p-2 border-b border-gray-200 bg-gray-50/50 flex-shrink-0">
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('bold')}
            className="p-1.5 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-gray-200 text-gray-600 transition-all" title="Bold">
            <Bold className="w-4 h-4" />
          </button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('italic')}
            className="p-1.5 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-gray-200 text-gray-600 transition-all" title="Italic">
            <Italic className="w-4 h-4" />
          </button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('underline')}
            className="p-1.5 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-gray-200 text-gray-600 transition-all" title="Underline">
            <Underline className="w-4 h-4" />
          </button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('formatBlock', 'h1')}
            className="p-1.5 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-gray-200 text-gray-600 transition-all" title="Heading 1">
            <Heading1 className="w-5 h-5" />
          </button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('formatBlock', 'h2')}
            className="p-1.5 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-gray-200 text-gray-600 transition-all" title="Heading 2">
            <Heading2 className="w-4 h-4" />
          </button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('formatBlock', 'p')}
            className="p-1.5 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-gray-200 text-gray-600 transition-all" title="Normal Text">
            <Type className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-gray-200 mx-1" />
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('justifyLeft')}
            className="p-1.5 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-gray-200 text-gray-600 transition-all" title="Align Left">
            <AlignLeft className="w-4 h-4" />
          </button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('justifyCenter')}
            className="p-1.5 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-gray-200 text-gray-600 transition-all" title="Align Center">
            <AlignCenter className="w-4 h-4" />
          </button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('justifyRight')}
            className="p-1.5 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-gray-200 text-gray-600 transition-all" title="Align Right">
            <AlignRight className="w-4 h-4" />
          </button>
          <button onMouseDown={(e) => e.preventDefault()} onClick={() => applyFormat('justifyFull')}
            className="p-1.5 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-gray-200 text-gray-600 transition-all" title="Justify">
            <AlignJustify className="w-4 h-4" />
          </button>
        </div>
      )}
      <EditorContent
        editor={editor}
        className="flex-1 overflow-y-auto min-h-0"
        style={{ display: 'flex', flexDirection: 'column' }}
      />
    </div>
  );
});

SmartEditor.displayName = 'SmartEditor';