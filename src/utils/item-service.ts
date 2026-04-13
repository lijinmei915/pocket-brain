import {
  createItem as createItemRecord,
  fetchItem,
  type BookmarkItem,
  type ItemTag,
  updateItem as updateItemRecord,
} from '@/utils/supabase'

interface ClassificationPreview {
  type?: string
  category_id?: string
  confidence?: 'high' | 'medium' | 'low'
  summary?: string
  tags?: Array<{ name: string; type: ItemTag['type'] }>
}

function shouldClassify(item: Partial<BookmarkItem>) {
  return Boolean(item.url)
}

function shouldReclassify(changes: Partial<BookmarkItem>) {
  return changes.url !== undefined || changes.title !== undefined || changes.note !== undefined
}

export async function classifyPreview(input: { url: string; title?: string; note?: string }) {
  try {
    const response = await fetch('/api/classify', {
      method: 'POST',
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
    console.error('[PB] classify preview error:', error)
    return null
  }
}

async function applyClassification(item: BookmarkItem) {
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
  const created = await createItemRecord(item)

  if (!shouldClassify(created) || !created.id) {
    return created
  }

  const classified = await applyClassification(created)
  return classified ? mergeClassification(created, classified) : created
}

export async function updateItemWithClassification(id: string, changes: Partial<BookmarkItem>) {
  const updated = await updateItemRecord(id, changes)

  if (!updated.id || !shouldClassify(updated) || !shouldReclassify(changes)) {
    return updated
  }

  const classified = await applyClassification(updated)
  return classified ? mergeClassification(updated, classified) : updated
}

export async function refreshItemAfterClassification(id: string) {
  return fetchItem(id)
}
