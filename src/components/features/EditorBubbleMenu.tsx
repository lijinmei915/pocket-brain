import { useState, useEffect } from 'react'
import type { Editor } from '@tiptap/core'
import { BubbleMenu } from '@tiptap/react/menus'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Heading1, Heading2, Highlighter, ChevronDown, Eraser,
} from 'lucide-react'
import { cn } from '@/lib/utils'

function ToolbarBtn({ onClick, active = false, title, children }: {
  onClick: () => void; active?: boolean; title: string; children: React.ReactNode
}) {
  return (
    <button
      title={title}
      onMouseDown={e => { e.preventDefault(); onClick() }}
      className={cn(
        'p-1.5 rounded transition-colors',
        active ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      )}
    >
      {children}
    </button>
  )
}

const GRAY_COLORS = [
  { value: '#0f172a', title: '黑' },
  { value: '#64748b', title: '深灰' },
  { value: '#94a3b8', title: '浅灰' },
]

const TEXT_COLORS = [
  { value: '#ef4444', title: '红' },
  { value: '#f97316', title: '橙' },
  { value: '#eab308', title: '黄' },
  { value: '#22c55e', title: '绿' },
  { value: '#3b82f6', title: '蓝' },
  { value: '#a855f7', title: '紫' },
  { value: '#ec4899', title: '粉' },
]

const BG_COLORS = [
  { value: '#fef08a', title: '黄' },
  { value: '#bbf7d0', title: '绿' },
  { value: '#bfdbfe', title: '蓝' },
  { value: '#fecaca', title: '红' },
  { value: '#e9d5ff', title: '紫' },
  { value: '#fbcfe8', title: '粉' },
  { value: '#fed7aa', title: '橙' },
]

