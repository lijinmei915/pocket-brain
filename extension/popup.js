const APP_URLS = [
  'https://pocket-brain-blush.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]

async function resolveAppUrl() {
  for (const baseUrl of APP_URLS) {
    try {
      const response = await fetch(`${baseUrl}/`, { method: 'HEAD', cache: 'no-store' })
      if (response.ok) return baseUrl
    } catch {}
  }
  return APP_URLS[APP_URLS.length - 1]
}

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const url   = tab.url   || ''
  const title = tab.title || ''
  const appUrl = await resolveAppUrl()

  const saveUrl = `${appUrl}/save?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`

  chrome.windows.create({
    url: saveUrl,
    type: 'popup',
    width: 400,
    height: 620,
  })

  window.close()
}

init()
