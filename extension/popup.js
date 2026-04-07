const APP_URL = 'https://pocket-brain-blush.vercel.app'

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const url   = tab.url   || ''
  const title = tab.title || ''

  const saveUrl = `${APP_URL}/save?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`

  chrome.windows.create({
    url: saveUrl,
    type: 'popup',
    width: 400,
    height: 620,
  })

  window.close()
}

init()