export default function EditorBubbleMenu({ editor }: { editor: Editor }) {
  const [openPanel, setOpenPanel] = useState<'heading' | 'text-color' | 'bg' | null>(null)
  const togglePanel = (p: typeof openPanel) => setOpenPanel(v => v === p ? null : p)

  useEffect(() => {
    const close = () => setOpenPanel(null)
    editor.on('blur', close)
    return () => { editor.off('blur', close) }
  }, [editor])

  const currentTextColor = editor.getAttributes('textStyle').color
  const currentBgColor   = editor.getAttributes('textStyle').backgroundColor

  const swatchCls = (active: boolean) => cn(
    'w-4 h-4 rounded-full transition-transform hover:scale-110 shrink-0',
    active ? 'ring-2 ring-offset-1 ring-foreground' : ''
  )
  const onSwatch = (fn: () => void) => (e: React.MouseEvent) => {
    e.preventDefault(); fn(); setOpenPanel(null)
  }

  return (
    <BubbleMenu editor={editor}>
      <div className="flex items-center gap-0.5 bg-background border border-border rounded-lg shadow-md px-1 py-1">

        {/* 组1：B I U S */}
        <ToolbarBtn title="加粗" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold size={14} />
        </ToolbarBtn>
        <ToolbarBtn title="斜体" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic size={14} />
        </ToolbarBtn>
        <ToolbarBtn title="下划线" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon size={14} />
        </ToolbarBtn>
        <ToolbarBtn title="删除线" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough size={14} />
        </ToolbarBtn>

        <div className="w-px h-4 bg-border mx-1" />

        {/* 组2：H 折叠 + 列表 */}
        <button
          title="标题"
          onMouseDown={e => { e.preventDefault(); togglePanel('heading') }}
          className={cn('flex items-center gap-px px-1 py-1 rounded text-xs font-bold transition-colors',
            openPanel === 'heading' || editor.isActive('heading')
              ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
        >H<ChevronDown size={8} /></button>
        {openPanel === 'heading' && (
          <>
            <ToolbarBtn title="H1" active={editor.isActive('heading', { level: 1 })} onClick={() => { editor.chain().focus().toggleHeading({ level: 1 }).run(); setOpenPanel(null) }}>
              <Heading1 size={14} />
            </ToolbarBtn>
            <ToolbarBtn title="H2" active={editor.isActive('heading', { level: 2 })} onClick={() => { editor.chain().focus().toggleHeading({ level: 2 }).run(); setOpenPanel(null) }}>
              <Heading2 size={14} />
            </ToolbarBtn>
            <ToolbarBtn title="H3" active={editor.isActive('heading', { level: 3 })} onClick={() => { editor.chain().focus().toggleHeading({ level: 3 }).run(); setOpenPanel(null) }}>
              <span className="text-[11px] font-bold leading-none">H3</span>
            </ToolbarBtn>
          </>
        )}
        <ToolbarBtn title="无序列表" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List size={14} />
        </ToolbarBtn>
        <ToolbarBtn title="有序列表" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered size={14} />
        </ToolbarBtn>

        <div className="w-px h-4 bg-border mx-1" />

        {/* 组3：文字色 A▾ */}
        <button
          title="文字颜色"
          onMouseDown={e => { e.preventDefault(); togglePanel('text-color') }}
          className={cn('flex items-center gap-px p-1.5 rounded transition-colors',
            openPanel === 'text-color' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
        >
          <span className="flex flex-col items-center leading-none gap-px">
            <span className="text-xs font-bold">A</span>
            <span className="w-3 h-0.5 rounded-full" style={{ background: currentTextColor || 'currentColor' }} />
          </span>
          <ChevronDown size={8} />
        </button>
        {openPanel === 'text-color' && (
          <div className="flex items-center gap-1 bg-muted/60 rounded-md px-1.5 py-1 ml-0.5">
            {GRAY_COLORS.map(({ value, title }) => (
              <button key={value} title={title}
                onMouseDown={onSwatch(() => editor.chain().focus().setColor(value).run())}
                className={swatchCls(currentTextColor === value)}
                style={{ background: value }}
              />
            ))}
            <div className="w-px h-3 bg-border/60 mx-0.5" />
            {TEXT_COLORS.map(({ value, title }) => (
              <button key={value} title={title}
                onMouseDown={onSwatch(() => editor.chain().focus().setColor(value).run())}
                className={swatchCls(currentTextColor === value)}
                style={{ background: value }}
              />
            ))}
            <div className="w-px h-3 bg-border/60 mx-0.5" />
            <button title="清除颜色"
              onMouseDown={onSwatch(() => editor.chain().focus().unsetColor().run())}
              className="w-4 h-4 rounded-full border border-border bg-background flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0 text-[9px]"
            >✕</button>
          </div>
        )}

        {/* 高亮色 🖌▾ */}
        <button
          title="背景高亮"
          onMouseDown={e => { e.preventDefault(); togglePanel('bg') }}
          className={cn('flex items-center gap-px p-1.5 rounded transition-colors',
            openPanel === 'bg' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
        >
          <span className="flex flex-col items-center leading-none gap-px">
            <Highlighter size={12} />
            <span className="w-3 h-0.5 rounded-full" style={{ background: currentBgColor || '#fef08a' }} />
          </span>
          <ChevronDown size={8} />
        </button>
        {openPanel === 'bg' && (
          <div className="flex items-center gap-1 bg-muted/60 rounded-md px-1.5 py-1 ml-0.5">
            {BG_COLORS.map(({ value, title }) => (
              <button key={value} title={title}
                onMouseDown={onSwatch(() => editor.chain().focus().setBackgroundColor(value).run())}
                className={swatchCls(currentBgColor === value)}
                style={{ background: value }}
              />
            ))}
            <div className="w-px h-3 bg-border/60 mx-0.5" />
            <button title="清除高亮"
              onMouseDown={onSwatch(() => editor.chain().focus().unsetBackgroundColor().run())}
              className="w-4 h-4 rounded-full border border-border bg-background flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0 text-[9px]"
            >✕</button>
          </div>
        )}

        <div className="w-px h-4 bg-border mx-1" />

        {/* 清除全部样式 */}
        <ToolbarBtn title="清除全部样式" onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}>
          <Eraser size={13} />
        </ToolbarBtn>

      </div>
    </BubbleMenu>
  )
}
