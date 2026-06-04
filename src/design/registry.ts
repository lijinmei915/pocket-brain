export type DesignSectionLayer =
  | 'overview'
  | 'token'
  | 'layout'
  | 'primitive'
  | 'pattern'
  | 'system'
  | 'page'

export type DesignSectionStatus = 'stable' | 'draft'

export type DesignSection = {
  id: string
  title: string
  label: string
  doc: string
  layer: DesignSectionLayer
  status: DesignSectionStatus
  componentPath?: string
  related?: string[]
}

export type DesignNavGroup = {
  id: string
  label: string
  items: DesignSection[]
}

export const designNavGroups: DesignNavGroup[] = [
  {
    id: 'overview',
    label: '总览',
    items: [
      {
        id: 'overview',
        title: 'Overview',
        label: '全局规范',
        doc: 'docs/DESIGN_STANDARDS.md',
        layer: 'overview',
        status: 'stable',
        related: ['component-index', 'tokens-overview'],
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
        layer: 'token',
        status: 'stable',
        related: ['tokens-overview'],
      },
      {
        id: 'shadow-tokens',
        title: 'Shadow',
        label: '阴影',
        doc: 'docs/design/tokens/shadow.md',
        layer: 'token',
        status: 'stable',
        related: ['tokens-overview'],
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
        layer: 'layout',
        status: 'stable',
        related: ['tokens-overview', 'component-index'],
      },
      {
        id: 'spacing-tokens',
        title: 'Space',
        label: '间距',
        doc: 'docs/design/tokens/space.md',
        layer: 'token',
        status: 'stable',
        related: ['tokens-overview', 'radius-tokens'],
      },
      {
        id: 'divider',
        title: 'Divider',
        label: '分割线',
        doc: 'docs/design/layout.md',
        layer: 'layout',
        status: 'stable',
        related: ['layout'],
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
        layer: 'primitive',
        status: 'stable',
        componentPath: 'src/components/ui/button.jsx',
        related: ['color-tokens', 'spacing-tokens', 'radius-tokens'],
      },
      {
        id: 'tag-chip',
        title: 'TagChip',
        label: '标签',
        doc: 'docs/design/tag-chip.md',
        layer: 'primitive',
        status: 'stable',
        componentPath: 'src/components/ui/tag-chip.tsx',
        related: ['tags-guide', 'color-tokens'],
      },
      {
        id: 'tabs',
        title: 'Tabs',
        label: '切换栏',
        doc: 'docs/design/tabs.md',
        layer: 'primitive',
        status: 'stable',
        componentPath: 'src/components/ui/tabs.tsx',
        related: ['content-type-tabs'],
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
        layer: 'pattern',
        status: 'stable',
        componentPath: 'src/components/ui/DialogShell.tsx',
        related: ['dialog-actions', 'dialogs'],
      },
      {
        id: 'panels',
        title: 'Panels',
        label: '面板',
        doc: 'docs/design/panels.md',
        layer: 'pattern',
        status: 'stable',
      },
      {
        id: 'sidebar',
        title: 'Sidebar',
        label: '侧栏',
        doc: 'docs/design/sidebar.md',
        layer: 'pattern',
        status: 'stable',
        componentPath: 'src/components/layout/Sidebar.tsx',
        related: ['color-tokens', 'more-button'],
      },
      {
        id: 'field-patterns',
        title: 'FieldPatterns',
        label: '字段总则',
        doc: 'docs/design/field-patterns.md',
        layer: 'pattern',
        status: 'stable',
        related: ['input', 'save-form'],
      },
      {
        id: 'input',
        title: 'FormField',
        label: '表单字段',
        doc: 'docs/design/form-field.md',
        layer: 'pattern',
        status: 'stable',
        related: ['field-patterns'],
      },
      {
        id: 'more-button',
        title: 'MoreButton',
        label: '更多按钮',
        doc: 'docs/design/more-button.md',
        layer: 'pattern',
        status: 'stable',
        componentPath: 'src/components/ui/MoreButton.tsx',
      },
      {
        id: 'save-form',
        title: 'SaveForm',
        label: '保存表单',
        doc: 'docs/design/save-form.md',
        layer: 'pattern',
        status: 'stable',
        componentPath: 'src/components/patterns/SaveForm.tsx',
        related: ['field-patterns', 'ai-actions', 'tags-guide'],
      },
      {
        id: 'item-grid',
        title: 'ItemGrid',
        label: '内容列表',
        doc: 'docs/design/card-pattern.md',
        layer: 'pattern',
        status: 'stable',
        componentPath: 'src/components/patterns/ItemGrid.tsx',
      },
      {
        id: 'knowledge-process-dialog',
        title: 'KnowledgeProcessDialog',
        label: '加工入库',
        doc: 'docs/design/knowledge-process-dialog.md',
        layer: 'pattern',
        status: 'draft',
        componentPath: 'src/components/patterns/KnowledgeProcessDialog.tsx',
        related: ['dialog-shell', 'ai-actions', 'tags-guide'],
      },
      {
        id: 'link-field',
        title: 'LinkField',
        label: '链接字段',
        doc: 'docs/design/link-field.md',
        layer: 'pattern',
        status: 'stable',
        related: ['field-patterns', 'save-form'],
      },
      {
        id: 'title-field',
        title: 'TitleField',
        label: '标题字段',
        doc: 'docs/design/title-field.md',
        layer: 'pattern',
        status: 'stable',
        related: ['field-patterns', 'save-form'],
      },
      {
        id: 'folder-select-field',
        title: 'FolderSelectField',
        label: '文件夹字段',
        doc: 'docs/design/folder-select-field.md',
        layer: 'pattern',
        status: 'stable',
        related: ['field-patterns', 'save-form'],
      },
      {
        id: 'note-field',
        title: 'NoteField',
        label: '备注字段',
        doc: 'docs/design/note-field.md',
        layer: 'pattern',
        status: 'stable',
        related: ['field-patterns', 'ai-actions', 'save-form'],
      },
      {
        id: 'tag-field',
        title: 'TagField',
        label: '标签字段',
        doc: 'docs/design/tag-field.md',
        layer: 'pattern',
        status: 'stable',
        related: ['tags-guide', 'ai-actions', 'save-form'],
      },
      {
        id: 'content-type-tabs',
        title: 'ContentTypeTabs',
        label: '内容类型切换',
        doc: 'docs/design/content-type-tabs.md',
        layer: 'pattern',
        status: 'stable',
        related: ['tabs', 'save-form'],
      },
      {
        id: 'dialog-actions',
        title: 'DialogActions',
        label: '弹窗操作',
        doc: 'docs/design/dialog-actions.md',
        layer: 'pattern',
        status: 'stable',
        componentPath: 'src/components/ui/DialogActions.tsx',
        related: ['dialog-shell', 'dialogs'],
      },
      {
        id: 'get-app-dialog',
        title: 'GetAppDialog',
        label: '获取应用弹窗',
        doc: 'docs/design/get-app-dialog.md',
        layer: 'pattern',
        status: 'stable',
        componentPath: 'src/components/patterns/GetAppDialog.tsx',
        related: ['dialog-shell', 'tabs'],
      },
      {
        id: 'editor-bubble-menu',
        title: 'EditorBubbleMenu',
        label: '编辑浮动工具栏',
        doc: 'docs/design/editor-bubble-menu.md',
        layer: 'pattern',
        status: 'stable',
        componentPath: 'src/components/patterns/EditorBubbleMenu.tsx',
      },
      {
        id: 'design-panel',
        title: 'DesignPanel',
        label: '设计调试面板',
        doc: 'docs/design/design-panel.md',
        layer: 'pattern',
        status: 'stable',
        componentPath: 'src/components/patterns/DesignPanel.tsx',
        related: ['tokens-overview', 'color-tokens', 'shadow-tokens'],
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
        layer: 'system',
        status: 'stable',
        related: ['save-form', 'tag-field', 'note-field'],
      },
      {
        id: 'tags-guide',
        title: 'Tags',
        label: '标签系统',
        doc: 'docs/design/tags.md',
        layer: 'system',
        status: 'stable',
        related: ['tag-chip', 'tag-field'],
      },
      {
        id: 'dialogs',
        title: 'DialogFamily',
        label: '弹窗家族',
        doc: 'docs/design/dialog-family.md',
        layer: 'system',
        status: 'stable',
        related: ['dialog-shell', 'dialog-actions'],
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
        layer: 'page',
        status: 'stable',
        componentPath: 'src/pages/LoginPage.tsx',
      },
    ],
  },
]

