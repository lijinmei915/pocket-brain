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
  const res = await fetch(`${SUPABASE_URL}/rest/v1/folders?select=id,name,parentid&order=createdat.asc`, { headers: HEADERS })
  if (!res.ok) return []
  return res.json()
}

function buildFolderOptions(folders, list, depth = 0) {
  return list.flatMap(f => {
    const prefix = depth > 0 ? '\u00a0\u00a0'.repeat(depth) + '└ ' : ''
    const children = folders.filter(c => c.parentid === f.id)
    return [
      `<option value="${f.id}">${prefix}${f.name}</option>`,
      ...buildFolderOptions(folders, children, depth + 1),
    ]
  })
}

let selectedType = 'article'

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const url = tab.url || ''
  const title = tab.title || url
  const folders = await fetchFolders()

  document.getElementById('title').value = title
  document.getElementById('url-display').textContent = url

  // 类型 tag 按钮
  selectedType = guessType(url)
  document.querySelectorAll('.type-btn').forEach(btn => {
    if (btn.dataset.type === selectedType) btn.classList.add('active')
    btn.addEventListener('click', () => {
      selectedType = btn.dataset.type
      document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
    })
  })

  // 文件夹（树状）
  const roots = folders.filter(f => !f.parentid)
  document.getElementById('folder').innerHTML =
    '<option value="">稍后整理</option>' + buildFolderOptions(folders, roots).join('')

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
          type: selectedType,
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
