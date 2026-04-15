import { useState, useRef, useEffect } from 'react'
import {
  Upload, X, Image, FileArchive, Music, Loader2, Video, Check,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TagChip, getTagChipTone } from '@/components/ui/tag-chip'
import { cn } from '@/lib/utils'
import { fetchUserTagLibrary, uploadFile } from '@/utils/supabase'
import { classifyPreview } from '@/utils/item-service'
import type { ConfirmedTagDraft } from '@/utils/item-service'
import type { BookmarkItem, ItemTag } from '@/utils/supabase'

// ── 常量 ──────────────────────────────────────────────────────────────────────

const TYPES = ['article', 'video', 'audio', 'tweet', 'other'] as const

const FILE_HINTS: { test: (f: File) => boolean; limit: number; message: string }[] = [
  { test: f => f.type.startsWith('video/'), limit: 50, message: '视频超过 50MB，建议上传到视频平台后用链接收藏' },
  { test: f => f.type.startsWith('audio/'), limit: 50, message: '音频超过 50MB，建议剪辑压缩后再上传' },
  { test: f => f.type.startsWith('image/'), limit: 10, message: '图片超过 10MB，建议压缩后上传' },
  { test: () => true,                        limit: 20, message: '文件超过 20MB，建议存到云盘后复制链接收藏' },
]

const INBOX = '__inbox__'
const TOTAL_LIMIT_MB = 20
const AUTO_CLASSIFY_TIMEOUT_MS = 4000

// ── 工具函数 ─────────────────────────────────────────────────────────────────

function guessType(url: string) {
  const u = (url || '').toLowerCase()
  if (/youtube\.com|youtu\.be|vimeo\.com|bilibili\.com/.test(u)) return 'video'
  if (/twitter\.com|x\.com|weibo\.com|xiaohongshu/.test(u)) return 'tweet'
  if (/spotify\.com|podcast|\.mp3|\.wav/.test(u)) return 'audio'
  return 'article'
}

