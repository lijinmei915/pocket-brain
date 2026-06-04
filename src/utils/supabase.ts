import { isDevAuthBypassEnabled, supabaseAuth } from './auth'
import type { TablesInsert, TablesUpdate } from '@/types/supabase'

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
  createdAt?: string
}

type DbRow = Record<string, unknown>

type FolderItem = {
  id: string
  name: string
  parentId: string | null
  createdAt: string
}

const LOCAL_ITEMS_KEY = 'pb:dev:items'
const LOCAL_FOLDERS_KEY = 'pb:dev:folders'

function useLocalDataStore() {
  return isDevAuthBypassEnabled()
}

function readLocalArray<T>(key: string): T[] {
  if (typeof window === 'undefined') return []
  try {
    const value = window.localStorage.getItem(key)
    return value ? JSON.parse(value) : []
  } catch {
    return []
  }
}

function writeLocalArray<T>(key: string, value: T[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

function normalizeLocalItem(item: Partial<BookmarkItem>): BookmarkItem {
  return {
    id: item.id || crypto.randomUUID(),
    title: item.title || '',
    url: item.url ?? '',
    type: item.type || 'article',
    note: item.note || '',
    tags: Array.isArray(item.tags) ? item.tags : [],
    thumbnail: item.thumbnail || '',
    source: item.source || '',
    folderId: item.folderId ?? null,
    summary: item.summary || '',
    categoryId: item.categoryId ?? null,
    confidence: item.confidence ?? null,
    aiStatus: item.aiStatus ?? null,
    createdAt: item.createdAt || new Date().toISOString(),
  }
}

function normalizeLocalFolder(folder: Partial<FolderItem>): FolderItem {
  return {
    id: folder.id || crypto.randomUUID(),
    name: folder.name || '未命名文件夹',
    parentId: folder.parentId ?? null,
    createdAt: folder.createdAt || new Date().toISOString(),
  }
}

// ── Items ──

export async function fetchItems() {
  if (useLocalDataStore()) {
    return readLocalArray<BookmarkItem>(LOCAL_ITEMS_KEY)
      .map(normalizeLocalItem)
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
  }

  const { data, error } = await supabaseAuth
    .from('items')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(`Supabase error: ${error.message}`)
  return (data || []).map(itemFromDb)
}

export async function fetchItem(id: string) {
  if (useLocalDataStore()) {
    return readLocalArray<BookmarkItem>(LOCAL_ITEMS_KEY)
      .map(normalizeLocalItem)
      .find(item => item.id === id) || null
  }

  const { data, error } = await supabaseAuth
    .from('items')
    .select('*')
    .eq('id', id)
    .single()
  if (error && error.code !== 'PGRST116') throw new Error(`Supabase error: ${error.message}`)
  return data ? itemFromDb(data) : null
}

export async function createItem(item) {
  if (useLocalDataStore()) {
    const nextItem = normalizeLocalItem(item)
    const items = readLocalArray<BookmarkItem>(LOCAL_ITEMS_KEY).map(normalizeLocalItem)
    writeLocalArray(LOCAL_ITEMS_KEY, [nextItem, ...items])
    return nextItem
  }

  const { data, error } = await supabaseAuth
    .from('items')
    .insert({ id: crypto.randomUUID(), ...itemToDb(item) })
    .select('*')
    .single()
  if (error) throw new Error(`Supabase error: ${error.message}`)
  return itemFromDb(data)
}

export async function updateItem(id, changes) {
  if (useLocalDataStore()) {
    const items = readLocalArray<BookmarkItem>(LOCAL_ITEMS_KEY).map(normalizeLocalItem)
    const index = items.findIndex(item => item.id === id)
    if (index === -1) throw new Error('Local item not found')
    const nextItem = normalizeLocalItem({ ...items[index], ...changes, id })
    const nextItems = [...items]
    nextItems[index] = nextItem
    writeLocalArray(LOCAL_ITEMS_KEY, nextItems)
    return nextItem
  }

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
  if (useLocalDataStore()) {
    const items = readLocalArray<BookmarkItem>(LOCAL_ITEMS_KEY).map(normalizeLocalItem)
    writeLocalArray(LOCAL_ITEMS_KEY, items.filter(item => item.id !== id))
    return
  }

  const { error } = await supabaseAuth
    .from('items')
    .delete()
    .eq('id', id)
  if (error) throw new Error(`Supabase error: ${error.message}`)
}

export async function fetchItemByUrl(url: string) {
  if (useLocalDataStore()) {
    return readLocalArray<BookmarkItem>(LOCAL_ITEMS_KEY)
      .map(normalizeLocalItem)
      .find(item => item.url === url) || null
  }

  const { data, error } = await supabaseAuth
    .from('items')
    .select('*')
    .eq('url', url)
    .maybeSingle()
  if (error) throw new Error(`Supabase error: ${error.message}`)
  return data ? itemFromDb(data) : null
}

export async function fetchUserTagLibrary(): Promise<Array<{ name: string; type: ItemTag['type'] }>> {
  if (useLocalDataStore()) {
    const seen = new Set<string>()
    const tags: Array<{ name: string; type: ItemTag['type'] }> = []
    for (const item of readLocalArray<BookmarkItem>(LOCAL_ITEMS_KEY).map(normalizeLocalItem)) {
      for (const tag of item.tags || []) {
        const key = `${tag.type}:${tag.name}`
        if (seen.has(key)) continue
        seen.add(key)
        tags.push({ name: tag.name, type: tag.type })
      }
    }
    return tags.sort((a, b) => a.name.localeCompare(b.name))
  }

  const { data, error } = await supabaseAuth
    .from('tags')
    .select('name, type')
    .order('name', { ascending: true })
  if (error) throw new Error(`Supabase error: ${error.message}`)
  return (data || []) as Array<{ name: string; type: ItemTag['type'] }>
}

export async function fetchRecentlyUsedTags(limit: number): Promise<Array<{ name: string; type: ItemTag['type'] }>> {
  if (useLocalDataStore()) {
    const seen = new Set<string>()
    const result: Array<{ name: string; type: ItemTag['type'] }> = []
    const items = readLocalArray<BookmarkItem>(LOCAL_ITEMS_KEY)
      .map(normalizeLocalItem)
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    for (const item of items) {
      for (const tag of item.tags || []) {
        const key = `${tag.type}:${tag.name}`
        if (seen.has(key)) continue
        seen.add(key)
        result.push({ name: tag.name, type: tag.type })
        if (result.length >= limit) return result
      }
    }
    return result
  }

  const { data, error } = await supabaseAuth
    .from('item_tags')
    .select('tags(name, type)')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`Supabase error: ${error.message}`)
  const seen = new Set<string>()
  const result: Array<{ name: string; type: ItemTag['type'] }> = []
  for (const row of data || []) {
    const rawTag = (row as unknown as { tags?: { name: string; type: string } | Array<{ name: string; type: string }> | null }).tags
    const tag = Array.isArray(rawTag) ? rawTag[0] : rawTag
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
  if (useLocalDataStore()) {
    return readLocalArray<FolderItem>(LOCAL_FOLDERS_KEY)
      .map(normalizeLocalFolder)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }

  const { data, error } = await supabaseAuth
    .from('folders')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) throw new Error(`Supabase error: ${error.message}`)
  return (data || []).map(folderFromDb)
}

export async function createFolder(name, parentId = null) {
  if (useLocalDataStore()) {
    const folder = normalizeLocalFolder({ name, parentId: parentId || null })
    const folders = readLocalArray<FolderItem>(LOCAL_FOLDERS_KEY).map(normalizeLocalFolder)
    writeLocalArray(LOCAL_FOLDERS_KEY, [...folders, folder])
    return folder
  }

  const { data, error } = await supabaseAuth
    .from('folders')
    .insert({ name, parent_id: parentId || null })
    .select('*')
    .single()
  if (error) throw new Error(`Supabase error: ${error.message}`)
  return folderFromDb(data)
}

export async function renameFolder(id, name) {
  if (useLocalDataStore()) {
    const folders = readLocalArray<FolderItem>(LOCAL_FOLDERS_KEY).map(normalizeLocalFolder)
    const index = folders.findIndex(folder => folder.id === id)
    if (index === -1) throw new Error('Local folder not found')
    const folder = { ...folders[index], name }
    const nextFolders = [...folders]
    nextFolders[index] = folder
    writeLocalArray(LOCAL_FOLDERS_KEY, nextFolders)
    return folder
  }

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
  if (useLocalDataStore()) {
    const folders = readLocalArray<FolderItem>(LOCAL_FOLDERS_KEY).map(normalizeLocalFolder)
    const items = readLocalArray<BookmarkItem>(LOCAL_ITEMS_KEY).map(normalizeLocalItem)
    writeLocalArray(LOCAL_FOLDERS_KEY, folders.filter(folder => folder.id !== id))
    writeLocalArray(
      LOCAL_ITEMS_KEY,
      items.map(item => item.folderId === id ? { ...item, folderId: null } : item)
    )
    return
  }

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
  if (useLocalDataStore()) {
    return URL.createObjectURL(file)
  }

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
  if (useLocalDataStore() || publicUrl.startsWith('blob:')) return

  const marker = `/object/public/${BUCKET}/`
  const idx = publicUrl.indexOf(marker)
  if (idx === -1) return
  const path = publicUrl.slice(idx + marker.length)
  const { error } = await supabaseAuth.storage.from(BUCKET).remove([path])
  if (error) throw new Error(`Delete failed: ${error.message}`)
}

// ── DB mapping ──

function itemToDb(item: Partial<BookmarkItem>): TablesInsert<'items'> & TablesUpdate<'items'> {
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
  return row as unknown as TablesInsert<'items'> & TablesUpdate<'items'>
}

function itemFromDb(row: DbRow): BookmarkItem {
  return {
    id: typeof row.id === 'string' ? row.id : undefined,
    title: typeof row.title === 'string' ? row.title : '',
    url: typeof row.url === 'string' ? row.url : '',
    type: typeof row.type === 'string' ? row.type : 'article',
    note: typeof row.note === 'string' ? row.note : '',
    tags: Array.isArray(row.tags) ? row.tags as ItemTag[] : [],
    thumbnail: typeof row.thumbnail === 'string' ? row.thumbnail : '',
    source: typeof row.source === 'string' ? row.source : '',
    folderId: typeof row.folder_id === 'string' ? row.folder_id : null,
    summary: typeof row.summary === 'string' ? row.summary : '',
    categoryId: typeof row.category_id === 'string' ? row.category_id : null,
    confidence: row.confidence === 'high' || row.confidence === 'medium' || row.confidence === 'low' ? row.confidence : null,
    aiStatus: typeof row.ai_status === 'string' ? row.ai_status : null,
    createdAt: typeof row.created_at === 'string' ? row.created_at : undefined,
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
