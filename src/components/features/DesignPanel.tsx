import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Paintbrush, RotateCcw, Save, Copy, Check, MousePointer, Square, ChevronDown } from 'lucide-react'

// ── 结构化设计 Token ────────────────────────────────────────────────────────
type DesignTokens = typeof DESIGN_TOKENS
type PartialTokens = Partial<DesignTokens>

const DESIGN_TOKENS = {
  colors: {
    primary:          { name: '主色',     value: '#333333',  group: '品牌' },
    'text-primary':   { name: '主文字',   value: '#262626',  group: '文字' },
    'text-secondary': { name: '次要文字', value: '#8C8C8C',  group: '文字' },
    'bg-primary':     { name: '页面背景', value: '#FAFAFA',  group: '背景' },
    'bg-card':        { name: '卡片背景', value: '#FFFFFF',  group: '背景' },
    'bg-secondary':   { name: '交互背景', value: '#F2F2F2',  group: '背景' },
    border:           { name: '边框',     value: '#E8E8E8',  group: '功能' },
    danger:           { name: '危险色',   value: '#dc2626',  group: '功能' },
  },
  spacing: {
    radius: { name: '圆角', value: 8 },
  },
  effects: {
    shadow: {
      name: '阴影',
      value: 'none',
      presets: {
        none: { label: '无', value: 'none' },
        sm: { label: '轻', value: '0 1px 3px 0 rgb(0 0 0 / 0.08)' },
        md: { label: '中', value: '0 4px 12px -2px rgb(0 0 0 / 0.12)' },
        lg: { label: '重', value: '0 10px 24px -4px rgb(0 0 0 / 0.16)' },
      },
    },
  },
}

// Token 使用上下文
const TOKEN_SELECTORS = {
  text: {
    colors: ['text-primary', 'text-secondary', 'primary', 'danger'],
    spacing: [],
    effects: [],
  },
  component: {
    colors: ['primary', 'text-primary', 'bg-card', 'border', 'danger'],
    spacing: ['radius'],
    effects: ['shadow'],
  },
  background: {
    colors: ['bg-primary', 'bg-card', 'border'],
    spacing: ['radius'],
    effects: [],
  },
}

// ── 工具函数 ───────────────────────────────────────────────────────────────
function isDesignerMode() {
  const isLocal = typeof window !== 'undefined' &&
    ['localhost', '127.0.0.1'].includes(window.location.hostname)
  if (isLocal) return true
  try { return localStorage.getItem('pb-designer') === '1' } catch { return false }
}

function applyTokens(designTokens: DesignTokens) {
  const s = document.documentElement.style
  const { colors, spacing, effects } = designTokens

  // 设置 Layer 1 token，shadcn 别名在 CSS 中自动跟随
  for (const [key, token] of Object.entries(colors)) {
    s.setProperty(`--${key}`, token.value)
  }

  if (spacing.radius) {
    s.setProperty('--radius', `${spacing.radius.value / 16}rem`)
  }

  if (effects.shadow) {
    s.setProperty('--card-shadow', effects.shadow.presets[effects.shadow.value]?.value ?? 'none')
  }
}

function resetTokens() {
  const props = [
    ...Object.keys(DESIGN_TOKENS.colors).map(k => `--${k}`),
    '--radius',
    '--card-shadow',
  ]
  props.forEach(p => document.documentElement.style.removeProperty(p))
}

function buildCSS(designTokens: DesignTokens) {
  const { colors, spacing, effects } = designTokens
  let css = `:root {\n`

  for (const [key, token] of Object.entries(colors)) {
    css += `  --${key}: ${token.value};\n`
  }

  if (spacing.radius) {
    css += `  --radius: ${spacing.radius.value / 16}rem;\n`
  }

  if (effects.shadow) {
    const shadowVal = effects.shadow.presets[effects.shadow.value]?.value ?? 'none'
    css += `  --card-shadow: ${shadowVal};\n`
  }

  css += `}`
  return css
}