function buildOptions(folders, list, depth = 0) {
  return list.flatMap(f => {
    const prefix = depth > 0 ? '\u00a0\u00a0'.repeat(depth) + '└ ' : ''
    const children = folders.filter(c => c.parentId === f.id)
    return [
      { value: f.id, name: f.name, label: prefix + f.name },
      ...buildOptions(folders, children, depth + 1),
    ]
  })
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(file: File) {
  if (file.type.startsWith('image/')) return Image
  if (file.type.startsWith('audio/')) return Music
  if (file.type.startsWith('video/')) return Video
  return FileArchive
}

function getSingleFileHint(file: File): string | null {
  const rule = FILE_HINTS.find(r => r.test(file))
  if (!rule) return null
  return file.size / (1024 * 1024) > rule.limit ? rule.message : null
}

function normalizeUrlInput(value: string) {
  return value.trim()
}

function isValidHttpUrl(value: string) {
  const normalized = normalizeUrlInput(value)
  if (!normalized) return false

  try {
    const parsed = new URL(normalized)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function isSameTag(a: Pick<ConfirmedTagDraft, 'name' | 'type'>, b: Pick<ConfirmedTagDraft, 'name' | 'type'>) {
  return a.type === b.type && a.name.trim().toLowerCase() === b.name.trim().toLowerCase()
}

function normalizeDraftTag(name: string, type: ItemTag['type']): ConfirmedTagDraft | null {
  const normalizedName = name.replace(/^#/, '').trim()
  if (!normalizedName) return null
  return {
    name: normalizedName,
    type,
    appliedBy: 'user',
  }
}

function getTagIdentity(tag: Pick<ConfirmedTagDraft, 'name' | 'type' | 'appliedBy'>) {
  return `${tag.type}:${tag.appliedBy}:${tag.name.trim().toLowerCase()}`
}

function getTagMatchKey(tag: Pick<ConfirmedTagDraft, 'name' | 'type'>) {
  return `${tag.type}:${tag.name.trim().toLowerCase()}`
}

function normalizeTagText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['".,!?()[\]{}\-_/\\]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildTagSearchTokens(value: string) {
  const normalized = normalizeTagText(value)
  if (!normalized) return []

  const compact = normalized.replace(/\s+/g, '')
  const singular = normalized.endsWith('s') && normalized.length > 3
    ? normalized.slice(0, -1)
    : normalized

  return Array.from(new Set([normalized, compact, singular.replace(/\s+/g, '')].filter(Boolean)))
}

function resolveCanonicalTag(
  tag: ConfirmedTagDraft,
  tagLibrary: Array<{ name: string; type: ItemTag['type'] }>
): ConfirmedTagDraft {
  const candidates = tagLibrary.filter(candidate => candidate.type === tag.type)
  if (candidates.length === 0) return tag

  const sourceTokens = buildTagSearchTokens(tag.name)
  if (sourceTokens.length === 0) return tag

  const exactMatch = candidates.find(candidate => {
    const candidateTokens = buildTagSearchTokens(candidate.name)
    return candidateTokens.some(token => sourceTokens.includes(token))
  })
  if (exactMatch) {
    return { ...tag, name: exactMatch.name }
  }

  const inclusiveMatch = candidates.find(candidate => {
    const candidateTokens = buildTagSearchTokens(candidate.name)
    return candidateTokens.some(candidateToken =>
      sourceTokens.some(sourceToken =>
        candidateToken.length >= 2 &&
        sourceToken.length >= 2 &&
        (candidateToken.includes(sourceToken) || sourceToken.includes(candidateToken))
      )
    )
  })

  return inclusiveMatch ? { ...tag, name: inclusiveMatch.name } : tag
}

function resolveExactCanonicalTag(
  tag: ConfirmedTagDraft,
  tagLibrary: Array<{ name: string; type: ItemTag['type'] }>
): ConfirmedTagDraft {
  const candidates = tagLibrary.filter(candidate => candidate.type === tag.type)
  if (candidates.length === 0) return tag

  const sourceTokens = buildTagSearchTokens(tag.name)
  if (sourceTokens.length === 0) return tag

  const exactMatch = candidates.find(candidate => {
    const candidateTokens = buildTagSearchTokens(candidate.name)
    return candidateTokens.some(token => sourceTokens.includes(token))
  })

  return exactMatch ? { ...tag, name: exactMatch.name } : tag
}

function dedupeTags(tags: ConfirmedTagDraft[]) {
  const result: ConfirmedTagDraft[] = []

  for (const tag of tags) {
    if (!result.some(existing => isSameTag(existing, tag))) {
      result.push(tag)
    }
  }
  return result
}

function mergeTagOrder(currentOrder: ConfirmedTagDraft[], availableTags: ConfirmedTagDraft[]) {
  const remaining = currentOrder.filter(tag =>
    availableTags.some(existing => getTagIdentity(existing) === getTagIdentity(tag))
  )
  const appended = availableTags.filter(tag =>
    !remaining.some(existing => getTagIdentity(existing) === getTagIdentity(tag))
  )

  return [...remaining, ...appended]
}

function moveTag(tags: ConfirmedTagDraft[], fromIndex: number, toIndex: number) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return tags
  const next = [...tags]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return next
}

let pasteCounter = 0

// ── Props ─────────────────────────────────────────────────────────────────────

export interface SaveData {
  id?: string
  url: string | null
  title: string
  type: string
  note: string
  folderId: string | null
  summary?: string
  categoryId?: string | null
  confidence?: 'high' | 'medium' | 'low' | null
  tags?: ConfirmedTagDraft[]
}

interface SaveFormProps {
  folders: { id: string; name: string; parentId?: string | null }[]
  initialUrl?: string
  initialTitle?: string
  defaultFolderId?: string | null
  editItem?: BookmarkItem | null
  onSave: (data: SaveData) => Promise<void>
  onCancel: () => void
  renderFooter?: (props: {
    canSave: boolean
    saving: boolean
    overLimit: boolean
    isEdit: boolean
    footerMessage: string
    primaryLabel: string
    primaryDisabled: boolean
    onSave: () => Promise<void>
    onCancel: () => void
  }) => React.ReactNode
}

// ── 组件 ─────────────────────────────────────────────────────────────────────

export default function SaveForm({
  folders,
  initialUrl = '',
  initialTitle = '',
  defaultFolderId,
  editItem,
  onSave,
  onCancel,
  renderFooter,
}: SaveFormProps) {
  const isEdit = !!editItem

  // 初始 tab 由 editItem 决定
  const [tab, setTab] = useState<'bookmark' | 'note' | 'file'>(() =>
    editItem?.type === 'note' ? 'note' : 'bookmark'
  )

  // 收藏
  const [url,            setUrl]            = useState(editItem?.url   ?? initialUrl)
  const [title,          setTitle]          = useState(editItem?.title ?? initialTitle)
  const [titleTouched,   setTitleTouched]   = useState(false)
  const [fetchingTitle,  setFetchingTitle]  = useState(false)
  const [urlError, setUrlError] = useState('')
  const [type,           setType]           = useState(editItem?.type  ?? 'other')
  const [note,           setNote]           = useState(editItem?.type !== 'note' ? (editItem?.note ?? '') : '')
  const [typeTouched,    setTypeTouched]    = useState(!!editItem)
  const [classifyLoading, setClassifyLoading] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState('')
  const [previewCategoryId, setPreviewCategoryId] = useState<string | null>(editItem?.categoryId ?? null)
  const [previewConfidence, setPreviewConfidence] = useState<'high' | 'medium' | 'low' | null>(editItem?.confidence ?? null)
  const [previewTags, setPreviewTags] = useState<ConfirmedTagDraft[]>(
    []
  )
  const [selectedTags, setSelectedTags] = useState<ConfirmedTagDraft[]>(
    (editItem?.tags || []).map(tag => ({
      name: tag.name,
      type: tag.type,
      appliedBy: tag.appliedBy === 'user' ? 'user' as const : 'ai' as const,
    }))
  )
  const [tagLibrary, setTagLibrary] = useState<Array<{ name: string; type: ItemTag['type'] }>>([])
  const [dismissedSuggestionKeys, setDismissedSuggestionKeys] = useState<string[]>([])
  const [previewError, setPreviewError] = useState('')
  const [previewSlowMessage, setPreviewSlowMessage] = useState('')
  const [draftTagName, setDraftTagName] = useState('')
  const [tagInputError, setTagInputError] = useState('')
  const [saveError, setSaveError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const classifyRequestRef = useRef(0)
  const classifyAbortRef = useRef<AbortController | null>(null)
  const dragIndexRef = useRef<number | null>(null)
  const [draggingTagIndex, setDraggingTagIndex] = useState<number | null>(null)
  const [dragOverTagIndex, setDragOverTagIndex] = useState<number | null>(null)
  const lastFetchedTitleUrlRef = useRef('')
  const lastUrlRef = useRef(normalizeUrlInput(editItem?.url ?? initialUrl))
  const titleSourceRef = useRef<'initial' | 'auto' | 'manual'>(
    editItem?.title || initialTitle ? 'initial' : 'auto'
  )

  // initialTitle 异步到达时，只要用户没手动改过就填入
  useEffect(() => {
    if (initialTitle && !titleTouched) setTitle(initialTitle)
  }, [initialTitle])

  useEffect(() => {
    let active = true

    void fetchUserTagLibrary()
      .then(tags => {
        if (!active) return
        setTagLibrary(tags)
      })
      .catch(error => {
        console.error('[PB] fetch tag library failed:', error)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (tab !== 'bookmark') return undefined

    const trimmedUrl = normalizeUrlInput(url)
    if (!trimmedUrl) {
      setUrlError('')
      return undefined
    }

    if (!isValidHttpUrl(trimmedUrl)) {
      setUrlError('请输入有效的 http(s) 链接')
      return undefined
    }

    setUrlError('')

    const previousUrl = lastUrlRef.current
    if (trimmedUrl !== previousUrl) {
      lastUrlRef.current = trimmedUrl
      lastFetchedTitleUrlRef.current = ''

      if (titleSourceRef.current !== 'manual') {
        setTitle('')
      }
    }

    if (titleTouched || title.trim() || fetchingTitle) return undefined
    if (lastFetchedTitleUrlRef.current === trimmedUrl) return undefined

    const timer = window.setTimeout(() => {
      void (async () => {
        setFetchingTitle(true)
        try {
          const response = await fetch(`/api/fetch-title?url=${encodeURIComponent(trimmedUrl)}`)
          const data = await response.json()
          if (data?.title) {
            lastFetchedTitleUrlRef.current = trimmedUrl
            setTitle(data.title)
            titleSourceRef.current = 'auto'
          }
        } catch (error) {
          console.error('[PB] fetch title failed:', error)
        } finally {
          setFetchingTitle(false)
        }
      })()
    }, 150)

    return () => window.clearTimeout(timer)
  }, [url, tab, titleTouched, title, fetchingTitle])

  // URL / 标题 / 备注改变时，自动分类
  useEffect(() => {
    classifyAbortRef.current?.abort()

    if (tab !== 'bookmark') return undefined

    classifyRequestRef.current += 1
    const requestId = classifyRequestRef.current
    const trimmedUrl = normalizeUrlInput(url)

    if (!trimmedUrl) {
      setUrlError('')
      setClassifyLoading(false)
      setPreviewError('')
      setPreviewSlowMessage('')
      setPreviewCategoryId(null)
      setPreviewConfidence(null)
      setPreviewTags([])
      setDismissedSuggestionKeys([])
      return undefined
    }

    if (!isValidHttpUrl(trimmedUrl)) {
      setUrlError('请输入有效的 http(s) 链接')
      setClassifyLoading(false)
      setPreviewError('')
      setPreviewSlowMessage('')
      setPreviewCategoryId(null)
      setPreviewConfidence(null)
      setPreviewTags([])
      setDismissedSuggestionKeys([])
      return undefined
    }

    setUrlError('')

    if (isEdit) {
      setClassifyLoading(false)
      setPreviewError('')
      setPreviewSlowMessage('')
      setPreviewTags([])
      setDismissedSuggestionKeys([])
      return undefined
    }

    setPreviewError('')
    setPreviewSlowMessage('')
    setPreviewCategoryId(null)
    setPreviewConfidence(null)
    setPreviewTags([])
    setDismissedSuggestionKeys([])

    const controller = new AbortController()
    classifyAbortRef.current = controller
    const timer = window.setTimeout(() => {
      setClassifyLoading(true)
      void autoClassify(requestId, trimmedUrl, title, note, controller)
    }, 450)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
      if (classifyAbortRef.current === controller) {
        classifyAbortRef.current = null
      }
    }
  }, [url, title, tab])

  async function autoClassify(
    requestId: number,
    nextUrl: string,
    nextTitle: string,
    nextNote: string,
    controller: AbortController
  ) {
    if (!nextUrl) return
    const { signal } = controller
    const timeoutId = window.setTimeout(() => {
      if (requestId === classifyRequestRef.current) {
        setPreviewSlowMessage('AI 推荐分类较慢，标签可手动添加，或可直接保存')
      }
    }, AUTO_CLASSIFY_TIMEOUT_MS)

    try {
      const data = await classifyPreview({ url: nextUrl, title: nextTitle, note: nextNote }, { signal })
      if (requestId !== classifyRequestRef.current) return
      setPreviewSlowMessage('')
      if (!data) {
        setPreviewError('AI 预览暂时失败，可手动保存')
        return
      }
      if (data.type && !typeTouched) setType(data.type)
      setPreviewCategoryId(data.category_id || null)
      setPreviewConfidence(data.confidence || null)
      setPreviewTags(
        (Array.isArray(data.tags) ? data.tags : []).map(tag => ({
          name: tag.name,
          type: tag.type,
          appliedBy: 'ai' as const,
        }))
      )
    } catch (err) {
      if (signal.aborted || requestId !== classifyRequestRef.current) return
      console.error('[PB] classify error:', err)
      setPreviewSlowMessage('')
      setPreviewError('AI 预览暂时失败，可手动保存')
    } finally {
      window.clearTimeout(timeoutId)
      if (requestId === classifyRequestRef.current) {
        setClassifyLoading(false)
      }
      if (classifyAbortRef.current?.signal === signal) {
        classifyAbortRef.current = null
      }
    }
  }

  // 记录
  const [content, setContent] = useState(editItem?.type === 'note' ? (editItem?.note ?? '') : '')

  // 资源
  const [files,       setFiles]       = useState<File[]>([])
  const [fileTitle,   setFileTitle]   = useState('')
  const [dragOver,    setDragOver]    = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // 共享
  const [folderId, setFolderId] = useState(
    editItem?.folderId ?? defaultFolderId ?? INBOX
  )
  const [saving, setSaving] = useState(false)

  const folderOptions = buildOptions(folders, folders.filter(f => !f.parentId))
  const totalSizeMB   = files.reduce((sum, f) => sum + f.size / (1024 * 1024), 0)
  const overLimit     = totalSizeMB > TOTAL_LIMIT_MB
  const validFolderIds = new Set(folders.map(folder => folder.id))
  const canonicalPreviewTags = dedupeTags(previewTags.map(tag => resolveCanonicalTag(tag, tagLibrary)))
  const selectedTagKeys = new Set(selectedTags.map(getTagMatchKey))
  const dismissedSuggestionKeySet = new Set(dismissedSuggestionKeys)
  const suggestedTags = canonicalPreviewTags.filter(tag =>
    !selectedTagKeys.has(getTagMatchKey(tag)) &&
    !dismissedSuggestionKeySet.has(getTagMatchKey(tag))
  )
  const finalTags = selectedTags
  const previewReady = finalTags.length > 0 || Boolean(previewCategoryId)
  const previewPending = tab === 'bookmark' && classifyLoading
  const canSave = tab === 'note'
    ? content.trim().length > 0
    : tab === 'file'
      ? files.length > 0 && !overLimit
      : isValidHttpUrl(url)
  const footerMessage = tab === 'bookmark'
    ? saving
      ? '正在写入收藏与标签…'
      : saveError
        ? saveError
      : !isEdit && previewPending && previewSlowMessage
        ? previewSlowMessage
      : !isEdit && previewPending
        ? 'AI 正在预分类链接，你也可以直接保存'
      : urlError
          ? urlError
        : previewError
          ? 'AI 预览失败，可直接手动保存'
          : previewReady
            ? '已生成推荐标签，按最终已选标签保存'
            : '输入链接后会自动推荐标签'
    : tab === 'file'
      ? overLimit
        ? `文件总大小超过 ${TOTAL_LIMIT_MB}MB，暂时无法保存`
        : '保存时会先上传文件，再写入收藏'
      : '记录会直接保存到当前文件夹'
  const primaryLabel = saving
    ? isEdit ? '更新中…' : '保存中…'
    : isEdit ? '更新' : '保存'
  const primaryDisabled = !canSave || saving || overLimit

  function normalizeFolderId(value: string | null) {
    if (!value || value === INBOX) return null
    return validFolderIds.has(value) ? value : null
  }

  function renderFolderField() {
    return (
      <div>
        <label className="text-sm font-medium block mb-1">存入文件夹</label>
        <Select value={folderId} onValueChange={setFolderId}>
          <SelectTrigger>
            <SelectValue>
              {folderId === INBOX ? '稍后整理' : folderOptions.find(o => o.value === folderId)?.name ?? ''}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={INBOX}>稍后整理</SelectItem>
            {folderOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    )
  }

  async function submitSave(data: SaveData) {
    const payload = {
      ...data,
      folderId: normalizeFolderId(data.folderId ?? null),
    }
    console.log('[PB] save payload', payload)
    await onSave(payload)
  }

  function handleUrlChange(val: string) {
    setUrl(val)
    if (saveError) setSaveError('')
  }

  function handleRemoveSelectedTag(tagToRemove: ConfirmedTagDraft) {
    const removedKey = getTagMatchKey(tagToRemove)
    setSelectedTags(prev => prev.filter(tag => !isSameTag(tag, tagToRemove)))
    if (previewTags.some(tag => getTagMatchKey(tag) === removedKey)) {
      setDismissedSuggestionKeys(prev => prev.filter(key => key !== removedKey))
    }
  }

  function handleAddUserTag() {
    const draftTag = normalizeDraftTag(draftTagName, 'content')
    if (!draftTag) {
      setTagInputError('')
      return
    }

    const normalized = resolveExactCanonicalTag(draftTag, tagLibrary)
    const duplicateTag = selectedTags.find(tag => isSameTag(tag, normalized))
    if (duplicateTag) {
      setTagInputError(`标签“${duplicateTag.name}”已存在`)
      return
    }

    setTagInputError('')

    setSelectedTags(prev => {
      return [...prev, normalized]
    })
    const normalizedKey = getTagMatchKey(normalized)
    setDismissedSuggestionKeys(prev => prev.filter(key => key !== normalizedKey))
    setDraftTagName('')
  }

  function handleAcceptSuggestedTag(tag: ConfirmedTagDraft) {
    const acceptedKey = getTagMatchKey(tag)
    setSelectedTags(prev => dedupeTags([...prev, tag]))
    setDismissedSuggestionKeys(prev => prev.filter(key => key !== acceptedKey))
  }

  async function handleGenerateSummary() {
    const trimmedUrl = normalizeUrlInput(url)
    if (!isValidHttpUrl(trimmedUrl)) {
      setUrlError('请输入有效的 http(s) 链接')
      return
    }

    setUrlError('')
    setSummaryError('')
    setSummaryLoading(true)
    try {
      const data = await classifyPreview({ url: trimmedUrl, title, note: '' })
      const nextNote = data?.summary?.trim()
      if (!nextNote) {
        setSummaryError('暂未生成总结，你可以继续手写备注')
        return
      }
      setNote(nextNote)
    } catch (error) {
      console.error('[PB] generate summary failed:', error)
      setSummaryError('AI 总结暂时失败，请稍后再试')
    } finally {
      setSummaryLoading(false)
    }
  }

  function addFiles(incoming: File[]) {
    setFiles(prev => {
      if (prev.length === 0 && incoming.length > 0 && !fileTitle)
        setFileTitle(incoming[0].name)
      return [...prev, ...incoming]
    })
  }

  function handlePaste(e: React.ClipboardEvent) {
    if (tab !== 'file') return
    const images = Array.from(e.clipboardData?.items ?? [])
      .filter(i => i.type.startsWith('image/'))
      .map(i => {
        const f = i.getAsFile()
        if (!f) return null
        pasteCounter++
        return new File([f], `截图-${pasteCounter}.png`, { type: f.type })
      }).filter(Boolean) as File[]
    if (images.length) addFiles(images)
  }

  async function handleSave() {
    console.log('[PB] handleSave clicked', {
      tab,
      canSave,
      saving,
      overLimit,
      url,
      title,
      folderId,
    })
    setSaveError('')
    setSaving(true)
    try {
      if (tab === 'note') {
        if (!content.trim()) return
        await submitSave({
          ...(isEdit ? { id: editItem.id } : {}),
          url: null, type: 'note',
          title: content.trim().slice(0, 20) || '无标题',
          note: content.trim(),
          folderId,
        })
      } else if (tab === 'file') {
        if (files.length === 0) return
        setUploadError(null)
        for (const file of files) {
          const publicUrl = await uploadFile(file)
          await submitSave({
            url: publicUrl,
            title: fileTitle.trim() || file.name,
            type: 'file',
            note: '',
            folderId,
          })
        }
      } else {
        if (!url.trim()) return
        await submitSave({
          ...(isEdit ? { id: editItem.id } : {}),
          url: url.trim(),
          title: title.trim() || '无标题',
          type, note: note.trim(),
          folderId,
          categoryId: previewCategoryId,
          confidence: previewConfidence,
          // 最终保存结果以对话框中最后留下的标签为准
          tags: finalTags,
        })
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : '保存失败，请稍后重试')
    } finally {
      setSaving(false)
    }
  }

  function handleTagDragStart(index: number) {
    dragIndexRef.current = index
    setDraggingTagIndex(index)
  }

  function handleTagDrop(dropIndex: number) {
    const dragIndex = dragIndexRef.current
    dragIndexRef.current = null
    setDraggingTagIndex(null)
    setDragOverTagIndex(null)
    if (dragIndex === null || dragIndex === dropIndex) return
    setSelectedTags(prev => moveTag(prev, dragIndex, dropIndex))
  }

  // 两个 Fragment 子节点作为 flex 容器（父）的直接子元素
  return (
    <>
      {/* 可滚动表单区 */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-2 pb-3 space-y-4" onPaste={handlePaste}>

        {/* Tab switcher（编辑模式隐藏）*/}
        {!isEdit && (
          <div className="flex gap-1 bg-muted rounded-lg p-1 shrink-0">
            {(['bookmark', 'note', 'file'] as const).map(t => (
              <button key={t} type="button" onClick={() => setTab(t)}
                className={cn(
                  'flex-1 text-xs font-medium py-1.5 rounded-md transition-colors',
                  tab === t ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t === 'bookmark' ? '收藏' : t === 'note' ? '灵感' : '资料'}
              </button>
            ))}
          </div>
        )}

        {/* ── 收藏 tab ── */}
        {tab === 'bookmark' && (
          <>
            <div>
              <label className="text-sm font-medium block mb-1">链接 *</label>
              <Input
                className="text-sm"
                placeholder="https://..."
                value={url}
                onChange={e => handleUrlChange(e.target.value)}
                autoFocus={!isEdit && !initialUrl}
              />
              {urlError && (
                <p className="mt-1 text-xs text-amber-700">{urlError}</p>
              )}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">标题</label>
                {fetchingTitle && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Loader2 size={11} className="animate-spin" /> 获取中…
                  </span>
                )}
              </div>
              <Input
                className="text-sm"
                placeholder="留空则使用链接作为标题"
                value={title}
                onChange={e => {
                  setTitle(e.target.value)
                  setTitleTouched(true)
                  titleSourceRef.current = 'manual'
                }}
              />
            </div>
            {renderFolderField()}
            <div>
              <div className="flex items-center justify-between mb-1 gap-2">
                <label className="text-sm font-medium">标签</label>
                {!isEdit && classifyLoading && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                    <Loader2 size={12} className="animate-spin" /> AI 分类中…
                  </span>
                )}
              </div>
              <div className="rounded-lg border border-border/80 bg-muted/20 px-3 py-3 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="w-[52%] min-w-[12rem] max-w-[22rem] shrink-0">
                    <div className="relative flex-1">
                      <Input
                        className="pr-11 text-sm"
                        placeholder="自定义标签，回车添加"
                        value={draftTagName}
                        onChange={e => {
                          setDraftTagName(e.target.value)
                          if (tagInputError) setTagInputError('')
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddUserTag()
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddUserTag}
                        aria-label="添加标签"
                        className={cn(
                          'absolute inset-y-1.5 right-2 inline-flex items-center rounded-sm px-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                          draftTagName.trim()
                            ? 'text-foreground hover:text-primary'
                            : 'text-muted-foreground/60 hover:text-muted-foreground'
                        )}
                      >
                        <Check size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {tagInputError && (
                  <p className="text-xs text-amber-700">{tagInputError}</p>
                )}

                <div className="space-y-2">
                  {finalTags.length > 0 && (
                    <div className="text-[11px] font-medium text-muted-foreground">已选标签</div>
                  )}
                  {finalTags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {finalTags.map((tag, index) => (
                        <div
                          key={`${tag.type}:${tag.name}:${tag.appliedBy}`}
                          draggable
                          onDragStart={() => handleTagDragStart(index)}
                          onDragOver={event => {
                            event.preventDefault()
                            if (draggingTagIndex !== null && draggingTagIndex !== index) {
                              setDragOverTagIndex(index)
                            }
                          }}
                          onDrop={() => handleTagDrop(index)}
                          onDragEnd={() => {
                            dragIndexRef.current = null
                            setDraggingTagIndex(null)
                            setDragOverTagIndex(null)
                          }}
                          className={cn(
                            'rounded-full transition-all cursor-grab active:cursor-grabbing',
                            draggingTagIndex === index && 'scale-[0.98] opacity-45',
                            dragOverTagIndex === index && draggingTagIndex !== index && 'ring-2 ring-primary/35 ring-offset-2 ring-offset-background'
                          )}
                          title="拖拽调整顺序"
                        >
                          <TagChip
                            tone={getTagChipTone(tag)}
                            onRemove={() => handleRemoveSelectedTag(tag)}
                            className="transition-colors hover:border-border hover:bg-muted/40"
                          >
                            {tag.name}
                          </TagChip>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {suggestedTags.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="text-[11px] font-medium text-muted-foreground">AI 推荐（可选）</div>
                      <p className="text-[11px] text-muted-foreground/70">点击加入已选</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {suggestedTags.map(tag => (
                        <TagChip
                          key={`suggested:${tag.type}:${tag.name}:${tag.appliedBy}`}
                          tone={getTagChipTone(tag)}
                          onClick={() => handleAcceptSuggestedTag(tag)}
                          className="cursor-pointer"
                        >
                          {tag.name}
                        </TagChip>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1 gap-2">
                <label className="text-sm font-medium">备注</label>
                <div className="flex items-center gap-2">
                  {note.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        setNote('')
                        setSummaryError('')
                      }}
                      className="text-[11px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
                    >
                      清空
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleGenerateSummary()}
                    disabled={summaryLoading || !isValidHttpUrl(url)}
                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-sm"
                  >
                    {summaryLoading && <Loader2 size={11} className="animate-spin" />}
                    {summaryLoading ? '总结中…' : 'AI 总结'}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {summaryError && (
                  <p className="text-xs text-amber-700">{summaryError}</p>
                )}
                <Textarea
                  placeholder="添加备注，或点右上角让 AI 生成总结…"
                  value={note}
                  onChange={e => {
                    setNote(e.target.value)
                    if (summaryError) setSummaryError('')
                  }}
                  rows={3}
                  className="resize-none text-sm"
                />
              </div>
            </div>
          </>
        )}

        {/* ── 记录 tab ── */}
        {tab === 'note' && (
          <div className="flex flex-col border border-input rounded-md overflow-hidden bg-transparent" style={{ height: '300px' }}>
            <Textarea
              placeholder="记录想法、摘录、代码片段…"
              value={content} maxLength={1000}
              onChange={e => setContent(e.target.value)} autoFocus
              className="min-h-0 flex-1 resize-none overflow-y-auto rounded-none border-0 px-3 py-3 text-sm shadow-none focus-visible:border-transparent focus-visible:ring-0"
            />
            <div className="border-t border-input px-3 py-1.5 shrink-0 text-right">
              <span className={cn('text-[11px]', content.length >= 1000 ? 'text-destructive' : 'text-muted-foreground')}>
                {content.length} / 1000
              </span>
            </div>
          </div>
        )}

        {/* ── 资源 tab ── */}
        {tab === 'file' && (
          <div className="space-y-3">
            <input ref={fileInputRef} type="file" multiple className="hidden"
              onChange={e => { addFiles(Array.from(e.target.files ?? [])); e.target.value = '' }} />
            <div tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(Array.from(e.dataTransfer.files)) }}
              className={cn(
                'flex flex-col items-center justify-center gap-2 h-24 border-2 border-dashed rounded-md cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                dragOver ? 'border-primary bg-primary/5' : 'border-input hover:border-primary/50 hover:bg-muted/40'
              )}
            >
              <Upload size={18} className="text-muted-foreground" />
              <p className="text-sm text-muted-foreground">点击、拖拽或粘贴截图</p>
              <p className="text-xs text-muted-foreground/60">图片、PDF、音频、视频等，总计不超过 {TOTAL_LIMIT_MB}MB</p>
            </div>

            {files.length > 0 && (
              <div className="space-y-1.5">
                {files.map((f, i) => {
                  const Icon = getFileIcon(f)
                  const hint = getSingleFileHint(f)
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center gap-2.5 px-3 py-2 border border-input rounded-md bg-muted/40">
                        <Icon size={16} className="text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{f.name}</p>
                          <p className="text-[10px] text-muted-foreground">{formatFileSize(f.size)}</p>
                        </div>
                        <button type="button" onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0">
                          <X size={12} />
                        </button>
                      </div>
                      {hint && <p className="text-[11px] text-amber-600 px-1">{hint}</p>}
                    </div>
                  )
                })}
                <div className={cn('flex items-center justify-between px-1 pt-1 text-[11px]', overLimit ? 'text-destructive' : 'text-muted-foreground')}>
                  <span>{overLimit ? `总大小超过 ${TOTAL_LIMIT_MB}MB，请移除部分文件` : ''}</span>
                  <span>{totalSizeMB.toFixed(1)} / {TOTAL_LIMIT_MB} MB</span>
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium block mb-1">标题</label>
              <Input className="text-sm" placeholder="留空则使用文件名" value={fileTitle} onChange={e => setFileTitle(e.target.value)} />
            </div>
            {uploadError && (
              <p className="text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2">{uploadError}</p>
            )}
          </div>
        )}

        {/* ── 共享：存入文件夹 ── */}
        {tab !== 'bookmark' && renderFolderField()}

      </div>

      {renderFooter?.({
        canSave,
        saving,
        overLimit,
        isEdit,
        footerMessage,
        primaryLabel,
        primaryDisabled,
        onSave: handleSave,
        onCancel,
      })}
    </>
  )
}
