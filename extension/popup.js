const SUPABASE_STORAGE_KEY = 'sb-clujgrcidguwgufqekve-auth-token'

let cachedAuthState = null

const ENV_OPTIONS = [
  {
    id: 'local-ai',
    label: '本地 AI',
    description: 'http://localhost:3000',
    baseUrl: 'http://localhost:3000',
  },
  {
    id: 'local-web',
    label: '本地前端',
    description: 'http://localhost:5173',
    baseUrl: 'http://localhost:5173',
  },
  {
    id: 'production',
    label: '线上',
    description: 'https://pocketbrain.me',
    baseUrl: 'https://pocketbrain.me',
  },
]

const STORAGE_KEY = 'pb-extension-environment'
const DEFAULT_ENV_ID = 'local-web'

function getChromeApi() {
  try {
    if (typeof chrome !== 'undefined' && chrome) {
      const tabs = chrome.tabs
      const windowsApi = chrome.windows
      if (tabs || windowsApi) {
        return chrome
      }
    }
  } catch {
    // Ignore invalid global chrome shims and fall through.
  }

  try {
    if (typeof browser !== 'undefined' && browser) {
      const tabs = browser.tabs
      const windowsApi = browser.windows
      if (tabs || windowsApi) {
        return browser
      }
    }
  } catch {
    // Ignore invalid global browser shims and fall through.
  }

  return null
}

function getTabsApi(api) {
  try {
    return api?.tabs || null
  } catch {
    return null
  }
}

function getWindowsApi(api) {
  try {
    return api?.windows || null
  } catch {
    return null
  }
}

function getScriptingApi() {
  try {
    if (typeof chrome !== 'undefined' && chrome?.scripting?.executeScript) return chrome.scripting
  } catch {}
  try {
    if (typeof browser !== 'undefined' && browser?.scripting?.executeScript) return browser.scripting
  } catch {}
  return null
}

// Returns { status: 'logged_in', email } | { status: 'logged_out' } | { status: 'unknown' }
async function getAuthState() {
  try {
    const api = getChromeApi()
    const tabsApi = getTabsApi(api)
    if (!tabsApi?.query) return { status: 'unknown' }

    const tabs = await tabsApi.query({ url: 'https://pocketbrain.me/*' })
    if (!tabs.length) return { status: 'unknown' }

    const scripting = getScriptingApi()
    if (!scripting) return { status: 'unknown' }

    const storageKey = SUPABASE_STORAGE_KEY
    const results = await scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: (key) => {
        try {
          const raw = localStorage.getItem(key)
          const parsed = raw ? JSON.parse(raw) : null
          const user = parsed?.user ?? null
          return user ? { email: user.email } : null
        } catch {
          return null
        }
      },
      args: [storageKey],
    })
    const user = results?.[0]?.result ?? null
    return user ? { status: 'logged_in', email: user.email } : { status: 'logged_out' }
  } catch {
    return { status: 'unknown' }
  }
}

function renderAuthStatus(state) {
  const el = document.getElementById('auth-status')
  if (!el) return
  if (state.status === 'logged_in') {
    el.innerHTML = `<span class="auth-dot on"></span><span class="auth-text">${state.email}</span>`
  } else if (state.status === 'logged_out') {
    el.innerHTML = `<span class="auth-dot off"></span><span class="auth-text muted">未登录</span>`
  } else {
    el.innerHTML = `<span class="auth-text muted">站点未打开，无法检测</span>`
  }
}

function storageGet(key) {
  return new Promise(resolve => {
    try {
      resolve(window.localStorage.getItem(key) || undefined)
    } catch {
      resolve(undefined)
    }
  })
}

function storageSet(values) {
  return new Promise(resolve => {
    try {
      for (const [key, value] of Object.entries(values)) {
        window.localStorage.setItem(key, String(value))
      }
    } catch {
      // Ignore storage failures; the popup can still use the default environment.
    }
    resolve()
  })
}

function getEnvOption(id) {
  return ENV_OPTIONS.find(option => option.id === id) || ENV_OPTIONS[0]
}

