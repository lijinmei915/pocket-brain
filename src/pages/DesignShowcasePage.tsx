import { useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { TextStyle, Color, FontSize, BackgroundColor } from '@tiptap/extension-text-style'
import Underline from '@tiptap/extension-underline'
import { Button } from '@/components/ui/button'
import { TagChip } from '@/components/ui/tag-chip'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MoreButton } from '@/components/ui/MoreButton'
import { DialogActions } from '@/components/ui/DialogActions'
import Sidebar from '@/components/layout/Sidebar'
import SaveForm from '@/components/patterns/SaveForm'
import ItemGrid from '@/components/patterns/ItemGrid'
import AddItemDialog from '@/components/patterns/AddItemDialog'
import FolderDialog from '@/components/patterns/FolderDialog'
import ConfirmDialog from '@/components/patterns/ConfirmDialog'
import GetAppDialog from '@/components/patterns/GetAppDialog'
import EditorBubbleMenu from '@/components/patterns/EditorBubbleMenu'
import DesignPanel from '@/components/patterns/DesignPanel'

const navGroups = [
  {
    id: 'overview',
    label: 'Overview',
    items: [
      {
        id: 'overview',
        title: 'Overview',
        label: '全局规范',
        doc: 'docs/DESIGN_STANDARDS.md',
      },
    ],
  },
  {
    id: 'primitive',
    label: 'Primitive',
    items: [
      {
        id: 'button',
        title: 'Button',
        label: '按钮',
        doc: 'docs/design/buttons.md',
      },
      {
        id: 'tag-chip',
        title: 'TagChip',
        label: '标签',
        doc: 'docs/design/tag-chip.md',
      },
      {
        id: 'tabs',
        title: 'Tabs',
        label: '切换栏',
        doc: 'docs/design/tabs.md',
      },
    ],
  },
  {
    id: 'pattern',
    label: 'Pattern',
    items: [
      {
        id: 'more-button',
        title: 'MoreButton',
        label: '更多按钮',
        doc: 'docs/design/more-button.md',
      },
      {
        id: 'link-field',
        title: 'LinkField',
        label: '链接字段',
        doc: 'docs/design/link-field.md',
      },
      {
        id: 'title-field',
        title: 'TitleField',
        label: '标题字段',
        doc: 'docs/design/title-field.md',
      },
      {
        id: 'folder-select-field',
        title: 'FolderSelectField',
        label: '文件夹字段',
        doc: 'docs/design/folder-select-field.md',
      },
      {
        id: 'note-field',
        title: 'NoteField',
        label: '备注字段',
        doc: 'docs/design/note-field.md',
      },
      {
        id: 'tag-field',
        title: 'TagField',
        label: '标签字段',
        doc: 'docs/design/tag-field.md',
      },
      {
        id: 'content-type-tabs',
        title: 'ContentTypeTabs',
        label: '内容类型切换',
        doc: 'docs/design/content-type-tabs.md',
      },
      {
        id: 'dialog-actions',
        title: 'DialogActions',
        label: '弹窗操作',
        doc: 'docs/design/dialog-actions.md',
      },
      {
        id: 'sidebar',
        title: 'Sidebar',
        label: '侧栏',
        doc: 'docs/design/sidebar.md',
      },
      {
        id: 'save-form',
        title: 'SaveForm',
        label: '保存表单',
        doc: 'docs/design/save-form.md',
      },
      {
        id: 'item-grid',
        title: 'ItemGrid',
        label: '内容列表',
        doc: 'docs/design/card-pattern.md',
      },
      {
        id: 'dialogs',
        title: 'Dialogs',
        label: '弹窗家族',
        doc: 'docs/design/dialog-family.md',
      },
      {
        id: 'get-app-dialog',
        title: 'GetAppDialog',
        label: '获取应用弹窗',
        doc: 'docs/design/get-app-dialog.md',
      },
      {
        id: 'editor-bubble-menu',
        title: 'EditorBubbleMenu',
        label: '编辑浮动工具栏',
        doc: 'docs/design/editor-bubble-menu.md',
      },
      {
        id: 'design-panel',
        title: 'DesignPanel',
        label: '设计调试面板',
        doc: 'docs/design/design-panel.md',
      },
    ],
  },
] as const

const sections = navGroups.flatMap(group => group.items)

const demoFolders = [
  { id: 'folder-work', name: '工作', parentId: null },
  { id: 'folder-design', name: '设计', parentId: null },
  { id: 'folder-ai', name: 'AI 参考', parentId: 'folder-work' },
]