function rgbToHex(rgb) {
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!m) return null
  return '#' + [m[1], m[2], m[3]].map(n => (+n).toString(16).padStart(2, '0')).join('')
}

function detectToken(computedColor: string, designTokens: DesignTokens) {
  const hex = rgbToHex(computedColor)?.toLowerCase()
  if (!hex) return null
  const map = Object.fromEntries(
    Object.entries(designTokens.colors)
      .filter(([, v]) => v.value.startsWith('#'))
      .map(([k, v]) => [v.value.toLowerCase(), k])
  )
  return map[hex] || null
}

function getRelevantTokens(elementType: string, designTokens: DesignTokens): PartialTokens {
  const selector = TOKEN_SELECTORS[elementType] || TOKEN_SELECTORS.component
  const result: PartialTokens = {}

  for (const [group, keys] of Object.entries(selector) as [string, string[]][]) {
    result[group] = {}
    if (designTokens[group]) {
      for (const key of keys) {
        if (designTokens[group][key]) {
          result[group][key] = designTokens[group][key]
        }
      }
    }
  }

  return result
}

function detectElementType(el) {
  const tag = el.tagName.toLowerCase()
  const text = el.textContent?.trim()

  if (['p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'label'].includes(tag) || (text && text.length < 100 && !el.querySelector('*'))) {
    return 'text'
  }

  if (['body', 'main', 'section', 'article'].includes(tag) || el.classList.contains('bg-')) {
    return 'background'
  }

  return 'component'
}

function readElStyles(el) {
  const cs = window.getComputedStyle(el)
  return {
    color: cs.color,
    backgroundColor: cs.backgroundColor,
    fontSize: cs.fontSize,
    fontWeight: cs.fontWeight,
    borderRadius: cs.borderRadius,
    boxShadow: cs.boxShadow,
    paddingTop: cs.paddingTop,
    paddingRight: cs.paddingRight,
    paddingBottom: cs.paddingBottom,
    paddingLeft: cs.paddingLeft,
    textContent: el.textContent || '',
  }
}

function elBreadcrumb(el) {
  const tag = el.tagName.toLowerCase()
  const cls = [...el.classList]
    .filter(c => !c.startsWith('group') && c.length < 20)
    .slice(0, 3)
    .join(' ')
  return cls ? `${tag}.${cls.split(' ')[0]}` : tag
}

function HighlightBox({ rect, selected }) {
  if (!rect) return null
  return (
    <div
      style={{
        position: 'fixed',
        top: rect.top - 2,
        left: rect.left - 2,
        width: rect.width + 4,
        height: rect.height + 4,
        border: `2px solid ${selected ? '#00B96B' : '#3B82F6'}`,
        borderRadius: 4,
        background: selected ? 'rgba(0,185,107,0.06)' : 'rgba(59,130,246,0.06)',
        pointerEvents: 'none',
        zIndex: 58,
        transition: selected ? 'none' : 'all 80ms',
      }}
    />
  )
}

function ColorRow({ label, colorKey, designTokens, onChange }) {
  const value = designTokens.colors[colorKey]?.value
  return (
    <div className="flex items-center gap-2 py-1">
      <label
        className="relative w-7 h-7 rounded cursor-pointer shrink-0 border border-border overflow-hidden"
        style={{ background: value }}
      >
        <input
          type="color"
          value={value}
          onChange={e => onChange('colors', colorKey, e.target.value)}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
        />
      </label>
      <span className="flex-1 text-xs">{label}</span>
      <input
        type="text"
        value={value}
        onChange={e => {
          const v = e.target.value
          if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange('colors', colorKey, v)
        }}
        className="w-20 text-xs font-mono border border-border rounded px-1.5 py-0.5 bg-background text-right"
      />
    </div>
  )
}

function Section({ title, children }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="space-y-1">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 w-full hover:text-foreground transition-colors"
      >
        <ChevronDown size={12} style={{ transform: open ? 'rotate(0)' : 'rotate(-90deg)', transition: 'transform 150ms' }} />
        {title}
      </button>
      {open && <div className="space-y-2 pl-2">{children}</div>}
    </div>
  )
}