async function getSelectedEnvId() {
  try {
    const storedId = await Promise.race([
      storageGet(STORAGE_KEY),
      new Promise(resolve => setTimeout(() => resolve(undefined), 250)),
    ])
    return storedId || DEFAULT_ENV_ID
  } catch {
    return DEFAULT_ENV_ID
  }
}

function renderOptions(selectedId) {
  const container = document.getElementById('env-options')
  container.innerHTML = ''

  for (const option of ENV_OPTIONS) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = `option${option.id === selectedId ? ' active' : ''}`
    button.dataset.envId = option.id
    button.innerHTML = `
      <div class="option-title">${option.label}</div>
      <div class="option-desc">${option.description}</div>
    `
    button.addEventListener('click', () => {
      updateCurrentEnv(option.id)
      renderOptions(option.id)
      setStatus(`已切换到 ${option.label}`)
      void storageSet({ [STORAGE_KEY]: option.id })
    })
    container.appendChild(button)
  }
}

function updateCurrentEnv(selectedId) {
  const current = document.getElementById('current-env')
  const option = getEnvOption(selectedId)
  current.textContent = `${option.label} · ${option.baseUrl}`
}

function setStatus(message = '', isError = false) {
  const status = document.getElementById('status-text')
  status.textContent = message
  status.className = `status${isError ? ' error' : ''}`
}

async function checkEnvironment(option) {
  try {
    const response = await fetch(`${option.baseUrl}/`, { method: 'HEAD', cache: 'no-store' })
    return response.ok
  } catch {
    return false
  }
}

async function openSelectedEnvironment() {
  const api = getChromeApi()
  const tabsApi = getTabsApi(api)
  const windowsApi = getWindowsApi(api)
  const selectedId = await getSelectedEnvId()
  const option = getEnvOption(selectedId)
  const available = await checkEnvironment(option)

  if (!available) {
    setStatus(`${option.label} 未启动，请先打开 ${option.baseUrl}`, true)
    return
  }

  if (!tabsApi?.query || !windowsApi?.create) {
    setStatus('当前扩展 API 不可用，请重新加载扩展后再试', true)
    return
  }

  // 线上环境且确认未登录 → 直接开登录页，避免 magic link 回调在新 tab 的双窗口问题
  if (option.id === 'production' && cachedAuthState?.status === 'logged_out') {
    if (tabsApi?.create) {
      await tabsApi.create({ url: `${option.baseUrl}/login`, active: true })
      setStatus('请先登录，登录后再点击插件保存')
      window.close()
      return
    }
  }

  const [tab] = await tabsApi.query({ active: true, currentWindow: true })
  const url = tab?.url || ''
  const title = tab?.title || ''
  const saveUrl = `${option.baseUrl}/save?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`

  windowsApi.create({
    url: saveUrl,
    type: 'popup',
    width: 400,
    height: 620,
  })

  window.close()
}

async function init() {
  try {
    const api = getChromeApi()
    const tabsApi = getTabsApi(api)
    const windowsApi = getWindowsApi(api)
    console.info('[PB extension] popup init', {
      hasChrome: typeof chrome !== 'undefined',
      hasBrowser: typeof browser !== 'undefined',
      hasTabs: Boolean(tabsApi),
      hasWindows: Boolean(windowsApi),
    })

    const [selectedId, authState] = await Promise.all([
      getSelectedEnvId(),
      getAuthState(),
    ])

    cachedAuthState = authState
    renderAuthStatus(authState)
    updateCurrentEnv(selectedId)
    renderOptions(selectedId)
    setStatus('')

    document.getElementById('open-btn').addEventListener('click', openSelectedEnvironment)
    document.getElementById('reload-btn').addEventListener('click', async () => {
      const [refreshedId, refreshedAuth] = await Promise.all([
        getSelectedEnvId(),
        getAuthState(),
      ])
      cachedAuthState = refreshedAuth
      renderAuthStatus(refreshedAuth)
      updateCurrentEnv(refreshedId)
      renderOptions(refreshedId)
      setStatus('已刷新当前选择')
    })
  } catch (error) {
    updateCurrentEnv(DEFAULT_ENV_ID)
    renderOptions(DEFAULT_ENV_ID)
    setStatus(`初始化失败：${error instanceof Error ? error.message : '未知错误'}`, true)
  }
}

init()
