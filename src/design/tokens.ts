export type DesignColorGroup = '品牌' | '文字' | '功能' | '背景' | '图标'

export type DesignColorToken = {
  name: string
  value: string
  group: DesignColorGroup
  cssVar: string
  role: string
}

export type DesignRadiusToken = {
  name: string
  value: number
  unit: 'px'
  cssVar: string
  role: string
}

export type DesignShadowPreset = {
  label: string
  value: string
}

export type DesignTokens = {
  colors: Record<string, DesignColorToken>
  spacing: {
    radius: DesignRadiusToken
  }
  effects: {
    shadow: {
      name: string
      value: string
      cssVar: string
      presets: Record<string, DesignShadowPreset>
    }
  }
}

export type TokenSelector = {
  colors: string[]
  spacing: string[]
  effects: string[]
}

export const DESIGN_TOKENS: DesignTokens = {
  colors: {
    primary: {
      name: '主色',
      value: '#262626',
      group: '品牌',
      cssVar: '--primary',
      role: '主按钮、重点操作、当前品牌主色',
    },
    'primary-hover': {
      name: '主色 Hover',
      value: '#1F1F1F',
      group: '品牌',
      cssVar: '--primary-hover',
      role: '主按钮 hover、重点操作 hover',
    },
    'text-primary': {
      name: '主文字',
      value: '#262626',
      group: '文字',
      cssVar: '--text-primary',
      role: '标题、正文和主要信息',
    },
    'text-secondary': {
      name: '次要文字',
      value: '#8C8C8C',
      group: '文字',
      cssVar: '--text-secondary',
      role: '说明、辅助信息和弱强调',
    },
    'text-disabled': {
      name: '禁用文字',
      value: '#BFBFBF',
      group: '文字',
      cssVar: '--text-disabled',
      role: '禁用态和占位提示',
    },
    link: {
      name: '链接',
      value: '#2563eb',
      group: '文字',
      cssVar: '--link',
      role: '链接、帮助说明、信息提示',
    },
    danger: {
      name: '危险色',
      value: '#dc2626',
      group: '功能',
      cssVar: '--danger',
      role: '错误提示、删除操作、危险状态',
    },
    success: {
      name: '成功色',
      value: '#059669',
      group: '功能',
      cssVar: '--success',
      role: '成功提示、完成状态、正向反馈',
    },
    warning: {
      name: '警告色',
      value: '#d97706',
      group: '功能',
      cssVar: '--warning',
      role: '轻警告、注意事项、频率限制',
    },
    'bg-primary': {
      name: '页面背景',
      value: '#FAFAFA',
      group: '背景',
      cssVar: '--bg-primary',
      role: '整页外层底色',
    },
    'bg-card': {
      name: '卡片背景',
      value: '#FFFFFF',
      group: '背景',
      cssVar: '--bg-card',
      role: '正文区、白底容器',
    },
    'bg-secondary': {
      name: '交互背景',
      value: '#F2F2F2',
      group: '背景',
      cssVar: '--bg-secondary',
      role: '导航区、次级背景、轻交互底',
    },
    border: {
      name: '边框',
      value: '#E8E8E8',
      group: '功能',
      cssVar: '--border',
      role: '默认边框、分割线',
    },
    'icon-primary': {
      name: '主图标',
      value: '#262626',
      group: '图标',
      cssVar: '--icon-primary',
      role: '主要图标',
    },
    'icon-secondary': {
      name: '次级图标',
      value: '#8C8C8C',
      group: '图标',
      cssVar: '--icon-secondary',
      role: '次级图标',
    },
    'icon-disabled': {
      name: '禁用图标',
      value: '#BFBFBF',
      group: '图标',
      cssVar: '--icon-disabled',
      role: '禁用图标',
    },
  },
  spacing: {
    radius: {
      name: '基准圆角',
      value: 8,
      unit: 'px',
      cssVar: '--radius',
      role: 'Tailwind radius 档位的基准值',
    },
  },
  effects: {
    shadow: {
      name: '阴影',
      value: 'none',
      cssVar: '--card-shadow',
      presets: {
        none: { label: '无', value: 'none' },
        md: { label: '中', value: '0 4px 12px rgba(0, 0, 0, 0.08)' },
        lg: { label: '重', value: '0 8px 24px rgba(0, 0, 0, 0.12)' },
      },
    },
  },
}

export const TOKEN_SELECTORS: Record<string, TokenSelector> = {
  text: {
    colors: ['text-primary', 'text-secondary', 'text-disabled', 'primary', 'danger', 'success', 'warning', 'link'],
    spacing: [],
    effects: [],
  },
  component: {
    colors: ['primary', 'primary-hover', 'text-primary', 'text-secondary', 'bg-card', 'bg-secondary', 'border', 'danger', 'success', 'warning'],
    spacing: ['radius'],
    effects: ['shadow'],
  },
  background: {
    colors: ['bg-primary', 'bg-card', 'bg-secondary', 'border'],
    spacing: ['radius'],
    effects: [],
  },
}

export function createDesignTokensSnapshot(): DesignTokens {
  return JSON.parse(JSON.stringify(DESIGN_TOKENS)) as DesignTokens
}
