import { getAccessToken, getCurrentUserId } from '@/utils/auth'

export interface ItemTag {
  id: string
  name: string
  type: 'content' | 'source' | 'format' | 'status'
  appliedBy: 'ai' | 'user'
}

type TagDraft = {
  name: string
  type: ItemTag['type']
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
type RestOptions = Omit<RequestInit, 'headers'> & { headers?: Record<string, string> }

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY

const DEFAULT_TAG_USER_ID = '00000000-0000-0000-0000-000000000001'

async function getTagOwnerId() {
  return (await getCurrentUserId()) || DEFAULT_TAG_USER_ID
}

async function getHeaders(extraHeaders: Record<string, string> = {}) {
  const accessToken = await getAccessToken()
  return {
    apikey: SUPABASE_KEY,
    Authorization: 'Bearer ' + (accessToken || SUPABASE_KEY),
    'Content-Type': 'application/json',
    ...extraHeaders,
  }
}

async function rest(path: string, options: RestOptions = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: await getHeaders(options.headers),
  })
  if (!res.ok) {
    const msg = await res.text()
    const requestBody = typeof options.body === 'string' ? options.body : ''
    console.error('[PB] Supabase request failed', {
      path,
      status: res.status,
      body: requestBody,
      response: msg,
    })
    throw new Error(`Supabase error ${res.status}: ${msg}`)
  }
  // 204 No Content
  if (res.status === 204) return null
  return res.json()
}

// ── Items ──
export async function fetchItems() {
  let data
  try {
    data = await rest('/items?select=*,item_tags(applied_by,tags(id,name,type))&order=created_at.desc')
  } catch (error) {
    console.warn('[PB] fetchItems fallback to legacy schema:', error)
    data = await rest('/items?select=*&order=created_at.desc')
  }
  return (data || []).map(itemFromDb)
}

export async function fetchItem(id: string) {
  let data
  try {
    data = await rest(`/items?id=eq.${id}&select=*,item_tags(applied_by,tags(id,name,type))`)
  } catch (error) {
    console.warn('[PB] fetchItem fallback to legacy schema:', error)
    data = await rest(`/items?id=eq.${id}&select=*`)
  }
  return data?.[0] ? itemFromDb(data[0]) : null
}

export async function fetchItemByUrl(url: string) {
  const encodedUrl = encodeURIComponent(url)
  let data
  try {
    data = await rest(`/items?url=eq.${encodedUrl}&select=*,item_tags(applied_by,tags(id,name,type))&limit=1`)
  } catch (error) {
    console.warn('[PB] fetchItemByUrl fallback to legacy schema:', error)
    data = await rest(`/items?url=eq.${encodedUrl}&select=*&limit=1`)
  }
  return data?.[0] ? itemFromDb(data[0]) : null
}

export async function createItem(item) {
  const data = await rest('/items?select=*', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ id: crypto.randomUUID(), ...itemToDb(item) }),
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

