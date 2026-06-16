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
// VARIABLE PILL — proper TipTap Node with React view
//
// Why ReactNodeViewRenderer?
//   - React controls the DOM → Tailwind + event handlers work correctly
//   - atom:true → TipTap treats it as one unit; backspace deletes the whole pill
//   - deleteNode() from the NodeView props removes it cleanly from the document
//   - renderHTML() is the single source of truth for serialisation (getHTML)
//   - parseHTML() reads those same data attributes back on setContent
// ─────────────────────────────────────────────────────────────────────────────

const PillView = ({ node, deleteNode }: any) => (
  <NodeViewWrapper as="span" style={{ display: 'inline' }}>
    <span
      contentEditable={false}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        verticalAlign: 'middle',
        padding: '1px 6px',
        margin: '0 2px',
        borderRadius: '6px',
        fontSize: '0.75rem',
        background: '#dbeafe',
        color: '#1e40af',
        border: '1px solid #bfdbfe',
        cursor: 'default',
        userSelect: 'none',
        fontWeight: 600,
        lineHeight: 1.6,
        whiteSpace: 'nowrap',
      }}
    >
      <span>{node.attrs.name}</span>
      <span
        onClick={deleteNode}
        style={{
          marginLeft: '4px',
          cursor: 'pointer',
          fontWeight: 'bold',
          borderRadius: '9999px',
          width: '14px',
          height: '14px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '10px',
          lineHeight: 1,
          color: '#1e40af',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = '#bfdbfe')}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        ×
      </span>
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
  // If the text already contains HTML bold/italic tags (e.g. from paste cleanup),
  // don't also apply markdown conversion — it would double-wrap
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

    // Pills: TipTap's renderHTML puts data-variable on the span
    if (el.hasAttribute('data-variable')) {
      return el.getAttribute('data-variable') ?? '';
    }

    const tag = el.tagName.toLowerCase();
    if (['script', 'style', 'meta'].includes(tag)) return '';

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
      const m = inner.match(/^(\s*)([\s\S]*?)(\s*)$/);
      return m ? `${m[1]}${o}${m[2]}${c}${m[3]}` : `${o}${inner}${c}`;
    };

    if (tag === 'strong' || tag === 'b') return wrap(children(), '**', '**');
    if (tag === 'em' || tag === 'i')     return wrap(children(), '*', '*');
    if (tag === 'u')                     return wrap(children(), '<u>', '</u>');

    if (tag === 'span') {
      const s = el.style ?? {};
      let r = children();
      if (s.textDecoration?.includes('underline')) r = wrap(r, '<u>', '</u>');
      if (s.fontStyle === 'italic')                r = wrap(r, '*', '*');
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
// {{VAR_CODE}} → <span data-variable="{{VAR_CODE}}" data-name="Label">
// TipTap's parseHTML() picks that up and creates a variablePill node.
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
        const align = m[1].toLowerCase();
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

  // {{VAR_CODE}} → pill span
  html = html.replace(/\{\{([^}]+)\}\}/g, (_match, inner) => {
    const code = `{{${inner.trim()}}}`;
    const label = inner.trim();
    const name =
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
    .replace(/<meta[^>]*>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/\s*id="docs-internal-guid[^"]*"/gi, '')
    .replace(/<span([^>]*)font-weight\s*:\s*(?:bold|700|800|600)([^>]*)>([\s\S]*?)<\/span>/gi, '<strong>$3</strong>')
    .replace(/<span([^>]*)font-style\s*:\s*italic([^>]*)>([\s\S]*?)<\/span>/gi, '<em>$3</em>')
    .replace(/<span([^>]*)text-decoration\s*:[^;]*underline([^>]*)>([\s\S]*?)<\/span>/gi, '<u>$3</u>')
    .replace(/<span[^>]*>([\s\S]*?)<\/span>/gi, '$1')
    .replace(/[ \t]{2,}/g, ' ');
}

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

    // ── Editor ─────────────────────────────────────────────────────────────────
    const editor = useEditor({
      extensions: [
        StarterKit.configure({ heading: { levels: [1, 2] }, hardBreak: false }),
        UnderlineExtension,
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        VariablePill,
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
          style:
            'font-family:"Times New Roman",Times,serif;white-space:pre-wrap;' +
            'text-align:justify;text-justify:inter-word;line-height:1.15;orphans:3;widows:3;',
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

        // Drag variable cards into editor
        handleDrop(_view, event) {
          const raw = event.dataTransfer?.getData('application/json');
          if (!raw) return false;
          try {
            const v = JSON.parse(raw) as { code: string; name: string };
            event.preventDefault();
            window.dispatchEvent(new CustomEvent('smarteditor:insertNode', { detail: v }));
            return true;
          } catch {
            return false;
          }
        },
      },

      onUpdate({ editor: e }) {
        onChangeRef.current?.(htmlToMarkdown(e.getHTML(), placeholdersRef.current));
      },
    });

    // Insert raw HTML at cursor
    useEffect(() => {
      const handler = (e: Event) => {
        const { html } = (e as CustomEvent<{ html: string }>).detail;
        editor?.commands.insertContent(html, {
          parseOptions: { preserveWhitespace: 'full' },
        });
        setTimeout(() => {
          if (editor)
            onChangeRef.current?.(htmlToMarkdown(editor.getHTML(), placeholdersRef.current));
        }, 0);
      };
      window.addEventListener('smarteditor:insert', handler);
      return () => window.removeEventListener('smarteditor:insert', handler);
    }, [editor]);

    // Insert variablePill node at cursor (used by drop + insertVariable)
    useEffect(() => {
      const handler = (e: Event) => {
        const { code, name } = (e as CustomEvent<{ code: string; name: string }>).detail;
        editor?.chain().focus().insertContent({ type: 'variablePill', attrs: { code, name } }).run();
        setTimeout(() => {
          if (editor)
            onChangeRef.current?.(htmlToMarkdown(editor.getHTML(), placeholdersRef.current));
        }, 0);
      };
      window.addEventListener('smarteditor:insertNode', handler);
      return () => window.removeEventListener('smarteditor:insertNode', handler);
    }, [editor]);

    // Sync initialMarkdown prop
    useEffect(() => {
      if (!editor) return;
      const newHtml = markdownToHtml(initialMarkdown, placeholdersRef.current);
      if (newHtml !== editor.getHTML()) {
        editor.commands.setContent(newHtml, false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialMarkdown]);

    // Format commands
    const applyFormat = useCallback(
      (command: string, value?: string) => {
        if (!editor) return;
        switch (command) {
          case 'bold':          editor.chain().focus().toggleBold().run();               break;
          case 'italic':        editor.chain().focus().toggleItalic().run();             break;
          case 'underline':     editor.chain().focus().toggleUnderline().run();          break;
          case 'formatBlock':
            if (value === 'h1')      editor.chain().focus().toggleHeading({ level: 1 }).run();
            else if (value === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
            else                     editor.chain().focus().setParagraph().run();
            break;
          case 'justifyLeft':   editor.chain().focus().setTextAlign('left').run();      break;
          case 'justifyCenter': editor.chain().focus().setTextAlign('center').run();    break;
          case 'justifyRight':  editor.chain().focus().setTextAlign('right').run();     break;
          case 'justifyFull':   editor.chain().focus().setTextAlign('justify').run();   break;
        }
        setTimeout(() => {
          if (editor)
            onChangeRef.current?.(htmlToMarkdown(editor.getHTML(), placeholdersRef.current));
        }, 0);
      },
      [editor]
    );

    useImperativeHandle(ref, () => ({
      getMarkdown: () =>
        editor ? htmlToMarkdown(editor.getHTML(), placeholdersRef.current) : '',

      setMarkdown: (markdown: string) => {
        editor?.commands.setContent(
          markdownToHtml(markdown, placeholdersRef.current),
          false
        );
      },

      // Click-to-insert from the variable panel
      insertVariable: (code: string, name: string) => {
        editor?.chain().focus().insertContent({ type: 'variablePill', attrs: { code, name } }).run();
        setTimeout(() => {
          if (editor)
            onChangeRef.current?.(htmlToMarkdown(editor.getHTML(), placeholdersRef.current));
        }, 0);
      },

      applyFormat,
    }), [editor, applyFormat]);

    return (
      <div className={`flex flex-col h-full min-h-0 ${className}`}>
        {showToolbar && (
          <div className="flex items-center gap-1 p-2 border-b border-gray-200 bg-gray-50/50 flex-shrink-0">
            <ToolbarBtn title="Bold"        onClick={() => applyFormat('bold')}>            <Bold        className="w-4 h-4" /></ToolbarBtn>
            <ToolbarBtn title="Italic"      onClick={() => applyFormat('italic')}>          <Italic      className="w-4 h-4" /></ToolbarBtn>
            <ToolbarBtn title="Underline"   onClick={() => applyFormat('underline')}>       <Underline   className="w-4 h-4" /></ToolbarBtn>
            <ToolbarBtn title="Heading 1"   onClick={() => applyFormat('formatBlock','h1')}><Heading1   className="w-5 h-5" /></ToolbarBtn>
            <ToolbarBtn title="Heading 2"   onClick={() => applyFormat('formatBlock','h2')}><Heading2   className="w-4 h-4" /></ToolbarBtn>
            <ToolbarBtn title="Normal Text" onClick={() => applyFormat('formatBlock','p')}>  <Type       className="w-4 h-4" /></ToolbarBtn>
            <div className="w-px h-4 bg-gray-200 mx-1" />
            <ToolbarBtn title="Align Left"   onClick={() => applyFormat('justifyLeft')}>    <AlignLeft   className="w-4 h-4" /></ToolbarBtn>
            <ToolbarBtn title="Align Center" onClick={() => applyFormat('justifyCenter')}>  <AlignCenter className="w-4 h-4" /></ToolbarBtn>
            <ToolbarBtn title="Align Right"  onClick={() => applyFormat('justifyRight')}>   <AlignRight  className="w-4 h-4" /></ToolbarBtn>
            <ToolbarBtn title="Justify"      onClick={() => applyFormat('justifyFull')}>    <AlignJustify className="w-4 h-4" /></ToolbarBtn>
          </div>
        )}
        <EditorContent
          editor={editor}
          className="flex-1 overflow-y-auto min-h-0"
          style={{ display: 'flex', flexDirection: 'column' }}
        />
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