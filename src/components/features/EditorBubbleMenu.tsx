import { useState, useEffect } from 'react'
import type { Editor } from '@tiptap/core'
import { BubbleMenu } from '@tiptap/react/menus'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Highlighter, Eraser,
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
        'h-7 w-7 inline-flex items-center justify-center rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        active
          ? 'bg-muted text-foreground [&_svg]:[stroke-width:2.25]'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted [&_svg]:[stroke-width:1.75]'
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

  // 订阅 editor transactions，让 isActive() 保持响应式
  const [, setTick] = useState(0)
  useEffect(() => {
    const update = () => setTick(t => t + 1)
    editor.on('transaction', update)
    return () => editor.off('transaction', update)
  }, [editor])

  useEffect(() => {
    const close = () => setOpenPanel(null)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenPanel(null) }
    editor.on('blur', close)
    document.addEventListener('keydown', onKey)
    return () => {
      editor.off('blur', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [editor])

  const currentTextColor = editor.getAttributes('textStyle').color
  const currentBgColor   = editor.getAttributes('textStyle').backgroundColor

  // 直接读 ProseMirror state，绕开 Tiptap v3 isActive 在非空选区的边界行为
  const $from = editor.state.selection.$from
  const headingLevel: number | null =
    $from.parent.type.name === 'heading' ? ($from.parent.attrs.level as number) : null

  // 在列表内时节点类型是 listItem，headingLevel 始终为 null；
  // 通过 fontSize mark 判断"模拟标题级别"，用于按钮显示和 active 态
  const currentFontSize = (editor.getAttributes('textStyle') as any).fontSize as string | undefined
  const displayLevel: number | null =
    headingLevel !== null ? headingLevel
    : currentFontSize === '1.5rem' ? 1
    : currentFontSize === '1.2rem' ? 2
    : null

  // 在 heading 内切换列表时，先把 heading 的视觉 mark 打上，
  // 节点类型转换后 mark 会保留，实现"视觉共存"
  const handleListToggle = (type: 'bullet' | 'ordered') => {
    const chain = (editor.chain().focus() as any)
    if (headingLevel === 1) chain.setBold().setFontSize('1.5rem')
    else if (headingLevel === 2) chain.setBold().setFontSize('1.2rem')
    if (type === 'bullet') chain.toggleBulletList().run()
    else chain.toggleOrderedList().run()
  }

  // 切换标题时：清除残留的 fontSize mark，避免 mark 覆盖 CSS 字号
  // 在列表内时：用 mark 模拟标题视觉，保留列表结构
  const inList = $from.depth >= 2 && $from.node($from.depth - 1)?.type.name === 'listItem'
  const handleHeadingToggle = (level: 1 | 2 | 3) => {
    const chain = (editor.chain().focus() as any)
    if (inList) {
      // 列表内：清除旧 mark，打新 mark，保留列表节点不变
      chain.unsetFontSize().unsetBold()
      if (level === 1) chain.setBold().setFontSize('1.5rem')
      else if (level === 2) chain.setBold().setFontSize('1.2rem')
      // H3：正常正文样式，mark 已清除
    } else {
      // 正常段落：先清除 handleListToggle 可能留下的 fontSize mark，再切换节点类型
      chain.unsetFontSize().toggleHeading({ level })
    }
    chain.run()
    setOpenPanel(null)
  }

  const swatchCls = (active: boolean) => cn(
    'w-4 h-4 rounded-full transition-transform hover:scale-110 shrink-0',
    active ? 'ring-2 ring-offset-1 ring-foreground' : ''
  )
  const onSwatch = (fn: () => void) => (e: React.MouseEvent) => {
    e.preventDefault(); fn(); setOpenPanel(null)
  }

  return (
    <BubbleMenu editor={editor} shouldShow={({ state }) => !state.selection.empty}>
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

        {/* 组2：H 触发（始终可见）+ H 面板内联 + 列表 */}
        <button
          title="标题"
          onMouseDown={e => { e.preventDefault(); togglePanel('heading') }}
          className={cn(
            'h-7 w-7 inline-flex items-center justify-center rounded text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            displayLevel !== null || openPanel === 'heading'
              ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
        >{displayLevel === 1 ? 'H1' : displayLevel === 2 ? 'H2' : 'H3'}</button>
        {openPanel === 'heading' && (
          <>
            <ToolbarBtn title="H1" active={displayLevel === 1} onClick={() => handleHeadingToggle(1)}>
              <span className="text-xs font-bold leading-none">H1</span>
            </ToolbarBtn>
            <ToolbarBtn title="H2" active={displayLevel === 2} onClick={() => handleHeadingToggle(2)}>
              <span className="text-xs font-bold leading-none">H2</span>
            </ToolbarBtn>
            <ToolbarBtn title="H3" active={displayLevel === 3} onClick={() => handleHeadingToggle(3)}>
              <span className="text-xs leading-none">H3</span>
            </ToolbarBtn>
          </>
        )}
        <ToolbarBtn title="无序列表" active={editor.isActive('bulletList')} onClick={() => handleListToggle('bullet')}>
          <List size={14} />
        </ToolbarBtn>
        <ToolbarBtn title="有序列表" active={editor.isActive('orderedList')} onClick={() => handleListToggle('ordered')}>
          <ListOrdered size={14} />
        </ToolbarBtn>

        <div className="w-px h-4 bg-border mx-1" />

        {/* 组3：文字色 A（触发始终可见）*/}
        <button
          title="文字颜色"
          onMouseDown={e => { e.preventDefault(); togglePanel('text-color') }}
          className={cn(
            'h-7 w-7 inline-flex items-center justify-center rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            openPanel === 'text-color' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
        >
          <span className="flex flex-col items-center leading-none gap-px">
            <span className="text-xs font-bold">A</span>
            <span className="w-3 h-0.5 rounded-full" style={{ background: currentTextColor || 'currentColor' }} />
          </span>
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

        {/* 高亮色 🖌（触发始终可见）*/}
        <button
          title="背景高亮"
          onMouseDown={e => { e.preventDefault(); togglePanel('bg') }}
          className={cn(
            'h-7 w-7 inline-flex items-center justify-center rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            openPanel === 'bg'
              ? 'bg-muted text-foreground [&_svg]:[stroke-width:2.25]'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted [&_svg]:[stroke-width:1.75]'
          )}
        >
          <span className="flex flex-col items-center leading-none gap-px">
            <Highlighter size={14} strokeWidth={openPanel === 'bg' ? 2.25 : 1.75} />
            <span className="w-3 h-0.5 rounded-full" style={{ background: currentBgColor || 'currentColor' }} />
          </span>
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
          <Eraser size={14} />
        </ToolbarBtn>

      </div>
    </BubbleMenu>
  )
}