function TokensTab({ designTokens, onChange, onSave, onCopy, onReset, saveStatus }) {
  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        <Section title="颜色">
          {(() => {
            const entries = Object.entries(designTokens.colors) as [string, { name: string; value: string; group: string }][]
            const groups = [...new Set(entries.map(([, t]) => t.group))]
            return groups.map(group => (
              <div key={group} className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide pt-1">{group}</p>
                {entries.filter(([, t]) => t.group === group).map(([key, token]) => (
                  <ColorRow key={key} label={token.name} colorKey={key} designTokens={designTokens} onChange={onChange} />
                ))}
              </div>
            ))
          })()}
        </Section>

        <Section title="圆角">
          <div className="flex items-center gap-3 py-1">
            <input
              type="range"
              min={0}
              max={20}
              step={1}
              value={designTokens.spacing.radius.value}
              onChange={e => onChange('spacing', 'radius', { ...designTokens.spacing.radius, value: Number(e.target.value) })}
              className="flex-1 accent-primary"
            />
            <span className="text-xs font-mono w-10 text-right">{designTokens.spacing.radius.value}px</span>
          </div>
        </Section>

        <Section title="阴影">
          <div className="grid grid-cols-4 gap-1.5">
            {(Object.entries(designTokens.effects.shadow.presets) as [string, { label: string; value: string }][]).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => onChange('effects', 'shadow', { ...designTokens.effects.shadow, value: key })}
                className="py-3 text-[11px] border rounded transition-colors"
                style={{
                  borderColor: designTokens.effects.shadow.value === key ? '#333333' : '#E8E8E8',
                  background: designTokens.effects.shadow.value === key ? '#33333310' : '#fff',
                  boxShadow: preset.value,
                }}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </Section>
      </div>

      <div className="px-4 py-3 border-t border-border space-y-2 shrink-0">
        {import.meta.env.DEV && (
          <button
            onClick={onSave}
            disabled={saveStatus === 'saving'}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded transition-colors"
            style={{
              borderRadius: `${designTokens.spacing.radius.value}px`,
              background: saveStatus === 'saved' ? '#00B96B20' : designTokens.colors.primary.value,
              color: saveStatus === 'saved' ? '#00B96B' : '#ffffff',
              opacity: saveStatus === 'saving' ? 0.7 : 1,
            }}
          >
            {saveStatus === 'saving' ? '保存中...' : saveStatus === 'saved' ? <><Check size={12} /> 已写入文件</> : saveStatus === 'error' ? '保存失败，请重试' : <><Save size={12} /> 保存到文件</>}
          </button>
        )}
        <div className="flex gap-2">
          <button
            onClick={onCopy}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium border border-border rounded hover:bg-muted transition-colors"
          >
            {saveStatus === 'copied' ? <><Check size={12} /> 已复制</> : <><Copy size={12} /> 复制 CSS</>}
          </button>
          <button onClick={onReset} className="flex items-center justify-center px-3 py-1.5 text-xs text-muted-foreground border border-border rounded hover:bg-muted transition-colors">
            <RotateCcw size={12} />
          </button>
        </div>
      </div>
    </>
  )
}

