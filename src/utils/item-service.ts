import {
  createItem as createItemRecord,
  fetchItem,
  fetchItemByUrl,
  type BookmarkItem,
  type ItemTag,
  replaceUserTagsForItem,
  updateItem as updateItemRecord,
} from '@/utils/supabase'
import { getCurrentUserId, isDevAuthBypassEnabled } from '@/utils/auth'

interface ClassificationPreview {
  type?: string
  category_id?: string
  confidence?: 'high' | 'medium' | 'low'
  summary?: string
  tags?: Array<{ name: string; type: ItemTag['type'] }>
}

interface FileSummaryPreview {
  title?: string
  summary?: string
  tags?: Array<{ name: string; type: ItemTag['type'] }>
  textLength?: number
}

export interface KnowledgeDraft {
  title: string
  summary: string
  categoryId?: string | null
  confidence?: 'high' | 'medium' | 'low' | null
  tags: ConfirmedTagDraft[]
}

export interface ConfirmedTagDraft {
  name: string
  type: ItemTag['type']
  appliedBy: 'ai' | 'user'
}

export class DuplicateUrlError extends Error {
  existingItemId?: string

  constructor(message = '该链接已存在', existingItemId?: string) {
    super(message)
    this.name = 'DuplicateUrlError'
    this.existingItemId = existingItemId
  }
}

type ClassificationSaveFields = {
  summary?: string
  categoryId?: string | null
  confidence?: 'high' | 'medium' | 'low' | null
  tags?: ConfirmedTagDraft[]
}

function shouldClassify(item: Partial<BookmarkItem>) {
  return Boolean(item.url)
}

function shouldReclassify(changes: Partial<BookmarkItem>) {
  return (
    changes.url !== undefined ||
    changes.title !== undefined ||
    changes.note !== undefined ||
    changes.type !== undefined ||
    changes.summary !== undefined ||
    changes.categoryId !== undefined ||
    changes.confidence !== undefined ||
    Array.isArray(changes.tags)
  )
}

function normalizeComparableUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''

  try {
    const parsed = new URL(trimmed)
    parsed.hash = ''

    if (parsed.pathname !== '/' && parsed.pathname.endsWith('/')) {
      parsed.pathname = parsed.pathname.replace(/\/+$/, '')
    }

    return parsed.toString()
  } catch {
    return trimmed
  }
}

async function assertUrlNotDuplicated(url: string | null | undefined, currentItemId?: string) {
  const normalizedUrl = typeof url === 'string' ? normalizeComparableUrl(url) : ''
  if (!normalizedUrl) return

  const existingItem = await fetchItemByUrl(normalizedUrl) as BookmarkItem | null
  if (!existingItem?.id) return
  if (currentItemId && existingItem.id === currentItemId) return

  throw new DuplicateUrlError('该链接已存在，不能重复保存', existingItem.id)
}

export async function classifyPreview(
  input: { url: string; title?: string; note?: string },
  options: { signal?: AbortSignal } = {}
) {
  if (isDevAuthBypassEnabled()) {
    return {
      type: 'article',
      confidence: 'medium' as const,
      summary: `本地 Mock 草稿：${(input.note || input.title || input.url).slice(0, 80)}`,
      tags: [
        { name: '待确认', type: 'status' as ItemTag['type'] },
        { name: '网页', type: 'format' as ItemTag['type'] },
      ],
    }
  }

  try {
    const userId = await getCurrentUserId()
    const response = await fetch('/api/classify', {
      method: 'POST',
      signal: options.signal,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: input.url,
        title: input.title || '',
        note: input.note || '',
        userId,
      }),
    })

    if (!response.ok) {
      console.error('[PB] classify preview failed', await response.text())
      return null
    }

    return (await response.json()) as ClassificationPreview
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw error
    }
    console.error('[PB] classify preview error:', error)
    return null
  }
}

