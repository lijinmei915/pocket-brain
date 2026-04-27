import { supabaseAuth } from './auth'

export type ItemTag = {
  id: string
  name: string
  type: 'content' | 'status' | 'source' | 'format'
  appliedBy: 'user' | 'ai'
}

export interface BookmarkItem {
  id?: string
  title: string
  url?: string | null
  type: string
  note: string
  tags: ItemTag[]
  thumbnail: string
  source?: string
  folderId?: string | null
  summary?: string
  categoryId?: string | null
  confidence?: 'high' | 'medium' | 'low' | null
  aiStatus?: string | null
}

type DbRow = Record<string, unknown>

// ── Items ──

export async function fetchItems() {
  const { data, error } = await supabaseAuth
    .from('items')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(`Supabase error: ${error.message}`)
  return (data || []).map(itemFromDb)
}

export async function fetchItem(id: string) {
  const { data, error } = await supabaseAuth
    .from('items')
    .select('*')
    .eq('id', id)
    .single()
  if (error && error.code !== 'PGRST116') throw new Error(`Supabase error: ${error.message}`)
  return data ? itemFromDb(data) : null
}

export async function createItem(item) {
  const { data, error } = await supabaseAuth
    .from('items')
    .insert({ id: crypto.randomUUID(), ...itemToDb(item) })
    .select('*')
    .single()
  if (error) throw new Error(`Supabase error: ${error.message}`)
  return itemFromDb(data)
}

export async function updateItem(id, changes) {
  const { data, error } = await supabaseAuth
    .from('items')
    .update(itemToDb(changes))
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw new Error(`Supabase error: ${error.message}`)
  return itemFromDb(data)
}

export async function deleteItem(id) {
  const { error } = await supabaseAuth
    .from('items')
    .delete()
    .eq('id', id)
  if (error) throw new Error(`Supabase error: ${error.message}`)
}

export async function fetchItemByUrl(url: string) {
  const { data, error } = await supabaseAuth
    .from('items')
    .select('*')
    .eq('url', url)
    .maybeSingle()
  if (error) throw new Error(`Supabase error: ${error.message}`)
  return data ? itemFromDb(data) : null
}

export async function fetchUserTagLibrary(): Promise<Array<{ name: string; type: ItemTag['type'] }>> {
  const { data, error } = await supabaseAuth
    .from('tags')
    .select('name, type')
    .order('name', { ascending: true })
  if (error) throw new Error(`Supabase error: ${error.message}`)
  return (data || []) as Array<{ name: string; type: ItemTag['type'] }>
}

export async function fetchRecentlyUsedTags(limit: number): Promise<Array<{ name: string; type: ItemTag['type'] }>> {
  const { data, error } = await supabaseAuth
    .from('item_tags')
    .select('tags(name, type)')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`Supabase error: ${error.message}`)
  const seen = new Set<string>()
  const result: Array<{ name: string; type: ItemTag['type'] }> = []
  for (const row of data || []) {
    const tag = (row as { tags: { name: string; type: string } | null }).tags
    if (!tag) continue
    const key = `${tag.type}:${tag.name}`
    if (!seen.has(key)) {
      seen.add(key)
      result.push({ name: tag.name, type: tag.type as ItemTag['type'] })
    }
  }
  return result
}

export async function replaceUserTagsForItem(
  itemId: string,
  userTags: Array<{ name: string; type: ItemTag['type'] }>
): Promise<BookmarkItem | null> {
  const item = await fetchItem(itemId)
  if (!item) return null
  const aiTags = (item.tags as ItemTag[]).filter(t => t.appliedBy !== 'user')
  const newUserTags: ItemTag[] = userTags.map(t => ({
    id: crypto.randomUUID(),
    name: t.name,
    type: t.type,
    appliedBy: 'user',
  }))
  return updateItem(itemId, { tags: [...aiTags, ...newUserTags] })
}

// ── Folders ──

export async function fetchFolders() {
  const { data, error } = await supabaseAuth
    .from('folders')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw new Error(`Supabase error: ${error.message}`)
  return (data || []).map(folderFromDb)
}

export async function createFolder(name, parentId = null) {
  const { data, error } = await supabaseAuth
    .from('folders')
    .insert({ name, parent_id: parentId || null })
    .select('*')
    .single()
  if (error) throw new Error(`Supabase error: ${error.message}`)
  return folderFromDb(data)
}

export async function renameFolder(id, name) {
  const { data, error } = await supabaseAuth
    .from('folders')
    .update({ name })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw new Error(`Supabase error: ${error.message}`)
  return folderFromDb(data)
}

export async function deleteFolder(id) {
  const { error: moveError } = await supabaseAuth
    .from('items')
    .update({ folder_id: null })
    .eq('folder_id', id)
  if (moveError) throw new Error(`Supabase error: ${moveError.message}`)
  const { error } = await supabaseAuth
    .from('folders')
    .delete()
    .eq('id', id)
  if (error) throw new Error(`Supabase error: ${error.message}`)
}

// ── Storage ──

const BUCKET = 'attachments'

export async function uploadFile(file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `${crypto.randomUUID()}.${ext}`
  const { error } = await supabaseAuth.storage
    .from(BUCKET)
    .upload(path, file, { upsert: false })
  if (error) throw new Error(`Upload failed: ${error.message}`)
  const { data } = supabaseAuth.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function deleteFile(publicUrl: string): Promise<void> {
  const marker = `/object/public/${BUCKET}/`
  const idx = publicUrl.indexOf(marker)
  if (idx === -1) return
  const path = publicUrl.slice(idx + marker.length)
  const { error } = await supabaseAuth.storage.from(BUCKET).remove([path])
  if (error) throw new Error(`Delete failed: ${error.message}`)
}

// ── DB mapping ──

function itemToDb(item: Partial<BookmarkItem>): DbRow {
  const row: DbRow = {}
  if (item.title !== undefined) row.title = item.title
  if (item.url !== undefined) row.url = item.url
  if (item.type !== undefined) row.type = item.type
  if (item.note !== undefined) row.note = item.note
  if (item.tags !== undefined) row.tags = item.tags
  if (item.thumbnail !== undefined) row.thumbnail = item.thumbnail
  if (item.source !== undefined) row.source = item.source
  if (item.folderId !== undefined) row.folder_id = item.folderId || null
  if (item.summary !== undefined) row.summary = item.summary
  if (item.categoryId !== undefined) row.category_id = item.categoryId
  return row
}

function itemFromDb(row: DbRow) {
  return {
    id: row.id,
    title: row.title || '',
    url: row.url || '',
    type: row.type || 'article',
    note: row.note || '',
    tags: row.tags || [],
    thumbnail: row.thumbnail || '',
    source: row.source || '',
    folderId: row.folder_id || null,
    summary: row.summary || '',
    categoryId: row.category_id || null,
    confidence: row.confidence || null,
    aiStatus: row.ai_status || null,
    createdAt: row.created_at,
  }
}

function folderFromDb(row) {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parent_id || null,
    createdAt: row.created_at,
  }
}