function InspectorTab({ picking, onStartPick, onStopPick, selectedEl, elStyles, setElStyles, pendingChanges, setPendingChanges, designTokens, onClearOverrides }) {
  const [colorMode, setColorMode] = useState('hex')
  const elementType = selectedEl ? detectElementType(selectedEl) : 'component'
  const relevantTokens: PartialTokens = selectedEl ? getRelevantTokens(elementType, designTokens) : {}

  if (!selectedEl) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <MousePointer size={20} className="text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium">选择页面元素</p>
          <p className="text-xs text-muted-foreground mt-1">点击下方按钮后，在页面上单击任意元素</p>
        </div>
        <button
          onClick={onStartPick}
          className="flex items-center gap-2 px-4 py-2 rounded text-sm font-medium text-white hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          style={{ background: designTokens.colors.primary.value }}
        >
          <MousePointer size={14} /> 开始选择
        </button>
      </div>
    )
  }

  const hexColor = rgbToHex(elStyles.color)
  const colorToken = hexColor ? detectToken(elStyles.color, designTokens) : null
  const fontWeightNum = parseInt(elStyles.fontWeight) || 400
  const fontSizeVal = parseFloat(elStyles.fontSize) || 14
  const radiusVal = parseFloat(elStyles.borderRadius) || 0

  const textContent = pendingChanges.textContent !== undefined ? pendingChanges.textContent : (selectedEl?.textContent ?? '')
  const color = pendingChanges.color !== undefined ? pendingChanges.color : hexColor
  const fontSize = pendingChanges.fontSize !== undefined ? pendingChanges.fontSize : fontSizeVal
  const fontWeight = pendingChanges.fontWeight !== undefined ? pendingChanges.fontWeight : fontWeightNum
  const radius = pendingChanges.radius !== undefined ? pendingChanges.radius : radiusVal

  function updatePending(key: string, value: unknown) {
    setPendingChanges(prev => ({ ...prev, [key]: value }))
    // 实时预览：直接写入 DOM，不等保存
    if (!selectedEl) return
    if (key === 'color') selectedEl.style.setProperty('color', value as string)
    // colorToken 只记录选中状态，颜色由 'color' key 写入，跳过
    else if (key === 'fontSize') selectedEl.style.setProperty('font-size', value + 'px')
    else if (key === 'fontWeight') {
      const w = String(value)
      ;[selectedEl, ...Array.from(selectedEl.querySelectorAll('*'))].forEach(el => {
        (el as HTMLElement).style.setProperty('font-weight', w)
      })
    }
    else if (key === 'radius') selectedEl.style.setProperty('border-radius', value + 'px')
    else if (key === 'textContent') (selectedEl as HTMLElement).textContent = value as string
  }

  function applyAllChanges() {
    if (!selectedEl) return
    for (const [key, value] of Object.entries(pendingChanges)) {
      if (key === 'textContent') {
        selectedEl.textContent = value
      } else if (key === 'color') {
        selectedEl.style.setProperty('color', value)
      } else if (key === 'fontSize') {
        selectedEl.style.setProperty('font-size', value + 'px')
      } else if (key === 'fontWeight') {
        const w = String(value)
        ;[selectedEl, ...Array.from(selectedEl.querySelectorAll('*'))].forEach(el => {
          (el as HTMLElement).style.setProperty('font-weight', w)
        })
      } else if (key === 'radius') {
        selectedEl.style.setProperty('border-radius', value + 'px')
      }
    }
    setPendingChanges({})
  }

  const hasChanges = Object.keys(pendingChanges).length > 0

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-4 pt-3 pb-2 border-b border-border space-y-2 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <Square size={11} className="text-primary shrink-0" />
            <code className="text-[11px] text-muted-foreground truncate">{elBreadcrumb(selectedEl)}</code>
          </div>
          <button onClick={onStartPick} className="shrink-0 text-[11px] text-primary hover:underline">
            重新选
          </button>
        </div>
        {picking && (
          <div className="flex items-center justify-between text-[11px] rounded px-2 py-1" style={{ background: designTokens.colors.primary.value + '20', color: designTokens.colors.primary.value }}>
            <span>移动鼠标选择新元素…</span>
            <button onClick={onStopPick} className="hover:underline">
              取消
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        <Section title="文字内容">
          <textarea
            value={textContent}
            onChange={e => updatePending('textContent', e.target.value)}
            className="w-full text-xs border border-border rounded px-2 py-1.5 bg-background resize-none"
            rows={3}
            placeholder="清空则删除所有文字内容"
          />
        </Section>

        {relevantTokens.colors && Object.keys(relevantTokens.colors).length > 0 && (
          <Section title="文字颜色">
            <div className="flex gap-1 mb-2">
              {['token', 'hex'].map(m => (
                <button
                  key={m}
                  onClick={() => setColorMode(m)}
                  className="flex-1 text-[11px] py-1 border rounded transition-colors"
                  style={{
                    borderColor: colorMode === m ? designTokens.colors.primary.value : '#E8E8E8',
                    background: colorMode === m ? designTokens.colors.primary.value + '10' : '',
                    color: colorMode === m ? designTokens.colors.primary.value : '#8C8C8C',
                  }}
                >
                  {m === 'token' ? '用 Token' : '自定义色'}
                </button>
              ))}
            </div>

            {colorMode === 'token' ? (
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(relevantTokens.colors).map(([key, token]) => (
                  <button
                    key={key}
                    onClick={() => {
                      updatePending('colorToken', key)
                      updatePending('color', token.value)
                    }}
                    className="flex items-center gap-1.5 text-[11px] border rounded px-2 py-1.5 transition-colors text-left"
                    style={{
                      borderColor: (pendingChanges.colorToken || colorToken) === key ? designTokens.colors.primary.value : '#E8E8E8',
                      background: (pendingChanges.colorToken || colorToken) === key ? designTokens.colors.primary.value + '10' : '#fff',
                    }}
                  >
                    <div className="w-3 h-3 rounded shrink-0" style={{ background: token.value }} />
                    <span className="truncate">{token.name}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <label className="relative w-8 h-8 rounded shrink-0 border border-border overflow-hidden cursor-pointer" style={{ background: color || '#000' }}>
                  <input
                    type="color"
                    value={color || '#000000'}
                    onChange={e => updatePending('color', e.target.value)}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  />
                </label>
                <input
                  type="text"
                  value={color || ''}
                  onChange={e => {
                    const v = e.target.value
                    if (/^#[0-9a-fA-F]{0,6}$/.test(v)) updatePending('color', v)
                  }}
                  className="flex-1 text-xs font-mono border border-border rounded px-2 py-1 bg-background"
                  placeholder="#000000"
                />
              </div>
            )}
          </Section>
        )}

        <Section title="文字样式">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs w-12 shrink-0">字号</span>
              <input
                type="number"
                min={8}
                max={72}
                value={Math.round(fontSize)}
                onChange={e => updatePending('fontSize', Number(e.target.value))}
                className="w-16 text-xs font-mono border border-border rounded px-2 py-0.5 bg-background"
              />
              <span className="text-xs text-muted-foreground">px</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs w-12 shrink-0">字重</span>
              <select
                value={fontWeight}
                onChange={e => updatePending('fontWeight', Number(e.target.value))}
                className="flex-1 text-xs border border-border rounded px-2 py-0.5 bg-background"
              >
                {[300, 400, 500, 600, 700, 800].map(w => (
                  <option key={w} value={w}>
                    {w} {w === 400 ? '(正常)' : w === 700 ? '(粗体)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Section>

        {relevantTokens.spacing && Object.keys(relevantTokens.spacing).length > 0 && (
          <Section title="圆角">
            <div className="flex items-center gap-3 py-1">
              <input
                type="range"
                min={0}
                max={32}
                step={1}
                value={Math.round(radius)}
                onChange={e => updatePending('radius', Number(e.target.value))}
                className="flex-1 accent-primary"
              />
              <span className="text-xs font-mono w-10 text-right">{Math.round(radius)}px</span>
            </div>
          </Section>
        )}

        <Section title="内边距（只读）">
          <div className="grid grid-cols-4 gap-1 text-center">
            {['top', 'right', 'bottom', 'left'].map(side => (
              <div key={side} className="border border-border rounded p-1.5">
                <div className="text-[10px] text-muted-foreground">{side === 'top' ? '上' : side === 'right' ? '右' : side === 'bottom' ? '下' : '左'}</div>
                <div className="text-xs font-mono">{parseFloat(elStyles[`padding${side.charAt(0).toUpperCase() + side.slice(1)}`]) || 0}</div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <div className="px-4 py-3 border-t border-border space-y-2 shrink-0">
        {hasChanges && (
          <button onClick={applyAllChanges} className="w-full py-1.5 text-xs font-medium rounded transition-colors" style={{ background: designTokens.colors.primary.value, color: '#ffffff' }}>
            保存改动
          </button>
        )}
        <button onClick={onClearOverrides} className="w-full py-1.5 text-xs text-muted-foreground border border-border rounded hover:bg-muted transition-colors">
          重置
        </button>
        <p className="text-[10px] text-muted-foreground text-center">改动仅为预览，点"保存改动"才会生效</p>
      </div>
    </div>
  )
}

function readCurrentTokens(): typeof DESIGN_TOKENS {
  const s = document.documentElement.style
  const cs = window.getComputedStyle(document.documentElement)
  const get = (prop: string) => {
    const val = s.getPropertyValue(prop).trim() || cs.getPropertyValue(prop).trim()
    return val || null
  }

  const tokens = JSON.parse(JSON.stringify(DESIGN_TOKENS)) as typeof DESIGN_TOKENS

  for (const [key] of Object.entries(tokens.colors)) {
    const cssVal = get(`--${key}`)
    if (cssVal) tokens.colors[key].value = cssVal
  }

  if (tokens.spacing.radius) {
    const radiusRem = get('--radius')
    if (radiusRem) {
      tokens.spacing.radius.value = Math.round(parseFloat(radiusRem) * 16)
    }
  }

  if (tokens.effects.shadow) {
    const shadowVal = get('--card-shadow')
    if (shadowVal) {
      let found = false
      for (const [key, preset] of Object.entries(tokens.effects.shadow.presets)) {
        if (preset.value === shadowVal) {
          tokens.effects.shadow.value = key
          found = true
          break
        }
      }
      if (!found) tokens.effects.shadow.value = 'none'
    }
  }

  return tokens
}

export default function DesignPanel() {
  const [open, setOpen] = useState(true)
  const [tab, setTab] = useState('tokens')
  const [designTokens, setDesignTokens] = useState(() => readCurrentTokens())
  const [saveStatus, setSaveStatus] = useState('idle')

  const [picking, setPicking] = useState(false)
  const [hoverRect, setHoverRect] = useState(null)
  const [selectedEl, setSelectedEl] = useState(null)
  const [selectedRect, setSelectedRect] = useState(null)
  const [elStyles, setElStyles] = useState(null)
  const [pendingChanges, setPendingChanges] = useState({})

  const panelRef = useRef(null)
  const designer = isDesignerMode()

  useEffect(() => {
    if (!designer) return
    function onKey(e) {
      if (e.shiftKey && e.altKey && e.code === 'KeyD') {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape' && picking) stopPicking()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [designer, picking])

  useEffect(() => {
    if (!designer) return
    applyTokens(designTokens)
  }, [designTokens, designer])

  useEffect(() => {
    if (!picking) {
      setHoverRect(null)
      document.body.style.cursor = ''
      return
    }
    document.body.style.cursor = 'crosshair'

    function isPanel(el) {
      return !!el?.closest('[data-design-panel]')
    }

    function onMove(e) {
      if (isPanel(e.target)) {
        setHoverRect(null)
        return
      }
      const rect = e.target.getBoundingClientRect()
      setHoverRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height })
    }

    function onClick(e) {
      if (isPanel(e.target)) return
      e.preventDefault()
      e.stopPropagation()
      const el = e.target
      setSelectedEl(el)
      const rect = el.getBoundingClientRect()
      setSelectedRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height })
      setElStyles(readElStyles(el))
      setPendingChanges({})
      setPicking(false)
      setTab('inspector')
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('click', onClick, true)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('click', onClick, true)
      document.body.style.cursor = ''
    }
  }, [picking])

  if (!designer) return null

  function stopPicking() {
    setPicking(false)
    setHoverRect(null)
  }

  function setToken(group, key, value) {
    setDesignTokens(prev => ({
      ...prev,
      [group]: {
        ...prev[group],
        [key]: { ...prev[group][key], value },
      },
    }))
  }

  function handleClearOverrides() {
    if (!selectedEl) return
    const props = ['color', 'background-color', 'font-size', 'font-weight', 'border-radius', 'padding']
    ;[selectedEl, ...Array.from(selectedEl.querySelectorAll('*'))].forEach(el => {
      props.forEach(p => (el as HTMLElement).style.removeProperty(p))
    })
    setElStyles(readElStyles(selectedEl))
  }

  async function handleSave() {
    setSaveStatus('saving')
    try {
      const res = await fetch('/__design/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(designTokens),
      })
      if (!res.ok) throw new Error()
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2500)
    } catch {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 2500)
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(buildCSS(designTokens))
    setSaveStatus('copied')
    setTimeout(() => setSaveStatus('idle'), 2000)
  }

  function handleReset() {
    setDesignTokens(readCurrentTokens())
    resetTokens()
  }

  return (
    <>
      {open && <div data-design-panel className="fixed top-0 inset-x-0 h-0.5 z-[70] pointer-events-none" style={{ background: designTokens.colors.primary.value }} />}

      {picking && <HighlightBox rect={hoverRect} selected={false} />}
      {!picking && selectedEl && <HighlightBox rect={selectedRect} selected />}

      <button
        data-design-panel
        onClick={() => setOpen(o => !o)}
        title="设计模式 (Shift+Option+D)"
        className="fixed bottom-5 right-5 z-[60] w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110"
        style={{ background: designTokens.colors.primary.value, color: '#fff' }}
      >
        <Paintbrush size={16} />
      </button>

      {open && !picking && (
        <div data-design-panel className="fixed inset-0 z-[59] bg-black/10" onClick={() => { setOpen(false); stopPicking() }} />
      )}

      <div
        ref={panelRef}
        data-design-panel="true"
        className="fixed top-0 right-0 h-full w-72 bg-background border-l border-border shadow-2xl z-[60] flex flex-col transition-transform duration-200"
        style={{ transform: open ? 'translateX(0)' : 'translateX(100%)' }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Paintbrush size={14} style={{ color: designTokens.colors.primary.value }} />
            <span className="font-semibold text-sm">设计模式</span>
          </div>
          <button onClick={() => { setOpen(false); stopPicking() }} className="p-1 rounded hover:bg-muted text-muted-foreground">
            <X size={15} />
          </button>
        </div>

        <div className="flex border-b border-border shrink-0">
          {[['tokens', '变量'], ['inspector', '元素']].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="flex-1 py-2 text-xs font-medium transition-colors"
              style={{
                color: tab === id ? designTokens.colors.primary.value : '#8C8C8C',
                borderBottom: tab === id ? `2px solid ${designTokens.colors.primary.value}` : '2px solid transparent',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'tokens' ? (
          <TokensTab designTokens={designTokens} onChange={setToken} onSave={handleSave} onCopy={handleCopy} onReset={handleReset} saveStatus={saveStatus} />
        ) : (
          <InspectorTab
            picking={picking}
            onStartPick={() => setPicking(true)}
            onStopPick={stopPicking}
            selectedEl={selectedEl}
            elStyles={elStyles}
            setElStyles={setElStyles}
            pendingChanges={pendingChanges}
            setPendingChanges={setPendingChanges}
            designTokens={designTokens}
            onClearOverrides={handleClearOverrides}
          />
        )}
      </div>
    </>
  )
}