export async function summarizeFilePreview(
  input: { fileName: string; mimeType?: string; fileDataBase64?: string; fileUrl?: string },
  options: { signal?: AbortSignal } = {}
) {
  if (isDevAuthBypassEnabled()) {
    return {
      title: input.fileName || '本地资料',
      summary: `本地 Mock 草稿：${input.fileName || '这份资料'} 已保存为原材料，可确认后入库。`,
      tags: [
        { name: '待确认', type: 'status' as ItemTag['type'] },
        { name: input.mimeType === 'text/plain' ? '灵感' : '资料', type: 'format' as ItemTag['type'] },
      ],
      textLength: 0,
    }
  }

  const userId = await getCurrentUserId()
  const response = await fetch('/api/summarize-file', {
    method: 'POST',
    signal: options.signal,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileName: input.fileName,
      mimeType: input.mimeType || '',
      fileDataBase64: input.fileDataBase64 || undefined,
      fileUrl: input.fileUrl || undefined,
      userId,
    }),
  })

  if (!response.ok) {
    let message = '加工暂时失败，请稍后再试'
    try {
      const data = await response.json()
      if (typeof data?.error === 'string') message = data.error
    } catch {
      // keep fallback message
    }
    throw new Error(message)
  }

  return (await response.json()) as FileSummaryPreview
}

