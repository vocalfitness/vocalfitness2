import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import DOMPurify from 'dompurify';
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Underline as UnderlineIcon,
  List as ListIcon,
  ListOrdered,
  Link as LinkIcon,
  Heading2,
  Eraser,
  Undo2,
  Redo2,
} from 'lucide-react';

const ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'h3', 'h4', 'span'];
const ALLOWED_ATTR = ['href', 'target', 'rel', 'class'];

export const sanitizeRichHtml = (dirty) =>
  DOMPurify.sanitize(dirty || '', {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
  });

const ToolbarBtn = ({ active, onClick, title, children, testid }) => (
  <button
    type="button"
    onClick={(e) => {
      e.preventDefault();
      onClick();
    }}
    title={title}
    data-testid={testid}
    className={`p-1.5 rounded-md text-sm transition-colors ${
      active
        ? 'bg-amber-500 text-slate-900'
        : 'bg-slate-700/60 text-slate-300 hover:bg-slate-600 hover:text-white'
    }`}
  >
    {children}
  </button>
);

export const RichTextEditor = ({
  value,
  onChange,
  onPlainTextChange,
  placeholder = 'Scrivi un messaggio…',
  minHeight = 120,
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [3, 4] },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          class: 'text-amber-400 underline underline-offset-2',
          rel: 'noopener noreferrer',
          target: '_blank',
        },
      }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class:
          'prose prose-invert prose-sm max-w-none focus:outline-none px-3 py-2 text-white leading-relaxed [&_a]:text-amber-400 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_h3]:text-base [&_h3]:font-bold [&_h3]:mt-1 [&_h3]:mb-1',
        'data-testid': 'rich-editor-content',
        'data-placeholder': placeholder,
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML();
      const isEmpty = ed.isEmpty;
      const safe = isEmpty ? '' : sanitizeRichHtml(html);
      onChange?.(safe);
      onPlainTextChange?.(ed.getText());
    },
  });

  // Sync external value (e.g. clear after send)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    const incoming = value || '';
    if (incoming === '' && !editor.isEmpty) {
      editor.commands.clearContent();
    } else if (incoming && incoming !== current) {
      editor.commands.setContent(incoming, false);
    }
  }, [value, editor]);

  if (!editor) return null;

  const promptLink = () => {
    const previous = editor.getAttributes('link').href;
    const url = window.prompt('URL del link (https://…)', previous || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    let safeUrl = url.trim();
    if (!/^https?:\/\//i.test(safeUrl) && !safeUrl.startsWith('mailto:')) {
      safeUrl = `https://${safeUrl}`;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: safeUrl }).run();
  };

  return (
    <div className="border border-slate-600 rounded-lg bg-slate-700/40 focus-within:border-amber-500 transition-colors">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 border-b border-slate-600/70 bg-slate-800/40 rounded-t-lg">
        <ToolbarBtn
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Grassetto (Ctrl+B)"
          testid="editor-bold"
        >
          <BoldIcon className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Corsivo (Ctrl+I)"
          testid="editor-italic"
        >
          <ItalicIcon className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Sottolineato (Ctrl+U)"
          testid="editor-underline"
        >
          <UnderlineIcon className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <div className="w-px h-4 bg-slate-600 mx-1" />
        <ToolbarBtn
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          title="Titolo"
          testid="editor-h3"
        >
          <Heading2 className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Elenco puntato"
          testid="editor-ul"
        >
          <ListIcon className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Elenco numerato"
          testid="editor-ol"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          active={editor.isActive('link')}
          onClick={promptLink}
          title="Inserisci/modifica link"
          testid="editor-link"
        >
          <LinkIcon className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <div className="w-px h-4 bg-slate-600 mx-1" />
        <ToolbarBtn
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
          title="Rimuovi formattazione"
          testid="editor-clear"
        >
          <Eraser className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().undo().run()}
          title="Annulla (Ctrl+Z)"
          testid="editor-undo"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().redo().run()}
          title="Ripristina (Ctrl+Shift+Z)"
          testid="editor-redo"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </ToolbarBtn>
      </div>

      {/* Editor surface */}
      <div
        style={{ minHeight }}
        className="relative cursor-text"
        onClick={() => editor.commands.focus()}
      >
        <EditorContent editor={editor} />
        {editor.isEmpty && (
          <div className="pointer-events-none absolute top-2 left-3 text-slate-500 text-sm select-none">
            {placeholder}
          </div>
        )}
      </div>
    </div>
  );
};

export default RichTextEditor;
