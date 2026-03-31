import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://clujgrcidguwgufqekve.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsdWpncmNpZGd1d2d1ZnFla3ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4ODYxMDcsImV4cCI6MjA5MDQ2MjEwN30.4Qt8FKLZ8L3Sh_dFtp06Yb3zRuM3Lq3Lc-NnYsYpa2I'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── Items ──
export async function fetchItems() {
  const { data, error } = await supabase
    .from('items')
    .select('*')
    .order('createdat', { ascending: false })
  if (error) throw error
  return (data || []).map(itemFromDb)
}

export async function createItem(item) {
  const { data, error } = await supabase
    .from('items')
    .insert([itemToDb(item)])
    .select()
    .single()
  if (error) throw error
  return itemFromDb(data)
}

export async function updateItem(id, changes) {
  const { data, error } = await supabase
    .from('items')
    .update(itemToDb(changes))
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return itemFromDb(data)
}

export async function deleteItem(id) {
  const { error } = await supabase.from('items').delete().eq('id', id)
  if (error) throw error
}

// ── Folders ──
export async function fetchFolders() {
  const { data, error } = await supabase
    .from('folders')
    .select('*')
    .order('createdat', { ascending: true })
  if (error) throw error
  return (data || []).map(folderFromDb)
}

export async function createFolder(name, parentId = null) {
  const { data, error } = await supabase
    .from('folders')
    .insert([{ name, parentid: parentId || null }])
    .select()
    .single()
  if (error) throw error
  return folderFromDb(data)
}

export async function renameFolder(id, name) {
  const { data, error } = await supabase
    .from('folders')
    .update({ name })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return folderFromDb(data)
}

export async function deleteFolder(id) {
  // Move items in this folder to inbox
  await supabase.from('items').update({ folderid: null }).eq('folderid', id)
  // Delete sub-folders recursively handled by cascade or manually
  const { error } = await supabase.from('folders').delete().eq('id', id)
  if (error) throw error
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