function normalizeTagDrafts(tags: TagDraft[]) {
  const seen = new Set<string>()
  const result: TagDraft[] = []

  for (const tag of Array.isArray(tags) ? tags : []) {
    const name = String(tag?.name || '').replace(/^#/, '').trim()
    const type = String(tag?.type || '').trim().toLowerCase()
    if (!name || !['content', 'source', 'format', 'status'].includes(type)) continue

    const key = `${type}:${name.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    result.push({ name, type: type as ItemTag['type'] })
  }

  return result
}

function isMissingColumnError(error: unknown, column: string) {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes(`column ${column}`) || message.includes(`Could not find the '${column}' column`)
}

async function tagsUseUserId() {
  const userId = await getTagOwnerId()
  try {
    await rest(`/tags?select=id&user_id=eq.${encodeURIComponent(userId)}&limit=1`)
    return true
  } catch (error) {
    if (isMissingColumnError(error, 'user_id')) return false
    throw error
  }
}

async function findExistingTag(tag: TagDraft) {
  const encodedName = encodeURIComponent(tag.name)
  const encodedType = encodeURIComponent(tag.type)
  const userId = await getTagOwnerId()

  if (await tagsUseUserId()) {
    const rows = await rest(
      `/tags?select=id,name,type&user_id=eq.${encodeURIComponent(userId)}&name=eq.${encodedName}&type=eq.${encodedType}&limit=1`
    )
    if (Array.isArray(rows) && rows[0]) return rows[0]
  }

  const rows = await rest(`/tags?select=id,name,type&name=eq.${encodedName}&type=eq.${encodedType}&limit=1`)
  return Array.isArray(rows) && rows[0] ? rows[0] : null
}

async function createTag(tag: TagDraft) {
  const userId = await getTagOwnerId()
  const body: Record<string, unknown> = {
    name: tag.name,
    type: tag.type,
  }

  if (await tagsUseUserId()) {
    body.user_id = userId
  }

  const rows = await rest('/tags?select=id,name,type', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(body),
  })

  return Array.isArray(rows) && rows[0] ? rows[0] : null
}

async function ensureTag(tag: TagDraft) {
  return (await findExistingTag(tag)) || (await createTag(tag))
}

export async function fetchRecentlyUsedTags(limit = 6): Promise<TagDraft[]> {
  try {
    // 取最近 20 条 item 的标签，扁平化去重得到"最近使用"
    const rows = await rest(
      '/items?select=item_tags(tags(id,name,type))&order=created_at.desc&limit=20'
    )
    const seen = new Set<string>()
    const result: TagDraft[] = []
    for (const item of Array.isArray(rows) ? rows : []) {
      for (const it of Array.isArray(item?.item_tags) ? item.item_tags : []) {
        const tag = it?.tags
        if (!tag?.name || !tag?.type) continue
        const key = `${tag.type}:${tag.name.toLowerCase()}`
        if (seen.has(key)) continue
        seen.add(key)
        result.push({ name: tag.name, type: tag.type })
        if (result.length >= limit) break
      }
      if (result.length >= limit) break
    }
    return result
  } catch (error) {
    console.warn('[PB] fetchRecentlyUsedTags failed:', error)
    return []
  }
}

export async function fetchUserTagLibrary() {
  const userId = await getTagOwnerId()
  if (await tagsUseUserId()) {
    const rows = await rest(
      `/tags?select=id,name,type&user_id=eq.${encodeURIComponent(userId)}&order=name.asc`
    )
    return normalizeTagDrafts(Array.isArray(rows) ? rows : [])
  }

  const rows = await rest('/tags?select=id,name,type&order=name.asc')
  return normalizeTagDrafts(Array.isArray(rows) ? rows : [])
}

export async function replaceUserTagsForItem(itemId: string, tags: TagDraft[]) {
  const desiredTags = normalizeTagDrafts(tags)
  const currentRows = await rest(
    `/item_tags?item_id=eq.${encodeURIComponent(itemId)}&select=tag_id,applied_by,tags(id,name,type)`
  )

  const currentUserRows = (Array.isArray(currentRows) ? currentRows : []).filter(row => row?.applied_by === 'user')
  const desiredTagIds = new Set<string>()

  for (const tag of desiredTags) {
    const ensured = await ensureTag(tag)
    if (!ensured?.id) continue

    desiredTagIds.add(ensured.id)
    await rest('/item_tags', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        item_id: itemId,
        tag_id: ensured.id,
        applied_by: 'user',
      }),
    })
  }

  for (const row of currentUserRows) {
    if (!row?.tag_id || desiredTagIds.has(row.tag_id)) continue
    await rest(
      `/item_tags?item_id=eq.${encodeURIComponent(itemId)}&tag_id=eq.${encodeURIComponent(row.tag_id)}&applied_by=eq.user`,
      { method: 'DELETE' }
    )
  }

  return fetchItem(itemId)
}

// ── Folders ──
export async function fetchFolders() {
  const data = await rest('/folders?select=*&order=created_at.asc')
  return (data || []).map(folderFromDb)
}

export async function createFolder(name, parentId = null) {
  const data = await rest('/folders?select=*', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ name, parent_id: parentId || null }),
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
  await rest(`/items?folder_id=eq.${id}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ folder_id: null }),
  })
  await rest(`/folders?id=eq.${id}`, { method: 'DELETE' })
}

// ── Storage ──
const BUCKET = 'attachments'

