import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import fs from 'fs'

// ── 设计 token 同步插件（仅 dev 模式生效）──
function designTokenPlugin() {
  const root = path.resolve(__dirname)

  function replaceInRootBlock(css, prop, value) {
    // 只在第一个 :root { } 块内替换，避免动到 .dark 块
    const start = css.indexOf(':root {')
    if (start === -1) return css
    let depth = 0, end = start
    for (let i = start; i < css.length; i++) {
      if (css[i] === '{') depth++
      if (css[i] === '}') { depth--; if (depth === 0) { end = i + 1; break } }
    }
    const before  = css.slice(0, start)
    let   block   = css.slice(start, end)
    const after   = css.slice(end)
    const escaped = prop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    block = block.replace(new RegExp(`(${escaped}:\\s*)[^;\\n]*(;)`), `$1${value}$2`)
    return before + block + after
  }

  function syncIndexCSS(designTokens) {
    const file = path.join(root, 'src/styles/tokens.css')
    let css = fs.readFileSync(file, 'utf8')

    const { colors, spacing, effects } = designTokens
    const map = [
      ['--primary',        colors.primary.value],
      ['--text-primary',   colors['text-primary'].value],
      ['--text-secondary', colors['text-secondary'].value],
      ['--bg-primary',     colors['bg-primary'].value],
      ['--bg-card',        colors['bg-card'].value],
      ['--bg-secondary',   colors['bg-secondary'].value],
      ['--border',         colors.border.value],
      ['--danger',         colors.danger.value],
      ['--radius',         `${spacing.radius.value / 16}rem`],
      ['--card-shadow',    effects.shadow.presets[effects.shadow.value]?.value ?? 'none'],
    ]
    for (const [prop, val] of map) css = replaceInRootBlock(css, prop, val)
    fs.writeFileSync(file, css)
  }

  function syncPopupHTML(designTokens) {
    const file = path.join(root, '../extension/popup.html')
    if (!fs.existsSync(file)) return
    let html = fs.readFileSync(file, 'utf8')
    const { colors, spacing } = designTokens
    const newRoot = `    :root {
      --primary:        ${colors.primary.value};
      --text-primary:   ${colors['text-primary'].value};
      --text-secondary: ${colors['text-secondary'].value};
      --bg-primary:     ${colors['bg-primary'].value};
      --bg-card:        ${colors['bg-card'].value};
      --border:         ${colors.border.value};
      --danger:         ${colors.danger.value};
      --radius:         ${spacing.radius.value}px;
    }`
    html = html.replace(/:root\s*\{[^}]*\}/, newRoot)
    fs.writeFileSync(file, html)
  }

  return {
    name: 'design-token',
    configureServer(server) {
      server.middlewares.use('/__design/save', (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return }
        let body = ''
        req.on('data', d => (body += d))
        req.on('end', () => {
          try {
            const designTokens = JSON.parse(body)
            // 验证结构
            if (!designTokens.colors || !designTokens.spacing || !designTokens.effects) {
              throw new Error('Invalid token structure')
            }
            syncIndexCSS(designTokens)
            syncPopupHTML(designTokens)
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true }))
          } catch (e) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: e.message }))
          }
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    designTokenPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Pocket Brain',
        short_name: 'Pocket Brain',
        description: '你的个人知识库',
        theme_color: '#333333',
        background_color: '#FAFAFA',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
        share_target: {
          action: '/share',
          method: 'GET',
          params: {
            title: 'title',
            text: 'text',
            url: 'url',
          },
        },
      },
    }),
  ],
  build: {
    sourcemap: false, // 生产构建不生成 sourcemap，防止源码泄露
  },
  resolve: {
    alias: {
      '@':            path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/hooks':      path.resolve(__dirname, './src/hooks'),
      '@/utils':      path.resolve(__dirname, './src/utils'),
      '@/lib':        path.resolve(__dirname, './src/lib'),
      '@/styles':     path.resolve(__dirname, './src/styles'),
    },
  },
})
