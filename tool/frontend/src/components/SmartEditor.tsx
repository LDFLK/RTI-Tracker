import React, {
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from 'react';
import {
  Bold, Italic, Underline, Heading1, Heading2, Type,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
} from 'lucide-react';
import {
  useEditor, EditorContent, Node, mergeAttributes, ReactNodeViewRenderer, NodeViewWrapper,
} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExtension from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';

// ─────────────────────────────────────────────────────────────────────────────
// VARIABLE PILL
// ─────────────────────────────────────────────────────────────────────────────
const PillView = ({ node, deleteNode }: any) => (
  <NodeViewWrapper as="span" style={{ display: 'inline' }}>
    <span
      contentEditable={false}
      style={{
        display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle',
        padding: '1px 6px', margin: '0 2px', borderRadius: '6px',
        fontSize: '0.75rem', background: '#dbeafe', color: '#1e40af',
        border: '1px solid #bfdbfe', cursor: 'default', userSelect: 'none',
        fontWeight: 600, lineHeight: 1.6, whiteSpace: 'nowrap',
      }}
    >
      <span>{node.attrs.name}</span>
      <span
        onClick={deleteNode}
        style={{
          marginLeft: '4px', cursor: 'pointer', fontWeight: 'bold',
          borderRadius: '9999px', width: '14px', height: '14px',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '10px', lineHeight: 1, color: '#1e40af',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = '#bfdbfe')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >×</span>
    </span>
  </NodeViewWrapper>
);

const VariablePill = Node.create({
  name: 'variablePill',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,
  addAttributes() {
    return {
      code: { default: '' },
      name: { default: '' },
    };
  },
  parseHTML() {
    return [{
      tag: 'span[data-variable]',
      getAttrs: dom => ({
        code: (dom as HTMLElement).getAttribute('data-variable'),
        name: (dom as HTMLElement).getAttribute('data-name'),
      }),
    }];
  },
  renderHTML({ node }) {
    return [
      'span',
      mergeAttributes({
        'data-variable': node.attrs.code || '',
        'data-name': node.attrs.name || '',
        class: 'variable-pill',
        contenteditable: 'false',
      }),
      node.attrs.name || '',
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(PillView);
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// PAGE BREAK NODE
// ─────────────────────────────────────────────────────────────────────────────
const PageBreakView = ({ deleteNode }: any) => (
  <NodeViewWrapper>
    <div
      contentEditable={false}
      style={{
        borderTop: '2px dashed #94a3b8',
        margin: '12px 0',
        position: 'relative',
        textAlign: 'center',
        cursor: 'default',
      }}
    >
      <span style={{
        background: 'white', padding: '0 8px', color: '#94a3b8',
        fontSize: '11px', fontFamily: 'sans-serif',
        position: 'relative', top: '-10px', userSelect: 'none',
      }}>
        — Page Break —
      </span>
      <span
        onClick={deleteNode}
        style={{
          position: 'absolute', right: 0, top: '-9px',
          cursor: 'pointer', color: '#94a3b8', fontSize: '12px', padding: '0 4px',
        }}
        title="Remove page break"
      >×</span>
    </div>
  </NodeViewWrapper>
);

const PageBreak = Node.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,
  parseHTML() {
    return [{ tag: 'div.page-break' }];
  },
  renderHTML() {
    return ['div', {
      class: 'page-break',
      'data-page-break': 'true',
      style: 'page-break-after:always;',
    }];
  },
  addNodeView() {
    return ReactNodeViewRenderer(PageBreakView);
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// INLINE MARKDOWN HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function applyInlineMarkdown(text: string): string {
  if (/<(strong|em|b|i)\b/.test(text)) return text;
  return text
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*(?!\*)([\s\S]+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    .replace(/<u>(.*?)<\/u>/g, '<u>$1</u>');
}

// ─────────────────────────────────────────────────────────────────────────────
// HTML → MARKDOWN
// ─────────────────────────────────────────────────────────────────────────────
function htmlToMarkdown(
  html: string,
  _placeholders: Record<string, string> = {}
): string {
  const div = document.createElement('div');
  div.innerHTML = html;

  function walkNode(node: globalThis.Node): string {
    if (node.nodeType === globalThis.Node.TEXT_NODE) {
      return (node.textContent ?? '').replace(/[ \t]+/g, ' ');
    }
    if (node.nodeType !== globalThis.Node.ELEMENT_NODE) return '';

    const el = node as HTMLElement;

    if (el.hasAttribute('data-variable')) {
      return el.getAttribute('data-variable') ?? '';
    }

    const tag = el.tagName.toLowerCase();
    if (['script', 'style', 'meta'].includes(tag)) return '';

    if (tag === 'div' && (el.classList.contains('page-break') || el.getAttribute('data-page-break') === 'true')) {
      return '<!--PAGE_BREAK-->\n';
    }

    // Skip injected page-line divs so they don't pollute the markdown
    if (el.classList.contains('pdf-page-line')) {
      return '';
    }

    const children = (): string =>
      Array.from(el.childNodes).map(walkNode).join('');

    if (tag === 'br') return '\n';

    if (tag === 'p' || tag === 'div') {
      const align = el.style?.textAlign;
      const inner = children().trim();
      if (!inner) return '\n';
      return align && align !== 'left'
        ? `<div style="text-align:${align}">${inner}</div>\n`
        : `${inner}\n`;
    }

    if (tag === 'h1') {
      const align = el.style?.textAlign;
      const inner = children().trim();
      return align && align !== 'left'
        ? `<div style="text-align:${align}"># ${inner}</div>\n`
        : `# ${inner}\n`;
    }
    if (tag === 'h2') {
      const align = el.style?.textAlign;
      const inner = children().trim();
      return align && align !== 'left'
        ? `<div style="text-align:${align}">## ${inner}</div>\n`
        : `## ${inner}\n`;
    }

    if (tag === 'ul') {
      return (
        Array.from(el.children)
          .filter(c => c.tagName.toLowerCase() === 'li')
          .map(li => `- ${Array.from(li.childNodes).map(walkNode).join('').trim()}`)
          .join('\n') + '\n'
      );
    }
    if (tag === 'ol') {
      return (
        Array.from(el.children)
          .filter(c => c.tagName.toLowerCase() === 'li')
          .map((li, i) => `${i + 1}. ${Array.from(li.childNodes).map(walkNode).join('').trim()}`)
          .join('\n') + '\n'
      );
    }
    if (tag === 'li') return children();

    const wrap = (inner: string, o: string, c: string) => {
      if (inner.includes('\n')) return inner;
      const m = inner.match(/^(\s*)([\s\S]*?)(\s*)$/);
      return m ? `${m[1]}${o}${m[2]}${c}${m[3]}` : `${o}${inner}${c}`;
    };

    if (tag === 'strong' || tag === 'b') return wrap(children(), '**', '**');
    if (tag === 'em'     || tag === 'i') return wrap(children(), '*',  '*');
    if (tag === 'u')                     return wrap(children(), '<u>', '</u>');

    if (tag === 'span') {
      const s = el.style ?? {};
      let r = children();
      if (s.textDecoration?.includes('underline')) r = wrap(r, '<u>', '</u>');
      if (s.fontStyle === 'italic')                r = wrap(r, '*',  '*');
      const fw = parseInt(s.fontWeight ?? '0');
      if (s.fontWeight === 'bold' || fw >= 600)    r = wrap(r, '**', '**');
      return r;
    }

    return children();
  }

  let md = walkNode(div);
  md = md.replace(/\n{3,}/g, '\n\n').trim();
  return md;
}

// ─────────────────────────────────────────────────────────────────────────────
// MARKDOWN → HTML
// ─────────────────────────────────────────────────────────────────────────────
function pillSpan(code: string, name: string): string {
  return `<span data-variable="${code}" data-name="${name}"></span>`;
}

function markdownToHtml(
  markdown: string,
  placeholders: Record<string, string> = {}
): string {
  if (!markdown?.trim()) return '';

  const normalised = markdown.replace(/^\s*\*\s+(.*)$/gm, '- $1');
  const lines = normalised.split('\n');
  let html = '';
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '<!--PAGE_BREAK-->') {
      html += '<div class="page-break" data-page-break="true" style="page-break-after:always;"></div>';
      i++;
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      html += '<ol>';
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        html += `<li>${applyInlineMarkdown(lines[i].replace(/^\d+\.\s+/, ''))}</li>`;
        i++;
      }
      html += '</ol>';
      continue;
    }

    if (/^-\s+/.test(line)) {
      html += '<ul>';
      while (i < lines.length && /^-\s+/.test(lines[i])) {
        html += `<li>${applyInlineMarkdown(lines[i].replace(/^-\s+/, ''))}</li>`;
        i++;
      }
      html += '</ul>';
      continue;
    }

    if (line.trim().startsWith('<div style="text-align:')) {
      const m = line.match(
        /^<div\s+style="text-align:\s*(left|center|right|justify);?">([\s\S]*?)<\/div>$/i
      );
      if (m) {
        const align   = m[1].toLowerCase();
        const content = m[2].trim();
        if (content.startsWith('# '))
          html += `<h1 style="text-align:${align}">${applyInlineMarkdown(content.slice(2))}</h1>`;
        else if (content.startsWith('## '))
          html += `<h2 style="text-align:${align}">${applyInlineMarkdown(content.slice(3))}</h2>`;
        else
          html += `<p style="text-align:${align}">${applyInlineMarkdown(content)}</p>`;
      } else {
        html += line;
      }
    } else if (line.startsWith('# ')) {
      html += `<h1>${applyInlineMarkdown(line.slice(2))}</h1>`;
    } else if (line.startsWith('## ')) {
      html += `<h2>${applyInlineMarkdown(line.slice(3))}</h2>`;
    } else if (line.trim()) {
      html += `<p>${applyInlineMarkdown(line)}</p>`;
    } else {
      html += '<p></p>';
    }
    i++;
  }

  html = html.replace(/\{\{([^}]+)\}\}/g, (_match, inner) => {
    const code  = `{{${inner.trim()}}}`;
    const label = inner.trim();
    const name  =
      placeholders[code] ??
      label.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
    return pillSpan(code, name);
  });

  return html;
}

// ─────────────────────────────────────────────────────────────────────────────
// PASTE CLEANER
// ─────────────────────────────────────────────────────────────────────────────
function cleanPastedHtml(raw: string): string {
  return raw
    .replace(/<b\s+id="docs-internal-guid[^"]*"[^>]*>([\s\S]*?)<\/b>/gi, '$1')
    .replace(/<b\s+style="[^"]*font-weight:\s*normal[^"]*"[^>]*>([\s\S]*?)<\/b>/gi, '$1')
    .replace(/<meta[^>]*>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/\s*id="docs-internal-guid[^"]*"/gi, '')
    .replace(/<span([^>]*)font-weight\s*:\s*(?:bold|700|800|600)([^>]*)>([\s\S]*?)<\/span>/gi, '<strong>$3</strong>')
    .replace(/<span([^>]*)font-style\s*:\s*italic([^>]*)>([\s\S]*?)<\/span>/gi, '<em>$3</em>')
    .replace(/<span([^>]*)text-decoration\s*:[^;]*underline([^>]*)>([\s\S]*?)<\/span>/gi, '<u>$3</u>')
    .replace(/<span[^>]*>([\s\S]*?)<\/span>/gi, '$1')
    .replace(/[ \t]{2,}/g, ' ');
}

// PDF LAYOUT CONSTANTS — SOURCE OF TRUTH IS pdfUtils.ts
//
// These values MUST be kept byte-for-byte identical to the constants at the
// top of pdfUtils.ts. They are duplicated here (rather than imported) only
// because the two files may live in different build targets; if your build
// allows a shared module, move this whole block into e.g. `pdfLayout.ts`
// and import it from both files instead of hand-syncing two copies.

const PAGE_W_MM          = 210;            // jsPDF format: 'a4' → 210mm wide
const PAGE_H_MM          = 297;            // a4 height
const MARGIN_MM          = 19;             // pdfUtils.ts MARGIN
const CONTENT_START_Y_MM = 35;             // pdfUtils.ts CONTENT_START_Y
const BOTTOM_LIMIT_MM    = PAGE_H_MM - 30; // pdfUtils.ts BOTTOM_LIMIT (267)
const USABLE_H_MM        = BOTTOM_LIMIT_MM - CONTENT_START_Y_MM; // 232mm/page

const BASE_FONT_PT   = 12;                 // pdfUtils.ts BASE_FONT_SIZE
const LINE_SPACING   = 1.15;               // pdfUtils.ts LINE_SPACING
// pdfUtils.ts: LINE_H = BASE_FONT_SIZE * LINE_SPACING * 0.442778 (pt → mm line box)
const LINE_H_MM       = BASE_FONT_PT * LINE_SPACING * 0.442778;
const PARA_SPACING_MM = LINE_H_MM * 0.5;   // pdfUtils.ts PARA_SPACING

const H1_SIZE_PT = 18;
const H2_SIZE_PT = 16;
// pdfUtils.ts heading line-height conversion uses 0.352778 (pt → mm), not 0.442778
const H1_LINE_MM = H1_SIZE_PT * LINE_SPACING * 0.352778;
const H2_LINE_MM = H2_SIZE_PT * LINE_SPACING * 0.352778;

// CSS mm is an absolute unit: 1mm = 96/25.4 px, always — no measuring needed.
const MM_TO_PX = 96 / 25.4;


const PREVIEW_CSS = `
  .pdf-page-content {
    box-sizing: border-box;
    width: ${PAGE_W_MM}mm;
    min-height: ${PAGE_H_MM}mm;
    margin: 0 auto;
    padding: ${CONTENT_START_Y_MM}mm ${MARGIN_MM}mm ${PAGE_H_MM - BOTTOM_LIMIT_MM}mm;
    font-family: 'Tinos', 'Times New Roman', Times, serif;
    font-size: ${BASE_FONT_PT}pt;
    line-height: ${LINE_H_MM}mm;
    color: #1f2937;
    text-align: justify;
    text-justify: inter-word;
    white-space: pre-wrap;
    background: #ffffff;
    cursor: text;
    outline: none;
  }
  .pdf-page-content p {
    margin: 0 0 ${PARA_SPACING_MM}mm 0;
  }
  .pdf-page-content h1 {
    font-size: ${H1_SIZE_PT}pt;
    line-height: ${H1_LINE_MM}mm;
    font-weight: bold;
    color: inherit;
    margin: ${LINE_H_MM * 1.5}mm 0 ${LINE_H_MM * 0.6}mm 0;
  }
  .pdf-page-content h2 {
    font-size: ${H2_SIZE_PT}pt;
    line-height: ${H2_LINE_MM}mm;
    font-weight: bold;
    color: inherit;
    margin: ${LINE_H_MM * 0.8}mm 0 ${LINE_H_MM * 0.4}mm 0;
  }
  .pdf-page-content strong { font-weight: bold; }
  .pdf-page-content em { font-style: italic; }
  .pdf-page-content u { text-decoration: underline; }
  .pdf-page-content ul, .pdf-page-content ol {
    margin: ${PARA_SPACING_MM}mm 0;
    padding-left: 10mm;
  }
  .pdf-page-content li { margin-bottom: 2mm; }
  .pdf-page-content[data-placeholder]:empty::before {
    content: attr(data-placeholder);
    color: #9ca3af;
    pointer-events: none;
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
// SMARTEDITOR COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export const SmartEditor = forwardRef<SmartEditorRef, SmartEditorProps>(
  ({
    initialMarkdown = '',
    onChange,
    placeholders = {},
    className = '',
    placeholderText = 'Start typing…',
    showToolbar = true,
  }, ref) => {
    const onChangeRef = useRef(onChange);
    useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

    const placeholdersRef = useRef(placeholders);
    useEffect(() => { placeholdersRef.current = placeholders; }, [placeholders]);

    // Ref for the scroll container that wraps EditorContent
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // ── Editor ───────────────────────────────────────────────────────────────
    const editor = useEditor({
      extensions: [
        StarterKit.configure({ heading: { levels: [1, 2] }, hardBreak: false }),
        UnderlineExtension,
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        VariablePill,
        PageBreak,
      ],
      content: markdownToHtml(initialMarkdown, placeholders),
      editorProps: {
        attributes: {
          // All real styling now lives in PREVIEW_CSS (`.pdf-page-content`),
          // which mirrors pdfUtils.ts in real mm/pt units. The old Tailwind
          // class list + inline `style:` string here used fluid/rem-based
          // sizing that had no fixed relationship to the PDF's mm geometry,
          // which is what made the page-break preview drift.
          class: 'pdf-page-content',
          'data-placeholder': placeholderText,
        },

        handlePaste(_view, event) {
          event.preventDefault();
          const cd = event.clipboardData;
          if (!cd) return false;
          const htmlData = cd.getData('text/html');
          if (htmlData) {
            const md = htmlToMarkdown(cleanPastedHtml(htmlData), placeholdersRef.current);
            window.dispatchEvent(new CustomEvent('smarteditor:insert', {
              detail: { html: markdownToHtml(md, placeholdersRef.current) }
            }));
            return true;
          }
          const textData = cd.getData('text/plain');
          if (textData) {
            const finalHtml = textData
              .split(/\r?\n/)
              .map(l => l.trim() ? `<p>${applyInlineMarkdown(l)}</p>` : '<p></p>')
              .join('');
            window.dispatchEvent(new CustomEvent('smarteditor:insert', { detail: { html: finalHtml } }));
            return true;
          }
          return false;
        },

        handleDrop(_view, event) {
          const raw = event.dataTransfer?.getData('application/json');
          if (!raw) return false;
          try {
            const v = JSON.parse(raw) as { code: string; name: string };
            event.preventDefault();
            window.dispatchEvent(new CustomEvent('smarteditor:insertNode', { detail: v }));
            return true;
          } catch { return false; }
        },
      },

      onUpdate({ editor: e }) {
        onChangeRef.current?.(htmlToMarkdown(e.getHTML(), placeholdersRef.current));
        updatePageLines();
      },
    });

    // ── Page boundary lines ──────────────────────────────────────────────────
    // We inject lines into the scroll container (which we own) so they scroll
    // with the content. Because the ProseMirror root is now laid out in real
    // mm (via PREVIEW_CSS) instead of a fluid Tailwind layout, the px-per-mm
    // ratio is the fixed constant MM_TO_PX — there is nothing left to measure
    // or infer, which is what made the old version wrong on different screen
    // widths/zoom levels.
    const updatePageLines = useCallback(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const proseMirror = container.querySelector('.ProseMirror') as HTMLElement | null;
      if (!proseMirror) return;

      // Remove old lines
      container.querySelectorAll('.pdf-page-line').forEach(el => el.remove());

      const pageHeightPx   = USABLE_H_MM * MM_TO_PX;          // 232mm of usable text per page
      const firstPageTopPx = CONTENT_START_Y_MM * MM_TO_PX;   // matches PREVIEW_CSS padding-top
      const totalHeight    = proseMirror.scrollHeight;
      const topOffset      = proseMirror.offsetTop;

      // The first page break sits one "usable height" below the top padding.
      // Every subsequent break is purely +232mm: the 65mm header/footer gap
      // that exists between physical PDF pages is an artifact of doc.addPage()
      // (a fresh CONTENT_START_Y) — it doesn't consume any editor scroll space,
      // so it must not be added again for page 3, 4, etc.
      let pageY   = firstPageTopPx + pageHeightPx;
      let pageNum = 2;

      while (pageY < totalHeight) {
        const line = document.createElement('div');
        line.className = 'pdf-page-line';
        line.style.cssText = `
          position: absolute;
          left: 0;
          right: 0;
          top: ${topOffset + pageY}px;
          border-top: 2px dashed #94a3b8;
          pointer-events: none;
          z-index: 10;
        `;

        const label = document.createElement('span');
        label.style.cssText = `
          position: absolute;
          right: 8px;
          top: 2px;
          font-size: 10px;
          color: #94a3b8;
          font-family: sans-serif;
          background: white;
          padding: 0 6px;
          border-radius: 4px;
          white-space: nowrap;
          pointer-events: none;
        `;
        label.textContent = `page ${pageNum} starts here`;

        line.appendChild(label);
        container.appendChild(line);

        pageY += pageHeightPx;
        pageNum++;
      }
    }, []);

    // Run on mount
    useEffect(() => {
      if (!editor) return;
      const timer = setTimeout(updatePageLines, 150);
      return () => clearTimeout(timer);
    }, [editor, updatePageLines]);

    // Re-run when initialMarkdown changes externally
    useEffect(() => {
      const timer = setTimeout(updatePageLines, 150);
      return () => clearTimeout(timer);
    }, [initialMarkdown, updatePageLines]);

    // Also re-run on window resize. With fixed mm sizing this matters less
    // than before (the page itself no longer resizes with the viewport),
    // but the scroll container height/visible area can still change.
    useEffect(() => {
      const onResize = () => updatePageLines();
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }, [updatePageLines]);

    // Re-run once web fonts finish loading. If "Tinos" (or any custom font)
    // loads asynchronously, line heights/wrap points can shift slightly
    // after the initial 150ms measurement — re-measuring after fonts are
    // ready avoids a stale set of page-break lines.
    useEffect(() => {
      if (typeof document === 'undefined' || !('fonts' in document)) return;
      (document as any).fonts?.ready?.then(() => updatePageLines());
    }, [updatePageLines]);

    // ── Event listeners ──────────────────────────────────────────────────────
    useEffect(() => {
      const handler = (e: Event) => {
        const { html } = (e as CustomEvent<{ html: string }>).detail;
        editor?.commands.insertContent(html, { parseOptions: { preserveWhitespace: 'full' } });
        setTimeout(() => {
          if (editor) onChangeRef.current?.(htmlToMarkdown(editor.getHTML(), placeholdersRef.current));
          updatePageLines();
        }, 0);
      };
      window.addEventListener('smarteditor:insert', handler);
      return () => window.removeEventListener('smarteditor:insert', handler);
    }, [editor, updatePageLines]);

    useEffect(() => {
      const handler = (e: Event) => {
        const { code, name } = (e as CustomEvent<{ code: string; name: string }>).detail;
        editor?.chain().focus().insertContent({ type: 'variablePill', attrs: { code, name } }).run();
        setTimeout(() => {
          if (editor) onChangeRef.current?.(htmlToMarkdown(editor.getHTML(), placeholdersRef.current));
          updatePageLines();
        }, 0);
      };
      window.addEventListener('smarteditor:insertNode', handler);
      return () => window.removeEventListener('smarteditor:insertNode', handler);
    }, [editor, updatePageLines]);

    useEffect(() => {
      if (!editor) return;
      const newHtml = markdownToHtml(initialMarkdown, placeholdersRef.current);
      if (newHtml !== editor.getHTML()) {
        editor.commands.setContent(newHtml);
        setTimeout(updatePageLines, 150);
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialMarkdown]);

    // ── Format commands ──────────────────────────────────────────────────────
    const applyFormat = useCallback(
      (command: string, value?: string) => {
        if (!editor) return;
        switch (command) {
          case 'bold':          editor.chain().focus().toggleBold().run();             break;
          case 'italic':        editor.chain().focus().toggleItalic().run();           break;
          case 'underline':     editor.chain().focus().toggleUnderline().run();        break;
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
          if (editor) onChangeRef.current?.(htmlToMarkdown(editor.getHTML(), placeholdersRef.current));
          updatePageLines();
        }, 0);
      },
      [editor, updatePageLines]
    );

    // ── Page break insert ────────────────────────────────────────────────────
    const insertPageBreak = useCallback(() => {
      editor?.chain().focus().insertContent({ type: 'pageBreak' }).run();
      setTimeout(() => {
        if (editor) onChangeRef.current?.(htmlToMarkdown(editor.getHTML(), placeholdersRef.current));
        updatePageLines();
      }, 0);
    }, [editor, updatePageLines]);

    useImperativeHandle(ref, () => ({
      getMarkdown: () =>
        editor ? htmlToMarkdown(editor.getHTML(), placeholdersRef.current) : '',
      setMarkdown: (markdown: string) => {
        editor?.commands.setContent(markdownToHtml(markdown, placeholdersRef.current));
        setTimeout(updatePageLines, 150);
      },
      insertVariable: (code: string, name: string) => {
        editor?.chain().focus().insertContent({ type: 'variablePill', attrs: { code, name } }).run();
        setTimeout(() => {
          if (editor) onChangeRef.current?.(htmlToMarkdown(editor.getHTML(), placeholdersRef.current));
          updatePageLines();
        }, 0);
      },
      applyFormat,
    }), [editor, applyFormat, updatePageLines]);

    // ── Render ───────────────────────────────────────────────────────────────
    return (
      <div className={`flex flex-col h-full min-h-0 ${className}`}>
        <style>{PREVIEW_CSS}</style>

        {showToolbar && (
          <div className="flex items-center gap-1 p-2 border-b border-gray-200 bg-gray-50/50 flex-shrink-0 flex-wrap">
            <ToolbarBtn title="Bold"        onClick={() => applyFormat('bold')}>            <Bold        className="w-4 h-4" /></ToolbarBtn>
            <ToolbarBtn title="Italic"      onClick={() => applyFormat('italic')}>          <Italic      className="w-4 h-4" /></ToolbarBtn>
            <ToolbarBtn title="Underline"   onClick={() => applyFormat('underline')}>       <Underline   className="w-4 h-4" /></ToolbarBtn>
            <ToolbarBtn title="Heading 1"   onClick={() => applyFormat('formatBlock','h1')}><Heading1    className="w-5 h-5" /></ToolbarBtn>
            <ToolbarBtn title="Heading 2"   onClick={() => applyFormat('formatBlock','h2')}><Heading2    className="w-4 h-4" /></ToolbarBtn>
            <ToolbarBtn title="Normal Text" onClick={() => applyFormat('formatBlock','p')}>  <Type       className="w-4 h-4" /></ToolbarBtn>
            <div className="w-px h-4 bg-gray-200 mx-1" />
            <ToolbarBtn title="Align Left"   onClick={() => applyFormat('justifyLeft')}>   <AlignLeft    className="w-4 h-4" /></ToolbarBtn>
            <ToolbarBtn title="Align Center" onClick={() => applyFormat('justifyCenter')}> <AlignCenter  className="w-4 h-4" /></ToolbarBtn>
            <ToolbarBtn title="Align Right"  onClick={() => applyFormat('justifyRight')}>  <AlignRight   className="w-4 h-4" /></ToolbarBtn>
            <ToolbarBtn title="Justify"      onClick={() => applyFormat('justifyFull')}>   <AlignJustify className="w-4 h-4" /></ToolbarBtn>
            <div className="w-px h-4 bg-gray-200 mx-1" />
            <button
              title="Insert Page Break"
              onMouseDown={e => e.preventDefault()}
              onClick={insertPageBreak}
              className="p-1.5 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-gray-200 text-gray-600 transition-all text-xs font-medium flex items-center gap-1 px-2"
            >
              <span style={{ fontSize: '13px', lineHeight: 1 }}>⊟</span>
              <span className="text-[11px]">Page Break</span>
            </button>
          </div>
        )}

        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {
            
          }
          <div
            ref={scrollContainerRef}
            style={{
              position: 'relative',
              flex: 1,
              minHeight: 0,
              overflow: 'auto',
              background: '#e2e8f0',
              padding: '24px 0',
            }}
          >
            <EditorContent
              editor={editor}
              style={{ display: 'flex', flexDirection: 'column' }}
            />
          </div>
        </div>
      </div>
    );
  }
);

SmartEditor.displayName = 'SmartEditor';

function ToolbarBtn({
  title, onClick, children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onMouseDown={e => e.preventDefault()}
      onClick={onClick}
      className="p-1.5 hover:bg-white hover:shadow-sm rounded border border-transparent hover:border-gray-200 text-gray-600 transition-all"
    >
      {children}
    </button>
  );
}