const demoItems = [
  {
    id: 'item-1',
    folderId: null,
    title: 'React Compiler 记录',
    url: 'https://react.dev',
    note: '整理编译器和 hooks 相关资料',
  },
  {
    id: 'item-2',
    folderId: 'folder-work',
    title: '产品迭代看板',
    url: 'https://example.com/board',
    note: '团队内部同步材料',
  },
  {
    id: 'item-3',
    folderId: 'folder-ai',
    title: 'LLM 标签策略',
    url: 'https://example.com/llm-tags',
    note: '研究 AI 分类和标签回退方案',
  },
]

function SectionCard({
  title,
  doc,
  children,
}: {
  title: string
  doc: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-4 border-b border-border pb-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </h2>
        <span className="rounded-md bg-muted px-2 py-1 font-mono text-[11px] text-muted-foreground">
          {doc}
        </span>
      </div>
      {children}
    </section>
  )
}

function DemoEditorBubbleMenu() {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: '选中文本后会显示真实的 EditorBubbleMenu…' }),
      TextStyle,
      Color,
      FontSize,
      BackgroundColor,
      Underline,
    ],
    content: `
      <h2>Pocket Brain 编辑示例</h2>
      <p>选中这段文字后，会显示真实的 <strong>EditorBubbleMenu</strong>。你可以直接试加粗、标题、列表、文字色和高亮色。</p>
      <p>这块不是静态示意，而是项目里详情页正在使用的那套 TipTap + BubbleMenu 组合。</p>
    `,
    editable: true,
  })

  if (!editor) return null

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-4 py-3 text-sm text-muted-foreground">
        先拖选下方文字，再观察工具栏出现和交互变化。
      </div>
      <div className="tiptap-editor relative min-h-[280px] px-4 py-5">
        <EditorBubbleMenu editor={editor} />
        <EditorContent editor={editor} className="min-h-[220px] text-sm leading-relaxed" />
      </div>
    </div>
  )
}

