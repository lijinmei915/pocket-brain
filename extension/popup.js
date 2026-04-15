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
    description: 'https://pocket-brain-blush.vercel.app',
    baseUrl: 'https://pocket-brain-blush.vercel.app',
  },
]

const STORAGE_KEY = 'pb-extension-environment'
const DEFAULT_ENV_ID = ENV_OPTIONS[0].id

function storageGet(key) {
  return new Promise(resolve => {
    try {
      chrome.storage.local.get(key, result => resolve(result?.[key]))
    } catch {
      resolve(undefined)
    }
  })
}

function storageSet(values) {
  return new Promise(resolve => {
    try {
      chrome.storage.local.set(values, resolve)
    } catch {
      resolve()
    }
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
  const selectedId = await getSelectedEnvId()
  const option = getEnvOption(selectedId)
  const available = await checkEnvironment(option)

  if (!available) {
    setStatus(`${option.label} 未启动，请先打开 ${option.baseUrl}`, true)
    return
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const url = tab?.url || ''
  const title = tab?.title || ''
  const saveUrl = `${option.baseUrl}/save?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`

  chrome.windows.create({
    url: saveUrl,
    type: 'popup',
    width: 400,
    height: 620,
  })

  window.close()
}

async function init() {
  try {
    const selectedId = await getSelectedEnvId()
    updateCurrentEnv(selectedId)
    renderOptions(selectedId)
    setStatus('')

    document.getElementById('open-btn').addEventListener('click', openSelectedEnvironment)
    document.getElementById('reload-btn').addEventListener('click', async () => {
      const refreshedId = await getSelectedEnvId()
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
