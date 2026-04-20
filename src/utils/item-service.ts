import {
  createItem as createItemRecord,
  fetchItem,
  fetchItemByUrl,
  type BookmarkItem,
  type ItemTag,
  replaceUserTagsForItem,
  updateItem as updateItemRecord,
} from '@/utils/supabase'

interface ClassificationPreview {
  type?: string
  category_id?: string
  confidence?: 'high' | 'medium' | 'low'
  summary?: string
  tags?: Array<{ name: string; type: ItemTag['type'] }>
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

  const existingItem = await fetchItemByUrl(normalizedUrl)
  if (!existingItem?.id) return
  if (currentItemId && existingItem.id === currentItemId) return

  throw new DuplicateUrlError('该链接已存在，不能重复保存', existingItem.id)
}

export async function classifyPreview(
  input: { url: string; title?: string; note?: string },
  options: { signal?: AbortSignal } = {}
) {
  try {
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

async function resolveFinalItem(item: BookmarkItem, classification: Record<string, unknown> | null) {
  if (!classification) {
    return item
  }

  const refreshed = item.id ? await fetchItem(item.id) : null
  return refreshed || mergeClassification(item, classification)
}

async function resolveFinalItemWithUserTagFallback(
  item: BookmarkItem,
  classification: Record<string, unknown> | null,
  confirmedTags: ConfirmedTagDraft[] | undefined
) {
  if (classification) {
    return resolveFinalItem(item, classification)
  }

  const desiredUserTags = (Array.isArray(confirmedTags) ? confirmedTags : []).filter(tag => tag.appliedBy === 'user')
  if (!item.id || desiredUserTags.length === 0) {
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
      const type = tag.type === 'content' || tag.type === 'status' || tag.type === 'source' ? tag.type : null
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
  })
  const hasConfirmedFields =
    item.summary !== undefined ||
    item.categoryId !== undefined ||
    item.confidence !== undefined ||
    Array.isArray(item.tags)

  if (!shouldClassify(created) || !created.id) {
    return created
  }

  const classified = hasConfirmedFields
    ? await applyConfirmedClassification(created, {
        summary: item.summary,
        categoryId: item.categoryId ?? null,
        confidence: item.confidence ?? null,
        tags: Array.isArray(item.tags) ? (item.tags as ConfirmedTagDraft[]) : [],
      })
    : await applyClassification(created)
  return resolveFinalItemWithUserTagFallback(
    created,
    classified,
    Array.isArray(item.tags) ? (item.tags as ConfirmedTagDraft[]) : undefined
  )
}

export async function updateItemWithClassification(id: string, changes: Partial<BookmarkItem>) {
  const normalizedUrl = typeof changes.url === 'string' ? normalizeComparableUrl(changes.url) : changes.url
  if (changes.url !== undefined) {
    await assertUrlNotDuplicated(normalizedUrl, id)
  }
  const updated = await updateItemRecord(id, {
    ...changes,
    ...(changes.url !== undefined ? { url: normalizedUrl } : {}),
  })
  const hasConfirmedFields =
    changes.summary !== undefined ||
    changes.categoryId !== undefined ||
    changes.confidence !== undefined ||
    Array.isArray(changes.tags)

  if (!updated.id || !shouldClassify(updated) || !shouldReclassify(changes)) {
    return updated
  }

  const classified = hasConfirmedFields
    ? await applyConfirmedClassification(updated, {
        summary: changes.summary,
        categoryId: changes.categoryId ?? null,
        confidence: changes.confidence ?? null,
        tags: Array.isArray(changes.tags) ? (changes.tags as ConfirmedTagDraft[]) : [],
      })
    : await applyClassification(updated)
  return resolveFinalItemWithUserTagFallback(
    updated,
    classified,
    Array.isArray(changes.tags) ? (changes.tags as ConfirmedTagDraft[]) : undefined
  )
}

export async function refreshItemAfterClassification(id: string) {
  return fetchItem(id)
}