export default function DesignShowcasePage() {
  const [activeSection, setActiveSection] = useState<(typeof sections)[number]['id']>('overview')
  const [sidebarSelected, setSidebarSelected] = useState('inbox')
  const [sidebarSearch, setSidebarSearch] = useState('')
  const [saveMockMessage, setSaveMockMessage] = useState('这里显示 SaveForm footer 的真实 renderFooter 结果。')
  const [gridSelectedFolder, setGridSelectedFolder] = useState('all')
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [folderDialogOpen, setFolderDialogOpen] = useState(false)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)
  const [getAppDialogOpen, setGetAppDialogOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen grid-cols-[220px_minmax(0,1fr)]">
        <aside className="sticky top-0 h-screen overflow-y-auto border-r border-border bg-card px-3 py-6">
          <div className="mb-6 px-2">
            <p className="text-sm font-semibold">React Design Showcase</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              真实组件映射页，旧 HTML 规范页继续保留。
            </p>
          </div>

          <div className="space-y-5">
            {navGroups.map(group => (
              <div key={group.id}>
                <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {group.label}
                </p>
                <div className="space-y-1">
                  {group.items.map(section => (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${
                        activeSection === section.id
                          ? 'bg-muted font-medium text-foreground'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      {section.label} {section.title}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="border-t border-border pt-4">
              <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Legacy
              </p>
              <a
                href="/docs/Design%20Guidelines/showcase.html"
                className="block rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                旧 HTML 规范页
              </a>
            </div>
          </div>
        </aside>

        <main className="min-w-0 px-8 py-8 md:px-12">
          <div className="mx-auto max-w-6xl space-y-6">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">Design Showcase</h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                这里优先展示项目里正在使用的真实组件和真实组合，不再只给近似示意。
                新规范先往这里落，旧 HTML 页继续作为静态备份入口。
              </p>
            </div>

            {activeSection === 'overview' && (
              <SectionCard title="Overview" doc="docs/DESIGN_STANDARDS.md">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-border bg-muted/30 p-4">
                    <p className="mb-2 text-sm font-medium">现在这页负责什么</p>
                    <ul className="list-disc space-y-1 pl-4 text-sm leading-6 text-muted-foreground">
                      <li>优先展示真实组件映射，不再只看静态示意。</li>
                      <li>组件文档写法和真实组件结构同步推进。</li>
                      <li>旧 HTML 规范页继续保留，作为过渡和静态备份。</li>
                    </ul>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-4">
                    <p className="mb-2 text-sm font-medium">阅读顺序</p>
                    <ol className="list-decimal space-y-1 pl-4 text-sm leading-6 text-muted-foreground">
                      <li>先看总规范和组件分层。</li>
                      <li>再按旧规范页结构看 Primitive 映射。</li>
                      <li>最后看 Pattern 组件的真实场景。</li>
                    </ol>
                  </div>
                </div>
              </SectionCard>
            )}

            {activeSection === 'button' && (
              <SectionCard title="Primitive / Button" doc="docs/design/buttons.md">
                <div className="space-y-5">
                  <div>
                    <p className="mb-3 text-sm font-medium">真实变体映射</p>
                    <div className="flex flex-wrap gap-3">
                      <Button>Default</Button>
                      <Button variant="outline">Outline</Button>
                      <Button variant="secondary">Secondary</Button>
                      <Button variant="ghost">Ghost</Button>
                      <Button variant="destructive">Destructive</Button>
                    </div>
                  </div>
                  <div>
                    <p className="mb-3 text-sm font-medium">真实尺寸映射</p>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button size="xs">XS</Button>
                      <Button size="sm">SM</Button>
                      <Button size="default">Default</Button>
                      <Button size="lg">LG</Button>
                      <Button size="icon" aria-label="图标按钮">
                        +
                      </Button>
                    </div>
                  </div>
                </div>
              </SectionCard>
            )}

            {activeSection === 'tag-chip' && (
              <SectionCard title="Primitive / TagChip" doc="docs/design/tag-chip.md">
                <div className="space-y-5">
                  <div>
                    <p className="mb-3 text-sm font-medium">真实组件状态</p>
                    <div className="flex flex-wrap gap-2">
                      <TagChip>文章</TagChip>
                      <TagChip tone="muted">最近使用</TagChip>
                      <TagChip onClick={() => {}}>点击加入</TagChip>
                      <TagChip onRemove={() => {}}>时政新闻</TagChip>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
                    这里直接跑项目里的 <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px]">TagChip</code>，
                    包括默认态、muted、可点击、可移除四种真实分支。
                  </div>
                </div>
              </SectionCard>
            )}

            {activeSection === 'tabs' && (
              <SectionCard title="Primitive / Tabs" doc="docs/design/tabs.md">
                <div className="space-y-5">
                  <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
                    这里直接跑项目里的 <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px]">Tabs</code> 原语。
                    `GetAppDialog` 这种需要“切换结构复用、内容不复用”的场景，优先直接用它，不再手写按钮组。
                  </div>
                  <Tabs defaultValue="bookmarklet">
                    <TabsList>
                      <TabsTrigger value="bookmarklet">书签栏</TabsTrigger>
                      <TabsTrigger value="extension">Chrome 扩展</TabsTrigger>
                      <TabsTrigger value="pwa">手机 PWA</TabsTrigger>
                    </TabsList>
                    <TabsContent value="bookmarklet" className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                      适合放“书签栏安装步骤”这类业务内容。
                    </TabsContent>
                    <TabsContent value="extension" className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                      适合放“Chrome 扩展安装说明”这类另一套内容。
                    </TabsContent>
                    <TabsContent value="pwa" className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                      内容区继续直接写业务文案，不强行组件化。
                    </TabsContent>
                  </Tabs>
                </div>
              </SectionCard>
            )}

            {activeSection === 'more-button' && (
              <SectionCard title="Pattern / MoreButton" doc="docs/design/more-button.md">
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                    <p className="mb-3 text-sm font-medium">ItemGrid 卡片场景</p>
                    <div className="group flex flex-col gap-2 rounded-lg border border-border bg-card p-3 shadow-sm transition-all hover:border-primary/40">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-sm font-medium leading-snug">文章标题示例</div>
                        <MoreButton className="shrink-0" />
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                    <p className="mb-3 text-sm font-medium">Sidebar 文件夹场景</p>
                    <div className="group flex items-center gap-1.5 rounded-md border border-border px-2 py-1.5 text-sm">
                      <span className="flex-1 truncate">项目文件夹</span>
                      <span className="text-xs text-muted-foreground">12</span>
                      <MoreButton hideUntilHover />
                    </div>
                  </div>
                </div>
              </SectionCard>
            )}

            {activeSection === 'link-field' && (
              <SectionCard title="Pattern / LinkField" doc="docs/design/link-field.md">
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
                    底层是 shadcn <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px]">Input</code>，
                    但 `链接 *`、重复校验和错误提示位置已经是字段级 Pattern。
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                    <label className="mb-1 block text-sm font-medium">链接 *</label>
                    <Input placeholder="https://..." />
                    <p className="mt-2 text-xs text-destructive">该链接已存在，不能重复保存</p>
                  </div>
                </div>
              </SectionCard>
            )}

            {activeSection === 'title-field' && (
              <SectionCard title="Pattern / TitleField" doc="docs/design/title-field.md">
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
                    底层仍然是 shadcn `Input`，但“留空回退到链接标题”属于 Pocket Brain 的字段规则。
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                    <label className="mb-1 block text-sm font-medium">标题</label>
                    <Input placeholder="留空则使用链接作为标题" />
                    <p className="mt-2 text-xs text-muted-foreground">留空时自动回退到链接标题</p>
                  </div>
                </div>
              </SectionCard>
            )}

            {activeSection === 'folder-select-field' && (
              <SectionCard title="Pattern / FolderSelectField" doc="docs/design/folder-select-field.md">
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
                    底层是 shadcn `Select`，字段标题和在保存表单里的节奏是 Pattern。
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                    <label className="mb-1 block text-sm font-medium">存入文件夹</label>
                    <Select defaultValue="later">
                      <SelectTrigger className="w-fit min-w-[9rem]">
                        <SelectValue placeholder="请选择文件夹" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="later">稍后整理</SelectItem>
                        <SelectItem value="work">工作</SelectItem>
                        <SelectItem value="design">设计</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </SectionCard>
            )}

            {activeSection === 'note-field' && (
              <SectionCard title="Pattern / NoteField" doc="docs/design/note-field.md">
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
                    底层是 shadcn `Textarea`，但 `备注 + AI 总结` 的标题关系和提示位置属于字段级 Pattern。
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <label className="text-sm font-medium">备注</label>
                      <span className="text-xs text-muted-foreground">AI 总结</span>
                    </div>
                    <Textarea placeholder="添加备注，或点右上角让 AI 生成总结…" className="min-h-28" />
                  </div>
                </div>
              </SectionCard>
            )}

            {activeSection === 'tag-field' && (
              <SectionCard title="Pattern / TagField" doc="docs/design/tag-field.md">
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
                    底层依赖 <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px]">Input</code> 和
                    <code className="ml-1 rounded bg-background px-1.5 py-0.5 font-mono text-[11px]">TagChip</code>，
                    但“标签标题 + AI 分类 + 已选 / 最近 / AI 推荐”的整项体验属于字段级 Pattern。
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-sm font-medium">标签</label>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                      >
                        AI 分类
                      </button>
                    </div>
                    <Input placeholder="输入标签名搜索或新建" />
                    <div className="flex gap-1.5">
                      <span className="shrink-0 text-[11px] font-medium leading-6 text-foreground">已选：</span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <TagChip onRemove={() => {}}>时政新闻</TagChip>
                        <TagChip onRemove={() => {}}>文章</TagChip>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <span className="shrink-0 text-[11px] leading-6 text-muted-foreground">最近：</span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <TagChip tone="muted" onClick={() => {}}>网站</TagChip>
                        <TagChip tone="muted" onClick={() => {}}>Claude</TagChip>
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <span className="shrink-0 text-[11px] leading-6 text-muted-foreground">AI 推荐：</span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <TagChip onClick={() => {}}>新闻</TagChip>
                        <TagChip onClick={() => {}}>时政</TagChip>
                      </div>
                    </div>
                  </div>
                </div>
              </SectionCard>
            )}

            {activeSection === 'content-type-tabs' && (
              <SectionCard title="Pattern / ContentTypeTabs" doc="docs/design/content-type-tabs.md">
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
                    底层可复用 shadcn <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px]">Tabs</code>，
                    但 `收藏 / 灵感 / 资料` 的三态切换、等宽分布和与表单内容区的联动属于 Pattern。
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                    <Tabs defaultValue="bookmark">
                      <TabsList className="w-full">
                        <TabsTrigger value="bookmark" className="flex-1">收藏</TabsTrigger>
                        <TabsTrigger value="note" className="flex-1">灵感</TabsTrigger>
                        <TabsTrigger value="file" className="flex-1">资料</TabsTrigger>
                      </TabsList>
                      <TabsContent value="bookmark" className="pt-4 text-sm text-muted-foreground">
                        收藏：链接 → 标题 → 文件夹 → 标签 → 备注
                      </TabsContent>
                      <TabsContent value="note" className="pt-4 text-sm text-muted-foreground">
                        灵感：主输入区 → 标签 → 文件夹
                      </TabsContent>
                      <TabsContent value="file" className="pt-4 text-sm text-muted-foreground">
                        资料：文件区 → 标签 → 文件夹
                      </TabsContent>
                    </Tabs>
                  </div>
                </div>
              </SectionCard>
            )}

            {activeSection === 'dialog-actions' && (
              <SectionCard title="Pattern / DialogActions" doc="docs/design/dialog-actions.md">
                <div className="max-w-xl rounded-2xl border border-border bg-card shadow-sm">
                  <div className="border-b border-border px-4 py-3">
                    <p className="text-sm font-medium">AddItemDialog / SaveForm footer 映射</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      内容区和 footer 分开，左侧是说明位，右侧是按钮组。
                    </p>
                  </div>
                  <div className="px-4 py-6 text-sm text-muted-foreground">
                    这里是弹窗内容区示例。
                  </div>
                  <DialogActions className="items-center justify-between gap-3">
                    <p className="min-w-0 flex-1 text-xs text-muted-foreground">
                      保存相关提示放左侧，按钮在右侧。
                    </p>
                    <div className="flex shrink-0 gap-2">
                      <Button variant="outline">取消</Button>
                      <Button>保存</Button>
                    </div>
                  </DialogActions>
                </div>
              </SectionCard>
            )}

            {activeSection === 'sidebar' && (
              <SectionCard title="Pattern / Sidebar" doc="docs/design/sidebar.md">
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
                    这里直接挂真实 <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px]">Sidebar</code> 组件，
                    用 mock 文件夹和 mock 条目跑出桌面端侧栏状态，不再用静态块模拟。
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-border bg-card">
                    <div className="h-[560px] bg-background">
                      <Sidebar
                        folders={demoFolders}
                        items={demoItems}
                        selected={sidebarSelected}
                        onSelect={setSidebarSelected}
                        onCreateFolder={async () => {}}
                        onRenameFolder={async () => {}}
                        onDeleteFolder={async () => {}}
                        search={sidebarSearch}
                        onSearch={setSidebarSearch}
                        onAdd={() => {}}
                        mobileOpen={false}
                        onMobileClose={() => {}}
                      />
                    </div>
                  </div>
                </div>
              </SectionCard>
            )}

            {activeSection === 'save-form' && (
              <SectionCard title="Pattern / SaveForm" doc="docs/design/save-form.md">
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
                    这里直接挂真实 <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px]">SaveForm</code> 组件，
                    保留真实 tab、标签区、重复链接检查、AI 分类入口和 footer 映射。
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                    <div className="max-w-4xl p-6">
                      <SaveForm
                        folders={demoFolders}
                        onSave={async data => {
                          setSaveMockMessage(`已捕获一次 mock 保存：${data.title || data.url || '无标题'}`)
                        }}
                        onCancel={() => {
                          setSaveMockMessage('点击了取消，真实组件交互保持不变。')
                        }}
                        renderFooter={({
                          footerMessage,
                          footerTone,
                          primaryDisabled,
                          primaryLabel,
                          saving,
                          onSave,
                          onCancel,
                        }) => (
                          <DialogActions className="items-center justify-between gap-3">
                            <p className={`min-w-0 flex-1 text-xs ${footerTone === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>
                              {footerMessage}
                            </p>
                            <div className="flex shrink-0 gap-2">
                              <Button type="button" variant="outline" onClick={onCancel}>取消</Button>
                              <Button type="button" disabled={primaryDisabled} onClick={() => void onSave()}>
                                {saving ? '保存中…' : primaryLabel}
                              </Button>
                            </div>
                          </DialogActions>
                        )}
                      />
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                    {saveMockMessage}
                  </div>
                </div>
              </SectionCard>
            )}

            {activeSection === 'item-grid' && (
              <SectionCard title="Pattern / ItemGrid" doc="docs/design/card-pattern.md">
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
                    这里直接挂真实 <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px]">ItemGrid</code>，
                    用 mock 内容跑出 header、卡片、标签、MoreButton 和空态逻辑。
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-border bg-card">
                    <div className="h-[640px] overflow-auto">
                      <ItemGrid
                        items={gridSelectedFolder === 'empty' ? [] : demoItems as never[]}
                        folders={demoFolders as never[]}
                        loading={false}
                        selectedFolder={gridSelectedFolder}
                        onUpdate={async () => {}}
                        onMove={async () => {}}
                        onDelete={async () => {}}
                        onAdd={() => {}}
                        onEdit={() => {}}
                        onMobileMenuOpen={() => {}}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant={gridSelectedFolder === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setGridSelectedFolder('all')}>
                      查看卡片列表
                    </Button>
                    <Button variant={gridSelectedFolder === 'empty' ? 'default' : 'outline'} size="sm" onClick={() => setGridSelectedFolder('empty')}>
                      查看空状态
                    </Button>
                  </div>
                </div>
              </SectionCard>
            )}

            {activeSection === 'dialogs' && (
              <SectionCard title="Pattern / Dialog Family" doc="docs/design/dialog-family.md">
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
                    这里直接挂真实弹窗组件，不再只写结构说明。按钮点击后会打开真实组件，但保存和确认仍走 mock 处理。
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={() => setAddDialogOpen(true)}>打开 AddItemDialog</Button>
                    <Button variant="outline" onClick={() => setFolderDialogOpen(true)}>打开 FolderDialog</Button>
                    <Button variant="secondary" onClick={() => setConfirmDialogOpen(true)}>打开 ConfirmDialog</Button>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                    AddItemDialog 会直接带出真实 SaveForm；FolderDialog 和 ConfirmDialog 也会按真实项目交互打开。
                  </div>
                  <AddItemDialog
                    open={addDialogOpen}
                    onOpenChange={setAddDialogOpen}
                    folders={demoFolders as never[]}
                    onSave={async data => {
                      setSaveMockMessage(`弹窗 mock 保存成功：${data.title || data.url || '无标题'}`)
                      setAddDialogOpen(false)
                    }}
                    defaultFolderId={null}
                    editItem={null}
                  />
                  <FolderDialog
                    open={folderDialogOpen}
                    onOpenChange={setFolderDialogOpen}
                    mode="create"
                    currentName=""
                    onConfirm={async () => {}}
                  />
                  <ConfirmDialog
                    open={confirmDialogOpen}
                    onOpenChange={setConfirmDialogOpen}
                    title="删除收藏"
                    description="这是 React showcase 里的真实 ConfirmDialog 映射。"
                    onConfirm={() => setConfirmDialogOpen(false)}
                    danger
                  />
                </div>
              </SectionCard>
            )}

            {activeSection === 'get-app-dialog' && (
              <SectionCard title="Pattern / GetAppDialog" doc="docs/design/get-app-dialog.md">
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
                    这里直接挂真实 <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px]">GetAppDialog</code>，
                    保留书签栏、Chrome 扩展、手机 PWA 三个真实 tab 和书签按钮逻辑。
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={() => setGetAppDialogOpen(true)}>打开 GetAppDialog</Button>
                    <Button variant="outline" onClick={() => setGetAppDialogOpen(false)}>关闭示例弹窗</Button>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                    这个组件的重点不是“长得像弹窗”，而是三套获取方式的真实切换结构和书签按钮本体。
                  </div>
                  <GetAppDialog open={getAppDialogOpen} onOpenChange={setGetAppDialogOpen} />
                </div>
              </SectionCard>
            )}

            {activeSection === 'editor-bubble-menu' && (
              <SectionCard title="Pattern / EditorBubbleMenu" doc="docs/design/editor-bubble-menu.md">
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
                    这里直接复用真实的 TipTap 编辑器扩展和真实的 <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px]">EditorBubbleMenu</code>，
                    不再用假按钮排一个近似工具栏。
                  </div>
                  <DemoEditorBubbleMenu />
                </div>
              </SectionCard>
            )}

            {activeSection === 'design-panel' && (
              <SectionCard title="Pattern / DesignPanel" doc="docs/design/design-panel.md">
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm leading-6 text-muted-foreground">
                    这里直接挂真实的 <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px]">DesignPanel</code>。
                    它默认关闭，按 <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px]">Shift + Option + D</code>
                    就会从页面右侧弹出；因为它本来就是本地设计模式工具，不适合再画一个假面板替代。
                  </div>
                  <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                    当前在 localhost 下可直接触发真实面板；打开后可试 token、Inspector、复制 CSS 和保存到文件。
                  </div>
                  <DesignPanel />
                </div>
              </SectionCard>
            )}

            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-sm text-muted-foreground">
              下一批建议继续迁：<span className="font-medium text-foreground">Folder tree actions</span>、
              <span className="font-medium text-foreground"> Token / Layout React section</span>。
              旧 HTML 页保留在{' '}
              <a className="text-primary underline-offset-4 hover:underline" href="/docs/Design%20Guidelines/showcase.html">
                静态入口
              </a>
              。
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