export const designSections = designNavGroups.flatMap(group => group.items)

export const mergedDesignDocs = [
  {
    doc: 'docs/design/README.md',
    mergedInto: 'overview',
    reason: '设计文档写法和索引入口并入总览说明。',
  },
  {
    doc: 'docs/design/component-index.md',
    mergedInto: 'overview',
    reason: '组件分层索引并入总览和注册表。',
  },
  {
    doc: 'docs/design/tokens/README.md',
    mergedInto: 'color-tokens',
    reason: 'Token 总入口并入 Tokens 组。',
  },
  {
    doc: 'docs/design/tokens/radius.md',
    mergedInto: 'spacing-tokens',
    reason: '圆角规则并入布局和间距展示。',
  },
]

export const designDocuments = [
  ...designSections.map(section => ({
    doc: section.doc,
    sectionId: section.id,
    status: 'standalone' as const,
  })),
  ...mergedDesignDocs.map(doc => ({
    ...doc,
    status: 'merged' as const,
  })),
]

export const designSectionDescriptions: Record<string, string> = {
  overview: '设计规范总入口、阅读顺序和统一写法都从这里开始看。',
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
  'knowledge-process-dialog': 'KnowledgeProcessDialog 负责保存后的人为加工确认与知识入库。',
  'link-field': 'LinkField 负责链接输入、校验和重复处理。',
  'title-field': 'TitleField 负责主标题输入和层级。',
  'folder-select-field': 'FolderSelectField 负责文件夹选择的结构和状态。',
  'note-field': 'NoteField 负责保存阶段的用户备注输入。',
  'tag-field': 'TagField 负责已选标签、最近标签和手动输入。',
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
