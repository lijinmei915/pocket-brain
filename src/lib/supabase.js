const SUPABASE_URL = 'https://clujgrcidguwgufqekve.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsdWpncmNpZGd1d2d1ZnFla3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4ODYxMDcsImV4cCI6MjA5MDQ2MjEwN30.4Qt8FKLZ8L3Sh_dFtp06Yb3zRuM3Lq3Lc-NnYsYpa2I'

const HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: 'Bearer ' + SUPABASE_KEY,
  'Content-Type': 'application/json',
}

async function rest(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: { ...HEADERS, ...options.headers },
  })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(`Supabase error ${res.status}: ${msg}`)
  }
  // 204 No Content
  if (res.status === 204) return null
  return res.json()
}

// ── Items ──
export async function fetchItems() {
  const data = await rest('/items?select=*&order=createdat.desc')
  return (data || []).map(itemFromDb)
}

export async function createItem(item) {
  const data = await rest('/items?select=*', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(itemToDb(item)),
  })
  return itemFromDb(Array.isArray(data) ? data[0] : data)
}

export async function updateItem(id, changes) {
  const data = await rest(`/items?id=eq.${id}&select=*`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(itemToDb(changes)),
  })
  return itemFromDb(Array.isArray(data) ? data[0] : data)
}

export async function deleteItem(id) {
  await rest(`/items?id=eq.${id}`, { method: 'DELETE' })
}

// ── Folders ──
export async function fetchFolders() {
  const data = await rest('/folders?select=*&order=createdat.asc')
  return (data || []).map(folderFromDb)
}

export async function createFolder(name, parentId = null) {
  const data = await rest('/folders?select=*', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ name, parentid: parentId || null }),
  })
  return folderFromDb(Array.isArray(data) ? data[0] : data)
}

export async function renameFolder(id, name) {
  const data = await rest(`/folders?id=eq.${id}&select=*`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ name }),
  })
  return folderFromDb(Array.isArray(data) ? data[0] : data)
}

export async function deleteFolder(id) {
  // Move items in this folder to inbox
  await rest(`/items?folderid=eq.${id}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ folderid: null }),
  })
  await rest(`/folders?id=eq.${id}`, { method: 'DELETE' })
}

// ── DB mapping ──
function itemToDb(item) {
  const row = {}
  if (item.title !== undefined) row.title = item.title
  if (item.url !== undefined) row.url = item.url
  if (item.type !== undefined) row.type = item.type
  if (item.note !== undefined) row.note = item.note
  if (item.tags !== undefined) row.tags = item.tags
  if (item.thumbnail !== undefined) row.thumbnail = item.thumbnail
  if (item.source !== undefined) row.source = item.source
  if (item.folderId !== undefined) row.folderid = item.folderId || null
  if (item.summary !== undefined) row.summary = item.summary
  return row
}

function itemFromDb(row) {
  return {
    id: row.id,
    title: row.title || '',
    url: row.url || '',
    type: row.type || 'article',
    note: row.note || '',
    tags: row.tags || [],
    thumbnail: row.thumbnail || '',
    source: row.source || '',
    folderId: row.folderid || null,
    summary: row.summary || '',
    createdAt: row.createdat,
  }
}

function folderFromDb(row) {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parentid || null,
    createdAt: row.createdat,
  }
}