function encodeTextAsBase64(text: string) {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

function getFileNameFromItem(item: BookmarkItem) {
  if (item.title?.trim()) return item.title.trim()

  try {
    const parsed = new URL(item.url || '')
    const lastSegment = decodeURIComponent(parsed.pathname.split('/').filter(Boolean).pop() || '')
    return lastSegment || '上传资料'
  } catch {
    return '上传资料'
  }
}

function toAiDraftTags(tags?: Array<{ name: string; type: ItemTag['type'] }>): ConfirmedTagDraft[] {
  return Array.isArray(tags)
    ? tags.map(tag => ({
        name: tag.name,
        type: tag.type,
        appliedBy: 'ai' as const,
      }))
    : []
}

function getLocalMockFormatTag(item: BookmarkItem): ConfirmedTagDraft {
  if (item.type === 'file') return { name: '资料', type: 'format', appliedBy: 'ai' }
  if (item.type === 'note' || !item.url) return { name: '灵感', type: 'format', appliedBy: 'ai' }
  return { name: '网页', type: 'format', appliedBy: 'ai' }
}

function generateLocalMockKnowledgeDraft(item: BookmarkItem): KnowledgeDraft {
  const title = item.title?.trim() || getFileNameFromItem(item) || '未命名内容'
  const sourceText = item.note?.trim() || item.summary?.trim() || item.url || '这条原材料'
  return {
    title,
    summary: `本地 Mock 草稿：${sourceText.slice(0, 80)}${sourceText.length > 80 ? '…' : ''}`,
    categoryId: item.categoryId ?? null,
    confidence: 'medium',
    tags: [
      { name: '待确认', type: 'status', appliedBy: 'ai' },
      getLocalMockFormatTag(item),
    ],
  }
}

function toStoredItemTags(tags: ConfirmedTagDraft[]): ItemTag[] {
  return tags.map((tag, index) => ({
    id: `local-confirmed-${index}-${tag.type}-${tag.name}`,
    name: tag.name,
    type: tag.type,
    appliedBy: tag.appliedBy,
  }))
}

export async function generateKnowledgeDraft(item: BookmarkItem): Promise<KnowledgeDraft> {
  if (isDevAuthBypassEnabled()) {
    return generateLocalMockKnowledgeDraft(item)
  }

  if (item.type === 'file') {
    const result = await summarizeFilePreview({
      fileName: getFileNameFromItem(item),
      fileUrl: item.url || '',
    })
    return {
      title: result.title?.trim() || item.title || '未命名资料',
      summary: result.summary?.trim() || '',
      tags: toAiDraftTags(result.tags),
    }
  }

  if (item.type === 'note' || !item.url) {
    const text = item.note || item.summary || item.title || ''
    const result = await summarizeFilePreview({
      fileName: `${item.title || '灵感记录'}.txt`,
      mimeType: 'text/plain',
      fileDataBase64: encodeTextAsBase64(text),
    })
    return {
      title: result.title?.trim() || item.title || '灵感记录',
      summary: result.summary?.trim() || '',
      tags: toAiDraftTags(result.tags),
    }
  }

  const result = await classifyPreview({
    url: item.url,
    title: item.title,
    note: item.note,
  })
  if (!result) {
    throw new Error('加工暂时失败，请稍后再试')
  }

  return {
    title: item.title || item.url || '未命名收藏',
    summary: result?.summary?.trim() || '',
    categoryId: result?.category_id ?? null,
    confidence: result?.confidence ?? null,
    tags: toAiDraftTags(result?.tags),
  }
}

async function resolveFinalItem(item: BookmarkItem, classification: Record<string, unknown> | null) {
  if (!classification) {
    return item
  }

  const refreshed = item.id ? (await fetchItem(item.id)) as BookmarkItem | null : null
  return mergeClassification(refreshed || item, classification)
}

async function resolveFinalItemWithUserTagFallback(
  item: BookmarkItem,
  classification: Record<string, unknown> | null,
  confirmedTags: ConfirmedTagDraft[] | undefined
) {
  if (classification) {
    return resolveFinalItem(item, classification)
  }

  const hasExplicitUserTags = Array.isArray(confirmedTags)
  const desiredUserTags = (hasExplicitUserTags ? confirmedTags : []).filter(tag => tag.appliedBy === 'user')
  if (!item.id || !hasExplicitUserTags) {
    return item
  }

  try {
    const refreshed = await replaceUserTagsForItem(
      item.id,
      desiredUserTags.map(tag => ({
        name: tag.name,
        type: tag.type,
      }))
    )
    return refreshed || item
  } catch (error) {
    console.error('[PB] user tag fallback save failed:', error)
    return {
      ...item,
      tags: desiredUserTags.map((tag, index) => ({
        id: `local-user-${index}-${tag.type}-${tag.name}`,
        name: tag.name,
        type: tag.type,
        appliedBy: 'user' as const,
      })),
    }
  }
}

async function applyClassification(item: BookmarkItem) {
  return applyConfirmedClassification(item, {})
}

async function applyConfirmedClassification(item: BookmarkItem, confirmed: ClassificationSaveFields) {
  const userId = await getCurrentUserId()
  const confirmedPayload = {
    category_id: confirmed.categoryId ?? null,
    confidence: confirmed.confidence ?? null,
    summary: confirmed.summary ?? '',
    tags: Array.isArray(confirmed.tags)
      ? confirmed.tags.map(tag => ({
          name: tag.name,
          type: tag.type,
          appliedBy: tag.appliedBy,
        }))
      : [],
  }

  try {
    const response = await fetch('/api/classify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        itemId: item.id,
        url: item.url,
        title: item.title,
        note: item.note,
        userId,
        apply: true,
        confirmed: confirmedPayload,
      }),
    })

    if (!response.ok) {
      console.error('[PB] classify apply failed', await response.text())
      return null
    }

    return (await response.json()) as Record<string, unknown>
  } catch (error) {
    console.error('[PB] classify apply error:', error)
    return null
  }
}

function normalizeServiceTags(tags: unknown): ItemTag[] {
  if (!Array.isArray(tags)) return []

  return tags
    .map(tag => {
      if (!tag || typeof tag !== 'object') return null
      const id = typeof tag.id === 'string' ? tag.id : null
      const name = typeof tag.name === 'string' ? tag.name : ''
      const type =
        tag.type === 'content' || tag.type === 'status' || tag.type === 'source' || tag.type === 'format'
          ? tag.type
          : null
      const appliedBy = tag.appliedBy === 'user' ? 'user' : 'ai'
      if (!id || !name || !type) return null
      return { id, name, type, appliedBy }
    })
    .filter(Boolean) as ItemTag[]
}

