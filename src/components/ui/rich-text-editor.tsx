'use client'

import { useEffect } from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle, Color } from '@tiptap/extension-text-style'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Palette,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

/**
 * Rich-text editor that emits HTML. The HTML it produces is the canonical stored
 * value for the free-text proposal narrative fields; it is rendered verbatim in
 * the slide preview and converted to PowerPoint runs by `richTextToPptxRuns()`.
 * Keep the supported mark/node set in sync with that converter.
 */

const TEXT_COLOURS = [
  { label: 'Default', value: '' },
  { label: 'Black', value: '#1A1A1A' },
  { label: 'Magenta', value: '#E6007E' },
  { label: 'Gray', value: '#666666' },
  { label: 'Blue', value: '#2196F3' },
  { label: 'Green', value: '#2EB872' },
  { label: 'Red', value: '#D32F2F' },
]

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
  className?: string
}

export function RichTextEditor({ value, onChange, placeholder, minHeight = 160, className }: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      TextStyle,
      Color,
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: cn(
          'tiptap focus:outline-none px-3 py-2 text-sm leading-relaxed',
          '[&_p]:my-1 [&_:first-child]:mt-0 [&_:last-child]:mb-0',
          '[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5',
          '[&_h2]:text-lg [&_h2]:font-bold [&_h2]:mt-2 [&_h2]:mb-1',
          '[&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1'
        ),
        style: `min-height:${minHeight}px`,
      },
    },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? '' : editor.getHTML()),
  })

  // Keep the editor in sync when the value is changed externally (reset to
  // default, "insert standard text", switching opportunities, etc.).
  useEffect(() => {
    if (!editor) return
    const current = editor.isEmpty ? '' : editor.getHTML()
    const next = value || ''
    if (next !== current) {
      editor.commands.setContent(next, { emitUpdate: false })
    }
  }, [value, editor])

  if (!editor) {
    return <div className={cn('rounded-md border border-input bg-background', className)} style={{ minHeight: minHeight + 40 }} />
  }

  return (
    <div className={cn('rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring', className)}>
      <Toolbar editor={editor} />
      <div className="relative">
        <EditorContent editor={editor} />
        {editor.isEmpty && placeholder && (
          <span className="pointer-events-none absolute left-3 top-2 text-sm text-muted-foreground">{placeholder}</span>
        )}
      </div>
    </div>
  )
}

function ToolbarButton({
  onClick,
  active,
  label,
  children,
}: {
  onClick: () => void
  active?: boolean
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      // Buttons inside a form-less editor; keep focus in the editor.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground',
        active && 'bg-muted text-foreground'
      )}
    >
      {children}
    </button>
  )
}

const blockStyles: Array<{ label: string; isActive: (e: Editor) => boolean; apply: (e: Editor) => void }> = [
  { label: 'Paragraph', isActive: (e) => e.isActive('paragraph') && !e.isActive('bulletList') && !e.isActive('orderedList'), apply: (e) => e.chain().focus().setParagraph().run() },
  { label: 'Heading 2', isActive: (e) => e.isActive('heading', { level: 2 }), apply: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: 'Heading 3', isActive: (e) => e.isActive('heading', { level: 3 }), apply: (e) => e.chain().focus().toggleHeading({ level: 3 }).run() },
]

function Toolbar({ editor }: { editor: Editor }) {
  const activeBlock = blockStyles.find((b) => b.isActive(editor))?.label ?? 'Paragraph'
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border px-1.5 py-1">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs font-normal">
              {activeBlock}
            </Button>
          }
        />
        <DropdownMenuContent align="start" className="min-w-36">
          {blockStyles.map((b) => (
            <button
              key={b.label}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => b.apply(editor)}
              className={cn(
                'flex w-full items-center px-2 py-1.5 text-left text-sm hover:bg-muted',
                b.isActive(editor) && 'font-semibold'
              )}
            >
              {b.label}
            </button>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Divider />

      <ToolbarButton label="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton label="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton label="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
        <UnderlineIcon className="h-3.5 w-3.5" />
      </ToolbarButton>

      <Divider />

      <ToolbarButton label="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton label="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarButton>

      <Divider />

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Text colour">
              <Palette className="h-3.5 w-3.5" />
            </Button>
          }
        />
        <DropdownMenuContent align="start" className="w-auto p-2">
          <div className="grid grid-cols-4 gap-1">
            {TEXT_COLOURS.map((c) => (
              <button
                key={c.label}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => (c.value ? editor.chain().focus().setColor(c.value).run() : editor.chain().focus().unsetColor().run())}
                aria-label={c.label}
                title={c.label}
                className="h-6 w-6 rounded border border-border"
                style={{ background: c.value || 'transparent' }}
              >
                {!c.value && <span className="text-[10px] text-muted-foreground">A</span>}
              </button>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function Divider() {
  return <span className="mx-0.5 h-5 w-px bg-border" />
}
