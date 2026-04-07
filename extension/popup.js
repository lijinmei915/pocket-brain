const SUPABASE_URL = 'https://clujgrcidguwgufqekve.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsdWpncmNpZGd1d2d1ZnFla3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4ODYxMDcsImV4cCI6MjA5MDQ2MjEwN30.4Qt8FKLZ8L3Sh_dFtp06Yb3zRuM3Lq3Lc-NnYsYpa2I'
const HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
}

function guessType(url) {
  const u = (url || '').toLowerCase()
  if (/youtube\.com|youtu\.be|vimeo\.com|bilibili\.com/.test(u)) return 'video'
  if (/twitter\.com|x\.com|weibo\.com/.test(u)) return 'tweet'
  if (/spotify\.com|podcast|\.mp3|\.wav/.test(u)) return 'audio'
  return 'article'
}

async function fetchFolders() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/folders?select=id,name&order=createdat.asc`, { headers: HEADERS })
  if (!res.ok) return []
  return res.json()
}

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const url = tab.url || ''
  const title = tab.title || url
  const folders = await fetchFolders()

  // 填入表单
  document.getElementById('title').value = title
  document.getElementById('url-display').textContent = url
  document.getElementById('type').value = guessType(url)

  const folderSelect = document.getElementById('folder')
  folderSelect.innerHTML = '<option value="">收件箱</option>' +
    folders.map(f => `<option value="${f.id}">${f.name}</option>`).join('')

  document.getElementById('loading').style.display = 'none'
  document.getElementById('form-view').style.display = 'flex'

  document.getElementById('save-btn').addEventListener('click', async () => {
    const btn = document.getElementById('save-btn')
    const errEl = document.getElementById('error-msg')
    btn.disabled = true
    btn.textContent = '保存中...'
    errEl.style.display = 'none'

    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/items`, {
        method: 'POST',
        headers: { ...HEADERS, Prefer: 'return=minimal' },
        body: JSON.stringify({
          id: crypto.randomUUID(),
          title: document.getElementById('title').value || title,
          url,
          type: document.getElementById('type').value,
          note: document.getElementById('note').value,
          folderid: document.getElementById('folder').value || null,
          createdat: Date.now(),
          tags: [],
          source: 'extension',
        })
      })
      if (!res.ok) throw new Error(await res.text())

      document.getElementById('form-view').style.display = 'none'
      document.getElementById('success-view').style.display = 'flex'
    } catch (err) {
      btn.disabled = false
      btn.textContent = '保存'
      errEl.textContent = '保存失败，请重试'
      errEl.style.display = 'block'
      console.error(err)
    }
  })
}

init()