export async function uploadFile(file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'bin'
  const currentUserId = await getCurrentUserId()
  const path = `${currentUserId || 'anonymous'}/${crypto.randomUUID()}.${ext}`
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: await getHeaders({
      'Content-Type': file.type || 'application/octet-stream',
      'x-upsert': 'false',
    }),
    body: file,
  })
  if (!res.ok) throw new Error(`Upload failed: ${await res.text()}`)
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`
}

export async function deleteFile(publicUrl: string): Promise<void> {
  // 从公开 URL 提取路径
  const marker = `/object/public/${BUCKET}/`
  const idx = publicUrl.indexOf(marker)
  if (idx === -1) return
  const path = publicUrl.slice(idx + marker.length)
  await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'DELETE',
    headers: await getHeaders(),
  })
}

// ── DB mapping ──
function itemToDb(item: Partial<BookmarkItem>): DbRow {
  const row: DbRow = {}
  if (item.title !== undefined) row.title = item.title
  if (item.url !== undefined) row.url = item.url
  if (item.type !== undefined) row.type = item.type
  if (item.note !== undefined) row.note = item.note
  if (item.thumbnail !== undefined) row.thumbnail = item.thumbnail
  if (item.source !== undefined) row.source = item.source
  if (item.folderId !== undefined) row.folder_id = item.folderId || null
  if (item.summary !== undefined) row.summary = item.summary
  if (item.categoryId !== undefined) row.category_id = item.categoryId
  if (item.aiStatus !== undefined) row.ai_status = item.aiStatus
  if (item.tags !== undefined) {
    row.tags = Array.isArray(item.tags)
      ? item.tags
          .map(tag => (typeof tag === 'string' ? tag : String(tag?.name || '').trim()))
          .filter(Boolean)
      : []
  }
  return row
}

function itemFromDb(row: DbRow) {
  return {
    id: row.id,
    title: row.title || '',
    url: row.url || '',
    type: row.type || 'article',
    note: row.note || '',
    tags: normalizeItemTags(row.item_tags, row.tags),
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

function normalizeItemTags(itemTagRows: unknown, legacyTags: unknown): ItemTag[] {
  if (Array.isArray(itemTagRows)) {
    const result: ItemTag[] = []
    const seen = new Set<string>()

    for (const relation of itemTagRows) {
      const rawTag = Array.isArray(relation?.tags) ? relation.tags[0] : relation?.tags
      const id = typeof rawTag?.id === 'string' ? rawTag.id : null
      const name = String(rawTag?.name || '').trim()
      const type = String(rawTag?.type || '').trim().toLowerCase()
      if (!id || !name || !['content', 'status', 'source', 'format'].includes(type)) continue

      const appliedBy = relation?.applied_by === 'user' ? 'user' : 'ai'
      const key = `${id}:${appliedBy}`
      if (seen.has(key)) continue
      seen.add(key)
      result.push({ id, name, type: type as ItemTag['type'], appliedBy })
    }

    const legacyOrder = Array.isArray(legacyTags)
      ? legacyTags
          .map(tag => (typeof tag === 'string' ? tag.trim().toLowerCase() : ''))
          .filter(Boolean)
      : []

    if (legacyOrder.length > 0) {
      const orderMap = new Map<string, number>()
      legacyOrder.forEach((tagName, index) => {
        if (!orderMap.has(tagName)) orderMap.set(tagName, index)
      })

      result.sort((a, b) => {
        const aIndex = orderMap.get(a.name.trim().toLowerCase())
        const bIndex = orderMap.get(b.name.trim().toLowerCase())
        if (aIndex === undefined && bIndex === undefined) return 0
        if (aIndex === undefined) return 1
        if (bIndex === undefined) return -1
        return aIndex - bIndex
      })
    }

    return result
  }

  return Array.isArray(legacyTags)
    ? legacyTags
        .filter(tag => typeof tag === 'string' && tag.trim())
        .map((tag, index) => ({
          id: `legacy-${index}-${tag}`,
          name: tag,
          type: 'content' as const,
          appliedBy: 'ai' as const,
        }))
    : []
}

function folderFromDb(row) {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parent_id || null,
    createdAt: row.created_at,
  }
}
