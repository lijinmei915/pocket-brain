import { useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { TextStyle, Color, FontSize, BackgroundColor } from '@tiptap/extension-text-style'
import Underline from '@tiptap/extension-underline'
import { ChevronDown, Search, Settings } from 'lucide-react'
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
import { Logo } from '@/components/ui/Logo'

const navGroups = [
  {
    id: 'overview',
    label: '总览',
    items: [
      {
        id: 'overview',
        title: 'Overview',
        label: '全局规范',
        doc: 'docs/DESIGN_STANDARDS.md',
      },
      {
        id: 'component-index',
        title: 'ComponentIndex',
        label: '组件目录',
        doc: 'docs/design/component-index.md',
      },
    ],
  },
  {
    id: 'tokens',
    label: 'Tokens',
    items: [
      {
        id: 'color-tokens',
        title: 'Color',
        label: '颜色',
        doc: 'docs/design/tokens/color.md',
      },
      {
        id: 'shadow-tokens',
        title: 'Shadow',
        label: '阴影',
        doc: 'docs/design/tokens/shadow.md',
      },
    ],
  },
  {
    id: 'layout-group',
    label: '布局',
    items: [
      {
        id: 'layout',
        title: 'Layout',
        label: '布局',
        doc: 'docs/design/layout.md',
      },
      {
        id: 'spacing-tokens',
        title: 'Space',
        label: '间距',
        doc: 'docs/design/tokens/space.md',
      },
      {
        id: 'divider',
        title: 'Divider',
        label: '分割线',
        doc: 'docs/design/layout.md',
      },
    ],
  },
  {
    id: 'primitive',
    label: '基础组件',
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
    id: 'business-pattern',
    label: '业务组件',
    items: [
      {
        id: 'dialog-shell',
        title: 'DialogShell',
        label: '弹窗结构',
        doc: 'docs/design/dialog-shell.md',
      },
      {
        id: 'panels',
        title: 'Panels',
        label: '面板',
        doc: 'docs/design/panels.md',
      },
      {
        id: 'sidebar',
        title: 'Sidebar',
        label: '侧栏',
        doc: 'docs/design/sidebar.md',
      },
      {
        id: 'field-patterns',
        title: 'FieldPatterns',
        label: '字段总则',
        doc: 'docs/design/field-patterns.md',
      },
      {
        id: 'input',
        title: 'FormField',
        label: '表单字段',
        doc: 'docs/design/form-field.md',
      },
      {
        id: 'more-button',
        title: 'MoreButton',
        label: '更多按钮',
        doc: 'docs/design/more-button.md',
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
  {
    id: 'system-rules',
    label: '系统规则',
    items: [
      {
        id: 'ai-actions',
        title: 'AIActions',
        label: 'AI 交互',
        doc: 'docs/design/ai-actions.md',
      },
      {
        id: 'tags-guide',
        title: 'Tags',
        label: '标签系统',
        doc: 'docs/design/tags.md',
      },
      {
        id: 'dialogs',
        title: 'DialogFamily',
        label: '弹窗家族',
        doc: 'docs/design/dialog-family.md',
      },
    ],
  },
  {
    id: 'page-group',
    label: '页面',
    items: [
      {
        id: 'login',
        title: 'Login',
        label: '登录',
        doc: 'docs/design/login.md',
      },
    ],
  },
] as const

const sections = navGroups.flatMap(group => group.items)

const sectionDescriptions: Record<string, string> = {
  overview: '设计规范总入口、阅读顺序和统一写法都从这里开始看。',
  'component-index': '先判断组件在哪一层，再决定看哪份文档和哪一段 showcase。',
  'color-tokens': '先看颜色本身，再看它如何映射成页面和组件语义色。',
  'shadow-tokens': '定义组件和容器如何用阴影表达层级。',
  layout: '协助定义 Pocket Brain 的页面级排版、间距节奏和容器层级。',
  'spacing-tokens': '统一说明间距等级、常用 utility class 和使用顺序。',
  divider: '定义分割线在信息层级里的位置、轻重和与上下内容的节奏。',
  button: 'Button 是 Pocket Brain 的基础动作原语，直接跟随 shadcn Button。',
  'tag-chip': 'TagChip 负责标签原语的展示、删除和状态表达。',
  tabs: 'Tabs 负责同组内容的切换，不表达业务流程本身。',
  'dialog-shell': '弹窗结构规则讲的是壳层、头部、主体和操作区的节奏。',
  panels: '面板规则讲的是展开、关闭和同组面板的一致性。',
  sidebar: 'Sidebar 规则讲的是导航、层级和折叠节奏。',
  'field-patterns': '字段总则负责标题、控件、状态和消息的组合规则。',
  input: '表单字段规则讲的是字段状态、消息和输入框的关系。',
  'more-button': 'MoreButton 负责局部菜单触发，不承担主操作。',
  'save-form': 'SaveForm 负责把多个字段组合成完整保存体验。',
  'item-grid': 'ItemGrid 负责列表密度、信息顺序和操作分布。',
  'link-field': 'LinkField 负责链接输入、校验和重复处理。',
  'title-field': 'TitleField 负责主标题输入和层级。',
  'folder-select-field': 'FolderSelectField 负责文件夹选择的结构和状态。',
  'note-field': 'NoteField 负责备注输入与 AI 总结协作。',
  'tag-field': 'TagField 负责已选标签、推荐标签和手动输入。',
  'content-type-tabs': 'ContentTypeTabs 负责内容类型切换，不负责正文布局。',
  'dialog-actions': 'DialogActions 负责主次按钮排序和操作区节奏。',
  'get-app-dialog': 'GetAppDialog 负责获取应用路径和安装选择。',
  'editor-bubble-menu': 'EditorBubbleMenu 负责编辑器浮动工具栏的结构和状态。',
  'design-panel': 'DesignPanel 负责设计调试面板的展示规则。',
  'ai-actions': 'AI 交互规则讲的是辅助优先级、失败回退和局部反馈。',
  'tags-guide': '标签系统规则讲的是推荐逻辑、保存顺序和回退机制。',
  dialogs: '弹窗家族规则讲的是不同弹窗之间的角色分工和一致性。',
  login: '登录页规则讲的是单栏结构、Magic Link 状态和成功失败反馈。',
}

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
  description,
  children,
}: {
  title: string
  doc: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-6 border-b border-border/70 pb-10">
      <div className="space-y-4 border-b border-border pb-5">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {description ? (
          <p className="max-w-4xl text-[15px] leading-7 text-muted-foreground">{description}</p>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-[120px_minmax(0,1fr)]">
          <p className="text-sm font-medium text-foreground">文档位置</p>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-md border border-border bg-muted/40 px-2.5 py-1 font-mono text-[12px] text-muted-foreground">
              {doc}
            </span>
          </div>
        </div>
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
    <div className="rounded-2xl border border-border bg-background">
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
  const activeSectionMeta = sections.find(section => section.id === activeSection)

  return (
    <div className="min-h-screen bg-[#f7f8fb] text-foreground">
      <div className="grid min-h-screen grid-cols-[240px_minmax(0,1fr)]">
        <aside className="sticky top-0 flex h-screen flex-col border-r border-[#e8ebf2] bg-[#fbfcfe]">
          <div className="flex h-16 items-center border-b border-border px-4">
            <div className="flex items-center gap-3">
              <Logo size={28} />
              <p className="text-[15px] font-semibold text-foreground">Pocket Brain</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-5">
            <div className="space-y-5">
            {navGroups.map(group => (
              <div key={group.id}>
                <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {group.label}
                </p>
                <div className="space-y-1">
                  {group.items.map(section => (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setActiveSection(section.id)}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                        activeSection === section.id
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-foreground hover:bg-muted'
                      }`}
                    >
                      {section.label} {section.title}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            </div>
          </div>

        </aside>

        <main className="min-w-0 bg-background">
          <div className="sticky top-0 z-20 flex h-16 items-center justify-between gap-6 border-b border-border bg-background px-6">
            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                readOnly
                value="搜索文档"
                className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-12 text-sm text-muted-foreground outline-none transition-colors hover:border-border focus-visible:border-ring"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-border bg-white px-1.5 py-0.5 text-[11px] text-muted-foreground">
                ⌘K
              </span>
            </div>
            <div className="flex items-center gap-5 text-sm text-muted-foreground">
              <button type="button" className="transition-colors hover:text-foreground">设计原则</button>
              <button type="button" className="transition-colors hover:text-foreground">开发指南</button>
              <button type="button" className="transition-colors hover:text-foreground">更新日志</button>
              <Button type="button" variant="outline" size="sm" shadow="none" className="gap-1 bg-background text-foreground">
                <span className="text-sm">v6.3.0</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
              <Button type="button" variant="outline" size="icon-sm" shadow="none" className="bg-background text-muted-foreground hover:text-foreground">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="bg-background px-8 py-8 md:px-10">
            <div className="mx-auto max-w-5xl space-y-8">

            {activeSection === 'overview' && (
              <SectionCard title="全局规范 Overview" doc="docs/DESIGN_STANDARDS.md" description={sectionDescriptions.overview}>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-border bg-background p-4">
                    <p className="mb-2 text-sm font-medium">现在这页负责什么</p>
                    <ul className="list-disc space-y-1 pl-4 text-sm leading-6 text-muted-foreground">
                      <li>优先展示真实组件映射，不再只看静态示意。</li>
                      <li>组件文档写法和真实组件结构同步推进。</li>
                      <li>新 token、间距、阴影规则先同步到这里。</li>
                    </ul>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-4">
                    <p className="mb-2 text-sm font-medium">阅读顺序</p>
                    <ol className="list-decimal space-y-1 pl-4 text-sm leading-6 text-muted-foreground">
                      <li>先看总规范和组件分层。</li>
                      <li>再看 Tokens、布局和基础组件的真实映射。</li>
                      <li>最后看业务组件和页面场景。</li>
                    </ol>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-4 md:col-span-2">
                    <p className="mb-2 text-sm font-medium">设计文档统一写法</p>
                    <ol className="list-decimal space-y-1 pl-4 text-sm leading-6 text-muted-foreground">
                      <li>标题</li>
                      <li>一句话说明</li>
                      <li>使用</li>
                      <li>设计规则（尺寸 / 交互 / 视觉）</li>
                      <li>组件结构</li>
                      <li>代码演示</li>
                      <li>Design Token</li>
                      <li>相关资源</li>
                    </ol>
                  </div>
                </div>
              </SectionCard>
            )}

            {activeSection === 'component-index' && (
              <SectionCard title="组件目录 ComponentIndex" doc="docs/design/component-index.md" description={sectionDescriptions['component-index']}>
                <div className="space-y-5">
                  <div className="rounded-xl border border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
                    这一节对应组件目录总表：先判断是 <strong>Primitive</strong> 还是 <strong>Pattern</strong>，再决定去哪个文档和哪个 showcase section。
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-border bg-background p-4">
                      <p className="mb-2 text-sm font-medium">Primitive</p>
                      <ul className="list-disc space-y-1 pl-4 text-sm leading-6 text-muted-foreground">
                        <li>直接跟随 shadcn 的基础原语</li>
                        <li>优先复用，不再造第二套底层交互</li>
                        <li>例子：Button、Input、Tabs、TagChip</li>
                      </ul>
                    </div>
                    <div className="rounded-xl border border-border bg-background p-4">
                      <p className="mb-2 text-sm font-medium">Pattern</p>
                      <ul className="list-disc space-y-1 pl-4 text-sm leading-6 text-muted-foreground">
                        <li>在 Primitive 上补业务语义和节奏</li>
                        <li>负责字段结构、弹窗家族、保存表单等组合</li>
                        <li>例子：SaveForm、DialogActions、Login、Tags</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </SectionCard>
            )}

            {activeSection === 'layout' && (
              <SectionCard title="布局 Layout" doc="docs/design/layout.md" description={sectionDescriptions.layout}>
                <div className="space-y-8">
                  <section className="space-y-5">
                    <h3 className="text-2xl font-semibold tracking-tight">设计规则</h3>

                    <div className="space-y-3">
                      <h4 className="text-lg font-semibold">尺寸</h4>
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-xl border border-border bg-background p-4">
                          <p className="mb-2 text-sm font-medium">字段内部</p>
                          <p className="text-sm text-muted-foreground">优先 `space-sm`，比如标题和输入框、正文和辅助说明。</p>
                        </div>
                        <div className="rounded-xl border border-border bg-background p-4">
                          <p className="mb-2 text-sm font-medium">默认节奏</p>
                          <p className="text-sm text-muted-foreground">优先 `space-md`，作为普通字段和普通区块的默认间距。</p>
                        </div>
                        <div className="rounded-xl border border-border bg-background p-4">
                          <p className="mb-2 text-sm font-medium">首屏卡片</p>
                          <p className="text-sm text-muted-foreground">优先 `space-lg / space-xl`，给重点卡片和容器留白。</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-lg font-semibold">交互</h4>
                      <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-muted-foreground">
                        <li>局部状态放局部，不放全局。</li>
                        <li>表单错误放字段下方，不放 footer。</li>
                        <li>AI 状态优先挂在对应标题右侧。</li>
                      </ul>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-lg font-semibold">视觉</h4>
                      <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-muted-foreground">
                        <li>普通输入区不额外套大壳层。</li>
                        <li>容器优先先定内边距，再定内部 gap。</li>
                        <li>不要同时靠 `py-*`、`space-y-*`、`mt-*` 三层一起堆留白。</li>
                      </ul>
                    </div>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-2xl font-semibold tracking-tight">组件结构</h3>
                    <div className="rounded-xl border border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
                      页面容器、模块容器、字段节奏、辅助结构这 4 层一起决定布局。Layout 负责这些层的秩序，不直接定义业务字段本身。
                    </div>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-2xl font-semibold tracking-tight">代码演示</h3>
                    <div className="rounded-xl border border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
                      现在登录页和首屏卡片已经按 <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px]">stack-*</code>、
                      <code className="ml-1 rounded bg-background px-1.5 py-0.5 font-mono text-[11px]">gap-*</code>、
                      <code className="ml-1 rounded bg-background px-1.5 py-0.5 font-mono text-[11px]">pad-card-xl</code>
                      这套 utility 在走。
                    </div>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-2xl font-semibold tracking-tight">Design Token</h3>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="rounded-xl border border-border bg-background p-4">
                        <p className="mb-2 text-sm font-medium">间距</p>
                        <p className="text-sm text-muted-foreground">`--space-xs / sm / md / lg / xl`</p>
                      </div>
                      <div className="rounded-xl border border-border bg-background p-4">
                        <p className="mb-2 text-sm font-medium">圆角</p>
                        <p className="text-sm text-muted-foreground">优先走 `--radius-*`</p>
                      </div>
                      <div className="rounded-xl border border-border bg-background p-4">
                        <p className="mb-2 text-sm font-medium">阴影</p>
                        <p className="text-sm text-muted-foreground">容器优先 `--shadow-lg`</p>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-2xl font-semibold tracking-tight">相关资源</h3>
                    <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-muted-foreground">
                      <li>`docs/design/layout.md`</li>
                      <li>`docs/design/tokens/README.md`</li>
                      <li>`src/styles/tokens.css` / `src/styles/helpers.css`</li>
                    </ul>
                  </section>
                </div>
              </SectionCard>
            )}

            {activeSection === 'divider' && (
              <SectionCard title="分割线 Divider" doc="docs/design/layout.md" description={sectionDescriptions.divider}>
                <div className="space-y-5">
                  <div className="rounded-xl border border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
                    分割线现在先作为布局规则的一部分管理：重点是它在信息层级里的位置、轻重和与上下内容的节奏，不单独再开第二套视觉系统。
                  </div>
                  <div className="rounded-2xl border border-border bg-background p-5">
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">默认分割线</p>
                        <div className="h-px w-full bg-border" />
                        <p className="text-sm text-muted-foreground">用于普通模块之间的轻分隔。</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">带正文的分隔线</p>
                        <div className="flex items-center gap-md text-muted-foreground">
                          <div className="h-px flex-1 bg-border" />
                          <span className="text-sm">安全、快速、无密码登录</span>
                          <div className="h-px flex-1 bg-border" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </SectionCard>
            )}

            {activeSection === 'shadow-tokens' && (
              <SectionCard title="阴影 Shadow" doc="docs/design/tokens/shadow.md" description={sectionDescriptions['shadow-tokens']}>
                <div className="space-y-5">
                  <div className="rounded-xl border border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
                    阴影现在已经独立成 token，并通过组件的 <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px]">shadow</code> 选项来引用。
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-xl border border-border bg-background p-4 shadow-none">
                      <p className="mb-2 text-sm font-medium">none</p>
                      <p className="text-sm text-muted-foreground">默认，无阴影。</p>
                    </div>
                    <div className="rounded-xl border border-border bg-background p-4">
                      <p className="mb-2 text-sm font-medium">md</p>
                      <p className="text-sm text-muted-foreground">组件级强调，如主按钮、成组操作按钮。</p>
                    </div>
                    <div className="rounded-xl border border-border bg-background p-4">
                      <p className="mb-2 text-sm font-medium">lg</p>
                      <p className="text-sm text-muted-foreground">容器级强调，如卡片、面板、弹窗壳层。</p>
                    </div>
                  </div>
                </div>
              </SectionCard>
            )}

            {activeSection === 'color-tokens' && (
              <SectionCard title="颜色 Color" doc="docs/design/tokens/color.md" description={sectionDescriptions['color-tokens']}>
                <div className="space-y-10">
                  <section className="space-y-5">
                    <div className="space-y-2">
                      <h3 className="text-2xl font-semibold tracking-tight">颜色设计规范</h3>
                      <p className="text-sm leading-6 text-muted-foreground">
                        基于 Pocket Brain 当前真实 token，整理品牌色、中性色、功能色、组件例外色和语义化映射，确保设计文档、组件实现和展示页三边一致。
                      </p>
                    </div>
                  </section>

                  <section className="space-y-5">
                    <h3 className="text-2xl font-semibold tracking-tight">1. 品牌色</h3>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Pocket Brain 当前不单独维护一套高饱和品牌梯度，品牌色板暂时直接借用中性色深层；主操作色仍以当前真实
                      `primary / primary-hover` 为准。
                    </p>
                    <div className="grid gap-6 md:grid-cols-[260px_minmax(0,1fr)]">
                      <div className="rounded-2xl border border-border bg-card p-5">
                        <div className="h-24 rounded-xl border border-border bg-[#262626]" />
                        <div className="mt-4 space-y-1">
                          <p className="text-xl font-semibold text-foreground">主色 Primary</p>
                          <p className="font-mono text-sm text-muted-foreground">#262626</p>
                          <p className="text-sm leading-6 text-muted-foreground">用于主按钮、重点操作和当前品牌主识别色。</p>
                          <p className="font-mono text-sm text-muted-foreground">hover: #1F1F1F</p>
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-8">
                      {[
                        ['100', '#FAFAFA', 'neutral-1'],
                        ['200', '#F2F2F2', 'neutral-2'],
                        ['300', '#E8E8E8', 'neutral-3'],
                        ['400', '#BFBFBF', 'neutral-4'],
                        ['500', '#595959', 'neutral-7'],
                        ['600', '#434343', 'neutral-8'],
                        ['700', '#262626', 'neutral-9'],
                        ['800', '#1F1F1F', 'neutral-10'],
                      ].map(([step, hex, source]) => (
                        <div key={step} className="space-y-2">
                          <div className="h-16 rounded-lg border border-border" style={{ backgroundColor: hex }} />
                          <div className="space-y-0.5 text-center">
                            <p className="text-xs font-medium text-foreground">{step}</p>
                            <p className="font-mono text-[11px] text-muted-foreground">{hex}</p>
                            <p className="text-[10px] text-muted-foreground">{source}</p>
                          </div>
                        </div>
                      ))}
                      </div>
                    </div>
                  </section>

                  <section className="space-y-5">
                    <h3 className="text-2xl font-semibold tracking-tight">2. 中性色</h3>
                    <p className="text-sm leading-6 text-muted-foreground">
                      中性色负责页面层级、文字、边框和容器关系，是当前设计规范里最重要的一组骨架色。
                    </p>
                    <div className="grid gap-3 md:grid-cols-10">
                      {[
                        ['0', '#FFFFFF'],
                        ['1', '#FAFAFA'],
                        ['2', '#F2F2F2'],
                        ['3', '#E8E8E8'],
                        ['4', '#BFBFBF'],
                        ['6', '#8C8C8C'],
                        ['7', '#595959'],
                        ['8', '#434343'],
                        ['9', '#262626'],
                        ['10', '#1F1F1F'],
                      ].map(([step, hex]) => (
                        <div key={step} className="space-y-2">
                          <div className="h-16 rounded-lg border border-border" style={{ backgroundColor: hex }} />
                          <div className="space-y-0.5 text-center">
                            <p className="text-xs font-medium text-foreground">{step}</p>
                            <p className="font-mono text-[11px] text-muted-foreground">{hex}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="grid gap-4 md:grid-cols-5">
                      {[
                        ['neutral-0 ~ 1', '正文区、整页底色'],
                        ['neutral-2 ~ 3', '导航区、次级背景、边框'],
                        ['neutral-4 ~ 6', '禁用态、次要文字'],
                        ['neutral-7 ~ 8', '辅助强调、深次级文字'],
                        ['neutral-9 ~ 10', '主文字、最强对比内容'],
                      ].map(([title, desc]) => (
                        <div key={title} className="rounded-lg border border-border px-3 py-3 text-sm">
                          <p className="font-medium text-foreground">{title}</p>
                          <p className="mt-1 leading-6 text-muted-foreground">{desc}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-5">
                    <h3 className="text-2xl font-semibold tracking-tight">3. 功能色</h3>
                    <p className="text-sm leading-6 text-muted-foreground">
                      功能色只负责状态，不拿来充当普通装饰色。当前项目主要用成功、警告、错误和链接四类。
                    </p>
                    <div className="space-y-4">
                      {[
                        ['Success', '成功', ['#ECFDF5', '#A7F3D0', '#34D399', '#059669', '#047857']],
                        ['Warning', '警告', ['#FFFBEB', '#FDE68A', '#FBBF24', '#D97706', '#B45309']],
                        ['Danger', '错误', ['#FEF2F2', '#FECACA', '#F87171', '#DC2626', '#B91C1C']],
                        ['Link', '链接', ['#EFF6FF', '#BFDBFE', '#60A5FA', '#2563EB', '#1D4ED8']],
                      ].map(([en, cn, colors]) => (
                        <div key={en} className="grid gap-4 md:grid-cols-[160px_minmax(0,1fr)]">
                          <div>
                            <p className="text-base font-semibold text-foreground">{cn} {en}</p>
                          </div>
                          <div className="grid gap-3 md:grid-cols-5">
                            {(colors as string[]).map((hex, index) => (
                              <div key={hex} className="space-y-2">
                                <div className="h-14 rounded-lg border border-border" style={{ backgroundColor: hex }} />
                                <div className="space-y-0.5 text-center">
                                  <p className="text-xs font-medium text-foreground">{[100, 300, 500, 700, 800][index]}</p>
                                  <p className="font-mono text-[11px] text-muted-foreground">{hex}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="space-y-5">
                    <h3 className="text-2xl font-semibold tracking-tight">4. 组件例外色</h3>
                    <p className="text-sm leading-6 text-muted-foreground">
                      这部分不是全局语义色，但已经在项目里真实存在，所以要被记录，而不是散落在组件里偷偷定义。
                    </p>

                    <div className="space-y-6">
                      <div className="space-y-3">
                        <h4 className="text-lg font-semibold tracking-tight">内容类型标签</h4>
                        <div className="grid gap-3 md:grid-cols-3">
                          {[
                            ['文章', '#ECFDF5', '#047857', 'component-tag-article'],
                            ['视频', '#FFF1F2', '#BE123C', 'component-tag-video'],
                            ['音频', '#FAF5FF', '#6D28D9', 'component-tag-audio'],
                            ['推文', '#EFF6FF', '#1D4ED8', 'component-tag-tweet'],
                            ['其他', '#F5F5F5', '#525252', 'component-tag-other'],
                            ['备注', '#FFFBEB', '#92400E', 'component-tag-note'],
                          ].map(([name, bg, fg, token]) => (
                            <div key={token} className="rounded-xl border border-border bg-card p-4">
                              <div className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium" style={{ backgroundColor: bg, color: fg }}>
                                {name}
                              </div>
                              <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                                <p className="font-mono text-[12px] text-foreground">{String(token)}</p>
                                <p>背景 {bg}</p>
                                <p>文字 {fg}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-xl border border-border bg-card p-4">
                          <h4 className="text-lg font-semibold tracking-tight">侧栏选中态</h4>
                          <div className="mt-3 rounded-lg border border-border px-3 py-2" style={{ backgroundColor: '#F3F4F6', color: '#262626' }}>
                            当前项高亮示例
                          </div>
                          <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                            <p className="font-mono text-[12px] text-foreground">component-sidebar-active</p>
                            <p>背景 #F3F4F6</p>
                            <p>文字 #262626</p>
                          </div>
                        </div>

                        <div className="rounded-xl border border-border bg-card p-4">
                          <h4 className="text-lg font-semibold tracking-tight">图标色</h4>
                          <div className="mt-3 flex gap-3">
                            {[
                              ['主图标', '#262626'],
                              ['次级图标', '#8C8C8C'],
                              ['禁用图标', '#BFBFBF'],
                            ].map(([label, color]) => (
                              <div key={label} className="flex-1 rounded-lg border border-border p-3">
                                <div className="h-8 w-8 rounded-md border border-border" style={{ backgroundColor: color }} />
                                <p className="mt-2 text-sm font-medium text-foreground">{label}</p>
                                <p className="font-mono text-[12px] text-muted-foreground">{color}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-4">
                    <h3 className="text-2xl font-semibold tracking-tight">5. 语义化使用</h3>
                    <div className="overflow-hidden rounded-xl border border-border">
                      <table className="w-full text-sm">
                        <thead className="border-b border-border bg-card">
                          <tr className="text-left text-muted-foreground">
                            <th className="px-4 py-3 font-medium">语义</th>
                            <th className="px-4 py-3 font-medium">颜色</th>
                            <th className="px-4 py-3 font-medium">使用场景</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            ['Primary', '#262626', '主按钮、重点操作、当前品牌主色'],
                            ['Success', '#059669', '成功状态、正向反馈、完成提示'],
                            ['Danger', '#DC2626', '删除操作、错误提示、危险状态'],
                            ['Warning', '#D97706', '警告提示、注意事项、频率限制'],
                            ['Info', '#2563EB', '链接、帮助说明、信息提示'],
                            ['Neutral', '#595959', '文本、图标、边框、背景等基础元素'],
                          ].map(([name, hex, usage]) => (
                            <tr key={name} className="border-b border-border last:border-b-0">
                              <td className="px-4 py-3 font-medium text-foreground">{name}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <span className="h-4 w-4 rounded-full border border-border" style={{ backgroundColor: hex as string }} />
                                  <span className="font-mono text-[13px] text-foreground">{hex}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground">{usage}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-2xl font-semibold tracking-tight">6. 使用建议</h3>
                    <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-muted-foreground">
                      <li>先有颜色仓库，再做语义映射。</li>
                      <li>整页外层优先用 <code className="rounded bg-card px-1.5 py-0.5 font-mono text-[11px]">bg-background</code>，正文详情区优先用 <code className="rounded bg-card px-1.5 py-0.5 font-mono text-[11px]">bg-card</code>。</li>
                      <li>功能色只做状态提示，不拿来替代普通层级色。</li>
                      <li>不要在组件里直接写死 `#FAFAFA / #FFFFFF / #262626`，先看 token 映射。</li>
                    </ul>
                  </section>
                </div>
              </SectionCard>
            )}

            {activeSection === 'field-patterns' && (
              <SectionCard title="字段总则 FieldPatterns" doc="docs/design/field-patterns.md" description={sectionDescriptions['field-patterns']}>
                <div className="space-y-5">
                  <div className="rounded-xl border border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
                    字段级 Pattern 不是裸 `Input / Textarea / Select`，而是“标题 + 控件 + 状态 + 消息 + 节奏”的整项体验。
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-xl border border-border bg-background p-4">
                      <p className="mb-2 text-sm font-medium">Primitive</p>
                      <p className="text-sm text-muted-foreground">Input / Textarea / Select 只管基础交互，不带业务语义。</p>
                    </div>
                    <div className="rounded-xl border border-border bg-background p-4">
                      <p className="mb-2 text-sm font-medium">字段级 Pattern</p>
                      <p className="text-sm text-muted-foreground">LinkField / TitleField / FolderSelectField / NoteField。</p>
                    </div>
                    <div className="rounded-xl border border-border bg-background p-4">
                      <p className="mb-2 text-sm font-medium">表单级 Pattern</p>
                      <p className="text-sm text-muted-foreground">SaveForm 负责把多项字段组合成完整保存体验。</p>
                    </div>
                  </div>
                </div>
              </SectionCard>
            )}

            {activeSection === 'dialog-shell' && (
              <SectionCard title="弹窗结构 DialogShell" doc="docs/design/dialog-shell.md" description={sectionDescriptions['dialog-shell']}>
                <div className="space-y-5">
                  <div className="rounded-xl border border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
                    当前项目的弹窗壳层默认直接使用 shadcn <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px]">Dialog</code>，
                    不再维护第二套项目级弹窗壳。
                  </div>
                  <div className="rounded-2xl border border-border bg-background p-5">
                    <div className="space-y-3">
                      <div className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">DialogHeader / DialogTitle / DialogDescription</div>
                      <div className="rounded-lg border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">DialogContent 主体内容区</div>
                      <div className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">DialogFooter / DialogActions</div>
                    </div>
                  </div>
                </div>
              </SectionCard>
            )}

            {activeSection === 'ai-actions' && (
              <SectionCard title="AI 交互 AIActions" doc="docs/design/ai-actions.md" description={sectionDescriptions['ai-actions']}>
                <div className="space-y-5">
                  <div className="rounded-xl border border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
                    AI 在 Pocket Brain 里是辅助，不是主流程。规则是：<strong>保存优先，AI 次之，AI 失败不能卡死用户</strong>。
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-border bg-background p-4">
                      <p className="mb-2 text-sm font-medium">AI 分类</p>
                      <ul className="list-disc space-y-1 pl-4 text-sm leading-6 text-muted-foreground">
                        <li>标签标题右侧手动触发</li>
                        <li>loading 文案：`分类中…`</li>
                        <li>超时后保留手动操作出口</li>
                      </ul>
                    </div>
                    <div className="rounded-xl border border-border bg-background p-4">
                      <p className="mb-2 text-sm font-medium">AI 总结</p>
                      <ul className="list-disc space-y-1 pl-4 text-sm leading-6 text-muted-foreground">
                        <li>备注标题右侧手动触发</li>
                        <li>失败只做局部提示，不升级成全局错误</li>
                        <li>按钮保留重试入口</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </SectionCard>
            )}

            {activeSection === 'tags-guide' && (
              <SectionCard title="标签系统 Tags" doc="docs/design/tags.md" description={sectionDescriptions['tags-guide']}>
                <div className="space-y-5">
                  <div className="rounded-xl border border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
                    标签系统规则讲的是“推荐逻辑、最终保存顺序、空标签回退”，不是单个 `TagChip` 视觉。
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-border bg-background p-4">
                      <p className="mb-2 text-sm font-medium">AI 推荐</p>
                      <p className="text-sm text-muted-foreground">有 AI 推荐时，前台推荐只展示 `content + format`，`source` 只保留为底层元数据。</p>
                    </div>
                    <div className="rounded-xl border border-border bg-background p-4">
                      <p className="mb-2 text-sm font-medium">最终结果</p>
                      <p className="text-sm text-muted-foreground">保存后按弹窗里最后留下的标签集合为准；一个都没有时回退到 `其他`。</p>
                    </div>
                  </div>
                </div>
              </SectionCard>
            )}

            {activeSection === 'login' && (
              <SectionCard title="登录 Login" doc="docs/design/login.md" description={sectionDescriptions.login}>
                <div className="space-y-5">
                  <div className="rounded-xl border border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
                    登录页规范讲的是“单栏结构、Magic Link 状态、成功/失败反馈”，不是只看邮箱输入框和按钮本体。
                  </div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-xl border border-border bg-background p-4">
                      <p className="mb-2 text-sm font-medium">初始态</p>
                      <p className="text-sm text-muted-foreground">标题、说明、邮箱字段、主按钮，只有一个明确主目标。</p>
                    </div>
                    <div className="rounded-xl border border-border bg-background p-4">
                      <p className="mb-2 text-sm font-medium">发送中</p>
                      <p className="text-sm text-muted-foreground">主按钮 loading，输入框可禁用，页面不切走。</p>
                    </div>
                    <div className="rounded-xl border border-border bg-background p-4">
                      <p className="mb-2 text-sm font-medium">发送成功</p>
                      <p className="text-sm text-muted-foreground">切到成功反馈态，强调“去邮箱点链接”，不让主按钮继续抢优先级。</p>
                    </div>
                  </div>
                </div>
              </SectionCard>
            )}

            {activeSection === 'panels' && (
              <SectionCard title="面板 Panels" doc="docs/design/panels.md" description={sectionDescriptions.panels}>
                <div className="space-y-5">
                  <div className="rounded-xl border border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
                    面板规则讲的是“如何展开、如何关闭、同组面板怎样保持一致”，不是单个颜色面板长什么样。
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-border bg-background p-4">
                      <p className="mb-2 text-sm font-medium">触发与关闭</p>
                      <p className="text-sm text-muted-foreground">点击触发，不靠 hover；选择后关闭，支持 Escape 和失焦关闭。</p>
                    </div>
                    <div className="rounded-xl border border-border bg-background p-4">
                      <p className="mb-2 text-sm font-medium">一致性</p>
                      <p className="text-sm text-muted-foreground">同一工具栏里，所有面板的触发和展开方向必须一致，不能一半向右一半向下。</p>
                    </div>
                  </div>
                </div>
              </SectionCard>
            )}

            {activeSection === 'spacing-tokens' && (
              <SectionCard title="间距 Space" doc="docs/design/tokens/space.md" description={sectionDescriptions['spacing-tokens']}>
                <div className="space-y-5">
                  <div className="rounded-xl border border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
                    间距现在已经独立成 token，并通过常用 spacing utility class 来复用。
                  </div>
                  <div className="grid gap-4 md:grid-cols-4">
                    <div className="rounded-xl border border-border bg-background p-4">
                      <p className="mb-2 text-sm font-medium">sm</p>
                      <p className="text-sm text-muted-foreground">8px</p>
                    </div>
                    <div className="rounded-xl border border-border bg-background p-4">
                      <p className="mb-2 text-sm font-medium">md</p>
                      <p className="text-sm text-muted-foreground">16px</p>
                    </div>
                    <div className="rounded-xl border border-border bg-background p-4">
                      <p className="mb-2 text-sm font-medium">lg</p>
                      <p className="text-sm text-muted-foreground">20px</p>
                    </div>
                    <div className="rounded-xl border border-border bg-background p-4">
                      <p className="mb-2 text-sm font-medium">xl</p>
                      <p className="text-sm text-muted-foreground">24px</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
                    常用 class：<code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px]">stack-sm/md/lg/xl</code>、
                    <code className="ml-1 rounded bg-background px-1.5 py-0.5 font-mono text-[11px]">gap-sm/md/lg/xl</code>、
                    <code className="ml-1 rounded bg-background px-1.5 py-0.5 font-mono text-[11px]">pad-card-xl</code>
                  </div>
                </div>
              </SectionCard>
            )}

            {activeSection === 'button' && (
              <SectionCard title="按钮 Button" doc="docs/design/buttons.md" description={sectionDescriptions.button}>
                <div className="space-y-8">
                  <section className="grid gap-4 border-b border-border/70 pb-6 md:grid-cols-3">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">使用</p>
                      <span className="inline-flex rounded-md border border-border bg-background px-2.5 py-1 font-mono text-[12px] text-muted-foreground">
                        src/components/ui/button.jsx
                      </span>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">文档</p>
                      <span className="inline-flex rounded-md border border-border bg-background px-2.5 py-1 font-mono text-[12px] text-muted-foreground">
                        docs/design/buttons.md
                      </span>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">代码位置</p>
                      <span className="inline-flex rounded-md border border-border bg-background px-2.5 py-1 font-mono text-[12px] text-muted-foreground">
                        buttonVariants / variant / size / shadow
                      </span>
                    </div>
                  </section>

                  <section className="space-y-5">
                    <h3 className="text-2xl font-semibold tracking-tight">设计规则</h3>

                    <div className="space-y-3">
                      <h4 className="text-lg font-semibold">尺寸</h4>
                      <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-muted-foreground">
                        <li>`default` 是普通按钮默认值。</li>
                        <li>`lg` 用于页面里的常规主操作。</li>
                        <li>`xl` 只给登录页、首屏表单这类强调主操作。</li>
                        <li>`icon` 只用于正方形图标按钮。</li>
                      </ul>
                      <div className="overflow-hidden rounded-xl border border-border">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-muted/25 text-muted-foreground">
                            <tr>
                              <th className="px-4 py-3 font-medium">尺寸</th>
                              <th className="px-4 py-3 font-medium">高度</th>
                              <th className="px-4 py-3 font-medium">内边距（左右）</th>
                              <th className="px-4 py-3 font-medium">适用场景</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-t border-border">
                              <td className="px-4 py-3"><span className="rounded bg-muted px-2 py-1 font-mono text-[12px]">default</span></td>
                              <td className="px-4 py-3 text-muted-foreground">36px</td>
                              <td className="px-4 py-3 text-muted-foreground">16px</td>
                              <td className="px-4 py-3 text-muted-foreground">普通按钮默认值</td>
                            </tr>
                            <tr className="border-t border-border">
                              <td className="px-4 py-3"><span className="rounded bg-muted px-2 py-1 font-mono text-[12px]">lg</span></td>
                              <td className="px-4 py-3 text-muted-foreground">44px</td>
                              <td className="px-4 py-3 text-muted-foreground">20px</td>
                              <td className="px-4 py-3 text-muted-foreground">页面里的常规主操作</td>
                            </tr>
                            <tr className="border-t border-border">
                              <td className="px-4 py-3"><span className="rounded bg-muted px-2 py-1 font-mono text-[12px]">xl</span></td>
                              <td className="px-4 py-3 text-muted-foreground">52px</td>
                              <td className="px-4 py-3 text-muted-foreground">24px</td>
                              <td className="px-4 py-3 text-muted-foreground">登录页、首屏表单</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-lg font-semibold">交互</h4>
                      <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-muted-foreground">
                        <li>按钮必须覆盖默认、hover、focus-visible、disabled。</li>
                        <li>hover 由基础按钮统一控制，不在页面里重写第二套状态。</li>
                        <li>focus-visible 必须保留 ring。</li>
                      </ul>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-lg font-semibold">视觉</h4>
                      <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-muted-foreground">
                        <li>颜色、圆角、阴影优先走 token。</li>
                        <li>按钮通常只用 `none` 或 `md` 阴影。</li>
                        <li>同一组按钮的 hover 节奏要一致。</li>
                      </ul>
                    </div>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-2xl font-semibold tracking-tight">组件结构</h3>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Button 负责按钮本体、图标和文字排布、variant、size、shadow 以及基础交互状态；不负责弹窗 footer 布局、卡片操作区分布和页面主次关系。
                    </p>
                    <div className="overflow-hidden rounded-xl border border-border bg-[#fbfbfc]">
                      <pre className="overflow-x-auto px-4 py-4 text-[13px] leading-6 text-muted-foreground">
                        <code>{`<button class="inline-flex items-center justify-center gap-2" type="button">
  <span class="btn-content">按钮内容</span>
</button>`}</code>
                      </pre>
                    </div>
                  </section>

                  <section className="space-y-5">
                    <h3 className="text-2xl font-semibold tracking-tight">代码演示</h3>
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
                        <Button size="xl">XL</Button>
                        <Button size="icon" aria-label="图标按钮">
                          +
                        </Button>
                      </div>
                    </div>
                    <div>
                      <p className="mb-3 text-sm font-medium">状态</p>
                      <div className="flex flex-wrap items-center gap-3">
                        <Button size="lg">Normal</Button>
                        <Button size="lg" className="brightness-[1.04]">Hover</Button>
                        <Button size="lg" className="scale-[0.98]">Pressed</Button>
                        <Button size="lg" disabled>Disabled</Button>
                      </div>
                    </div>
                    <div>
                      <p className="mb-3 text-sm font-medium">阴影</p>
                      <div className="flex flex-wrap items-center gap-3">
                        <Button size="lg" shadow="none">None</Button>
                        <Button size="lg" shadow="md">MD</Button>
                        <Button size="lg" shadow="lg">LG</Button>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-2xl font-semibold tracking-tight">Design Token</h3>
                    <div className="overflow-hidden rounded-xl border border-border">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-muted/25 text-muted-foreground">
                          <tr>
                            <th className="px-4 py-3 font-medium">Token 名称</th>
                            <th className="px-4 py-3 font-medium">描述</th>
                            <th className="px-4 py-3 font-medium">用途</th>
                            <th className="px-4 py-3 font-medium">当前值</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-t border-border">
                            <td className="px-4 py-3 font-mono text-[12px]">--radius-lg</td>
                            <td className="px-4 py-3 text-muted-foreground">普通按钮圆角</td>
                            <td className="px-4 py-3 text-muted-foreground">default / lg / xl 按钮</td>
                            <td className="px-4 py-3 text-muted-foreground">项目 token</td>
                          </tr>
                          <tr className="border-t border-border">
                            <td className="px-4 py-3 font-mono text-[12px]">--shadow-md</td>
                            <td className="px-4 py-3 text-muted-foreground">组件级中阴影</td>
                            <td className="px-4 py-3 text-muted-foreground">主按钮、成组操作</td>
                            <td className="px-4 py-3 text-muted-foreground">项目 token</td>
                          </tr>
                          <tr className="border-t border-border">
                            <td className="px-4 py-3 font-mono text-[12px]">--shadow-lg</td>
                            <td className="px-4 py-3 text-muted-foreground">大阴影</td>
                            <td className="px-4 py-3 text-muted-foreground">强调容器，不常给按钮</td>
                            <td className="px-4 py-3 text-muted-foreground">项目 token</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section className="space-y-3">
                    <h3 className="text-2xl font-semibold tracking-tight">相关资源</h3>
                    <ul className="list-disc space-y-1 pl-5 text-sm leading-6">
                      <li><a className="text-[#175cd3] hover:underline" href="#overview">全局规范 Overview</a></li>
                      <li><a className="text-[#175cd3] hover:underline" href="#layout">布局 Layout</a></li>
                      <li><a className="text-[#175cd3] hover:underline" href="#spacing-tokens">间距 Space</a></li>
                      <li><a className="text-[#175cd3] hover:underline" href="#divider">分割线 Divider</a></li>
                    </ul>
                  </section>
                </div>
              </SectionCard>
            )}

            {activeSection === 'input' && (
              <SectionCard title="表单字段 FormField" doc="docs/design/form-field.md" description={sectionDescriptions.input}>
                <div className="space-y-5">
                  <div>
                    <p className="mb-3 text-sm font-medium">真实尺寸映射</p>
                    <div className="grid gap-3">
                      <Input size="default" defaultValue="Default input" readOnly />
                      <Input size="sm" defaultValue="SM input" readOnly />
                      <Input size="lg" defaultValue="LG input" readOnly />
                      <Input size="xl" defaultValue="XL input" readOnly />
                    </div>
                  </div>
                  <div>
                    <p className="mb-3 text-sm font-medium">真实阴影映射</p>
                    <div className="grid gap-3">
                      <Input size="xl" shadow="none" defaultValue="shadow = none" readOnly />
                      <Input size="xl" shadow="md" defaultValue="shadow = md" readOnly />
                      <Input size="xl" shadow="lg" defaultValue="shadow = lg" readOnly />
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
                    当前项目规则：普通输入框优先 <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px]">shadow=&quot;none&quot;</code>，
                    首屏重点字段再考虑 <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px]">md</code>。
                  </div>
                </div>
              </SectionCard>
            )}

            {activeSection === 'tag-chip' && (
              <SectionCard title="标签 TagChip" doc="docs/design/tag-chip.md">
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
                  <div className="rounded-xl border border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
                    这里直接跑项目里的 <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px]">TagChip</code>，
                    包括默认态、muted、可点击、可移除四种真实分支。
                  </div>
                </div>
              </SectionCard>
            )}

            {activeSection === 'tabs' && (
              <SectionCard title="切换栏 Tabs" doc="docs/design/tabs.md">
                <div className="space-y-5">
                  <div className="rounded-xl border border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
                    这里直接跑项目里的 <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px]">Tabs</code> 原语。
                    `GetAppDialog` 这种需要“切换结构复用、内容不复用”的场景，优先直接用它，不再手写按钮组。
                  </div>
                  <Tabs defaultValue="bookmarklet">
                    <TabsList>
                      <TabsTrigger value="bookmarklet">书签栏</TabsTrigger>
                      <TabsTrigger value="extension">Chrome 扩展</TabsTrigger>
                      <TabsTrigger value="pwa">手机 PWA</TabsTrigger>
                    </TabsList>
                    <TabsContent value="bookmarklet" className="rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">
                      适合放“书签栏安装步骤”这类业务内容。
                    </TabsContent>
                    <TabsContent value="extension" className="rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">
                      适合放“Chrome 扩展安装说明”这类另一套内容。
                    </TabsContent>
                    <TabsContent value="pwa" className="rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">
                      内容区继续直接写业务文案，不强行组件化。
                    </TabsContent>
                  </Tabs>
                </div>
              </SectionCard>
            )}

            {activeSection === 'more-button' && (
              <SectionCard title="更多按钮 MoreButton" doc="docs/design/more-button.md">
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-border bg-background p-4">
                    <p className="mb-3 text-sm font-medium">ItemGrid 卡片场景</p>
                    <div className="group flex flex-col gap-2 rounded-lg border border-border bg-background p-3 transition-all hover:border-primary/40">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-sm font-medium leading-snug">文章标题示例</div>
                        <MoreButton className="shrink-0" />
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-4">
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
              <SectionCard title="链接字段 LinkField" doc="docs/design/link-field.md">
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
                    底层是 shadcn <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px]">Input</code>，
                    但 `链接 *`、重复校验和错误提示位置已经是字段级 Pattern。
                  </div>
                  <div className="rounded-xl border border-border bg-background p-4">
                    <label className="mb-1 block text-sm font-medium">链接 *</label>
                    <Input placeholder="https://..." />
                    <p className="mt-2 text-xs text-destructive">该链接已存在，不能重复保存</p>
                  </div>
                </div>
              </SectionCard>
            )}

            {activeSection === 'title-field' && (
              <SectionCard title="标题字段 TitleField" doc="docs/design/title-field.md">
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
                    底层仍然是 shadcn `Input`，但“留空回退到链接标题”属于 Pocket Brain 的字段规则。
                  </div>
                  <div className="rounded-xl border border-border bg-background p-4">
                    <label className="mb-1 block text-sm font-medium">标题</label>
                    <Input placeholder="留空则使用链接作为标题" />
                    <p className="mt-2 text-xs text-muted-foreground">留空时自动回退到链接标题</p>
                  </div>
                </div>
              </SectionCard>
            )}

            {activeSection === 'folder-select-field' && (
              <SectionCard title="文件夹字段 FolderSelectField" doc="docs/design/folder-select-field.md">
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
                    底层是 shadcn `Select`，字段标题和在保存表单里的节奏是 Pattern。
                  </div>
                  <div className="rounded-xl border border-border bg-background p-4">
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
              <SectionCard title="备注字段 NoteField" doc="docs/design/note-field.md">
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
                    底层是 shadcn `Textarea`，但 `备注 + AI 总结` 的标题关系和提示位置属于字段级 Pattern。
                  </div>
                  <div className="rounded-xl border border-border bg-background p-4">
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
              <SectionCard title="标签字段 TagField" doc="docs/design/tag-field.md">
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
                    底层依赖 <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px]">Input</code> 和
                    <code className="ml-1 rounded bg-background px-1.5 py-0.5 font-mono text-[11px]">TagChip</code>，
                    但“标签标题 + AI 分类 + 已选 / 最近 / AI 推荐”的整项体验属于字段级 Pattern。
                  </div>
                  <div className="rounded-xl border border-border bg-background p-4 space-y-3">
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
              <SectionCard title="内容类型切换 ContentTypeTabs" doc="docs/design/content-type-tabs.md">
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
                    底层可复用 shadcn <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px]">Tabs</code>，
                    但 `收藏 / 灵感 / 资料` 的三态切换、等宽分布和与表单内容区的联动属于 Pattern。
                  </div>
                  <div className="rounded-xl border border-border bg-background p-4">
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
              <SectionCard title="弹窗操作 DialogActions" doc="docs/design/dialog-actions.md">
                <div className="max-w-xl rounded-2xl border border-border bg-background">
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
              <SectionCard title="侧栏 Sidebar" doc="docs/design/sidebar.md">
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
                    这里直接挂真实 <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px]">Sidebar</code> 组件，
                    用 mock 文件夹和 mock 条目跑出桌面端侧栏状态，不再用静态块模拟。
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-border bg-background">
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
              <SectionCard title="保存表单 SaveForm" doc="docs/design/save-form.md">
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
                    这里直接挂真实 <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px]">SaveForm</code> 组件，
                    保留真实 tab、标签区、重复链接检查、AI 分类入口和 footer 映射。
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-border bg-background">
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
                  <div className="rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">
                    {saveMockMessage}
                  </div>
                </div>
              </SectionCard>
            )}

            {activeSection === 'item-grid' && (
              <SectionCard title="内容列表 ItemGrid" doc="docs/design/card-pattern.md">
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
                    这里直接挂真实 <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px]">ItemGrid</code>，
                    用 mock 内容跑出 header、卡片、标签、MoreButton 和空态逻辑。
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-border bg-background">
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
              <SectionCard title="弹窗家族 DialogFamily" doc="docs/design/dialog-family.md">
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
                    这里直接挂真实弹窗组件，不再只写结构说明。按钮点击后会打开真实组件，但保存和确认仍走 mock 处理。
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={() => setAddDialogOpen(true)}>打开 AddItemDialog</Button>
                    <Button variant="outline" onClick={() => setFolderDialogOpen(true)}>打开 FolderDialog</Button>
                    <Button variant="secondary" onClick={() => setConfirmDialogOpen(true)}>打开 ConfirmDialog</Button>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">
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
              <SectionCard title="获取应用弹窗 GetAppDialog" doc="docs/design/get-app-dialog.md">
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
                    这里直接挂真实 <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px]">GetAppDialog</code>，
                    保留书签栏、Chrome 扩展、手机 PWA 三个真实 tab 和书签按钮逻辑。
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={() => setGetAppDialogOpen(true)}>打开 GetAppDialog</Button>
                    <Button variant="outline" onClick={() => setGetAppDialogOpen(false)}>关闭示例弹窗</Button>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">
                    这个组件的重点不是“长得像弹窗”，而是三套获取方式的真实切换结构和书签按钮本体。
                  </div>
                  <GetAppDialog open={getAppDialogOpen} onOpenChange={setGetAppDialogOpen} />
                </div>
              </SectionCard>
            )}

            {activeSection === 'editor-bubble-menu' && (
              <SectionCard title="编辑浮动工具栏 EditorBubbleMenu" doc="docs/design/editor-bubble-menu.md">
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
                    这里直接复用真实的 TipTap 编辑器扩展和真实的 <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px]">EditorBubbleMenu</code>，
                    不再用假按钮排一个近似工具栏。
                  </div>
                  <DemoEditorBubbleMenu />
                </div>
              </SectionCard>
            )}

            {activeSection === 'design-panel' && (
              <SectionCard title="设计调试面板 DesignPanel" doc="docs/design/design-panel.md">
                <div className="space-y-4">
                  <div className="rounded-xl border border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
                    这里直接挂真实的 <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px]">DesignPanel</code>。
                    它默认关闭，按 <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[11px]">Shift + Option + D</code>
                    就会从页面右侧弹出；因为它本来就是本地设计模式工具，不适合再画一个假面板替代。
                  </div>
                  <div className="rounded-xl border border-border bg-background p-4 text-sm text-muted-foreground">
                    当前在 localhost 下可直接触发真实面板；打开后可试 token、Inspector、复制 CSS 和保存到文件。
                  </div>
                  <DesignPanel />
                </div>
              </SectionCard>
            )}

            <div className="rounded-xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
              下一批建议继续补：<span className="font-medium text-foreground">Folder tree actions</span>、
              <span className="font-medium text-foreground"> Card / Layout React section</span>。
            </div>
          </div>
          </div>
        </main>
      </div>
    </div>
  )
}