function mergeClassification(item: BookmarkItem, classification: Record<string, unknown>): BookmarkItem {
  return {
    ...item,
    type: typeof classification.type === 'string' ? classification.type : item.type,
    summary: typeof classification.summary === 'string' ? classification.summary : item.summary,
    categoryId: typeof classification.category_id === 'string' ? classification.category_id : item.categoryId,
    confidence:
      classification.confidence === 'high' || classification.confidence === 'medium' || classification.confidence === 'low'
        ? classification.confidence
        : item.confidence,
    tags: normalizeServiceTags(classification.tags),
    aiStatus: 'completed',
  }
}

export async function createItemWithClassification(item: Partial<BookmarkItem>) {
  const normalizedUrl = typeof item.url === 'string' ? normalizeComparableUrl(item.url) : item.url
  await assertUrlNotDuplicated(normalizedUrl)
  const created = await createItemRecord({
    ...item,
    url: normalizedUrl,
  }) as BookmarkItem
  const hasKnowledgeFields =
    item.summary !== undefined ||
    item.categoryId !== undefined ||
    item.confidence !== undefined
  const confirmedTags = Array.isArray(item.tags) ? (item.tags as ConfirmedTagDraft[]) : undefined

  if (!created.id) {
    return created
  }

  if (isDevAuthBypassEnabled()) {
    return created
  }

  if (!hasKnowledgeFields) {
    return resolveFinalItemWithUserTagFallback(created, null, confirmedTags)
  }

  const classified = await applyConfirmedClassification(created, {
    summary: item.summary,
    categoryId: item.categoryId ?? null,
    confidence: item.confidence ?? null,
    tags: confirmedTags || [],
  })
  return resolveFinalItemWithUserTagFallback(created, classified, confirmedTags)
}

export async function updateItemWithClassification(id: string, changes: Partial<BookmarkItem>) {
  const normalizedUrl = typeof changes.url === 'string' ? normalizeComparableUrl(changes.url) : changes.url
  if (changes.url !== undefined) {
    await assertUrlNotDuplicated(normalizedUrl, id)
  }
  const updated = await updateItemRecord(id, {
    ...changes,
    ...(changes.url !== undefined ? { url: normalizedUrl } : {}),
  }) as BookmarkItem
  const hasKnowledgeFields =
    changes.summary !== undefined ||
    changes.categoryId !== undefined ||
    changes.confidence !== undefined
  const confirmedTags = Array.isArray(changes.tags) ? (changes.tags as ConfirmedTagDraft[]) : undefined

  if (!updated.id || !shouldReclassify(changes)) {
    return updated
  }

  if (isDevAuthBypassEnabled()) {
    return updated
  }

  if (!hasKnowledgeFields) {
    return resolveFinalItemWithUserTagFallback(updated, null, confirmedTags)
  }

  const classified = await applyConfirmedClassification(updated, {
    summary: changes.summary,
    categoryId: changes.categoryId ?? null,
    confidence: changes.confidence ?? null,
    tags: confirmedTags || [],
  })
  return resolveFinalItemWithUserTagFallback(updated, classified, confirmedTags)
}

export async function confirmKnowledgeEntry(item: BookmarkItem, draft: KnowledgeDraft) {
  if (!item.id) throw new Error('Missing item id')

  if (isDevAuthBypassEnabled()) {
    return updateItemRecord(item.id, {
      title: draft.title || item.title,
      summary: draft.summary,
      categoryId: draft.categoryId ?? item.categoryId ?? null,
      confidence: draft.confidence ?? item.confidence ?? null,
      aiStatus: 'completed',
      tags: toStoredItemTags(draft.tags),
    } as Partial<BookmarkItem>) as Promise<BookmarkItem>
  }

  const updated = await updateItemRecord(item.id, {
    title: draft.title || item.title,
  }) as BookmarkItem

  const classified = await applyConfirmedClassification(updated, {
    summary: draft.summary,
    categoryId: draft.categoryId ?? item.categoryId ?? null,
    confidence: draft.confidence ?? item.confidence ?? null,
    tags: draft.tags,
  })

  return resolveFinalItemWithUserTagFallback(updated, classified, draft.tags)
}

export async function refreshItemAfterClassification(id: string) {
  return fetchItem(id) as Promise<BookmarkItem | null>
}
