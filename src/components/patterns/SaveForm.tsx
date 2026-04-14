import { useState, useRef, useEffect } from 'react'
import {
  Upload, X, Image, FileArchive, Music, Loader2, RefreshCw, Video,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TagChip, ITEM_TYPE_LABELS, getTagChipTone, sortDisplayTags } from '@/components/ui/tag-chip'
import { cn } from '@/lib/utils'
import { uploadFile } from '@/utils/supabase'
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

function detectSourceTag(url: string): string | null {
  const lower = url.toLowerCase()
  const rules: [RegExp, string][] = [
    [/github\.com/, 'GitHub'],
    [/youtube\.com|youtu\.be/, 'YouTube'],
    [/bilibili\.com/, 'Bilibili'],
    [/x\.com|twitter\.com/, 'X'],
    [/xiaohongshu\.com/, '小红书'],
    [/weibo\.com/, '微博'],
    [/spotify\.com/, 'Spotify'],
    [/notion\.site|notion\.so/, 'Notion'],
    [/figma\.com/, 'Figma'],
    [/mp\.weixin\.qq\.com/, '公众号'],
    [/zhihu\.com/, '知乎'],
    [/juejin\.cn/, '掘金'],
  ]
  const match = rules.find(([pattern]) => pattern.test(lower))
  if (match) return match[1]
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '')
    const root = hostname.split('.').slice(-2, -1)[0]
    return root ? root.charAt(0).toUpperCase() + root.slice(1) : null
  } catch {
    return null
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

function buildCombinedTags(previewTags: ConfirmedTagDraft[], userTags: ConfirmedTagDraft[]) {
  const result: ConfirmedTagDraft[] = []

  for (const tag of userTags) {
    if (!result.some(existing => isSameTag(existing, tag))) {
      result.push(tag)
    }
  }

  for (const tag of previewTags) {
    if (!result.some(existing => isSameTag(existing, tag))) {
      result.push(tag)
    }
  }

  return result
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
  const [type,           setType]           = useState(editItem?.type  ?? 'other')
  const [note,           setNote]           = useState(editItem?.type !== 'note' ? (editItem?.note ?? '') : '')
  const [typeTouched,    setTypeTouched]    = useState(!!editItem)
  const [classifyLoading, setClassifyLoading] = useState(false)
  const [summaryTouched, setSummaryTouched] = useState(false)
  const [summary, setSummary] = useState(editItem?.summary ?? '')
  const [previewCategoryId, setPreviewCategoryId] = useState<string | null>(editItem?.categoryId ?? null)
  const [previewConfidence, setPreviewConfidence] = useState<'high' | 'medium' | 'low' | null>(editItem?.confidence ?? null)
  const [previewTags, setPreviewTags] = useState<ConfirmedTagDraft[]>(
    (editItem?.tags || [])
      .filter(tag => tag.appliedBy !== 'user')
      .map(tag => ({ name: tag.name, type: tag.type, appliedBy: 'ai' as const }))
  )
  const [userTags, setUserTags] = useState<ConfirmedTagDraft[]>(
    (editItem?.tags || [])
      .filter(tag => tag.appliedBy === 'user')
      .map(tag => ({ name: tag.name, type: tag.type, appliedBy: 'user' as const }))
  )
  const [previewError, setPreviewError] = useState('')
  const [draftTagName, setDraftTagName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const classifyRequestRef = useRef(0)

  // initialTitle 异步到达时，只要用户没手动改过就填入
  useEffect(() => {
    if (initialTitle && !titleTouched) setTitle(initialTitle)
  }, [initialTitle])

  // URL 变化时自动生成来源标签
  useEffect(() => {
    const trimmedUrl = url.trim()
    if (!trimmedUrl) return
    const source = detectSourceTag(trimmedUrl)
    if (!source) return
    const sourceTag: ConfirmedTagDraft = { name: source, type: 'source', appliedBy: 'ai' }
    setPreviewTags(prev => {
      const withoutOldSource = prev.filter(t => t.type !== 'source')
      return [sourceTag, ...withoutOldSource]
    })
  }, [url])

  // URL / 标题 / 备注改变时，自动分类
  useEffect(() => {
    if (tab !== 'bookmark') return undefined

    classifyRequestRef.current += 1
    const requestId = classifyRequestRef.current
    const trimmedUrl = url.trim()

    if (!trimmedUrl) {
      setClassifyLoading(false)
      setPreviewError('')
      setPreviewCategoryId(null)
      setPreviewConfidence(null)
      setPreviewTags([])
      if (!summaryTouched) setSummary('')
      return undefined
    }

    setClassifyLoading(true)
    setPreviewError('')
    setPreviewCategoryId(null)
    setPreviewConfidence(null)
    setPreviewTags([])
    if (!summaryTouched) setSummary('')

    const timer = window.setTimeout(() => {
      void autoClassify(requestId, trimmedUrl, title, note)
    }, 450)

    return () => window.clearTimeout(timer)
  }, [url, title, note, tab])

  async function autoClassify(requestId: number, nextUrl: string, nextTitle: string, nextNote: string) {
    if (!nextUrl) return
    try {
      const data = await classifyPreview({ url: nextUrl, title: nextTitle, note: nextNote })
      if (requestId !== classifyRequestRef.current) return
      if (!data) {
        setPreviewError('AI 预览暂时失败，可手动保存')
        return
      }
      if (data.type && !typeTouched) setType(data.type)
      if (!summaryTouched) setSummary(data.summary || '')
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
      if (requestId !== classifyRequestRef.current) return
      console.error('[PB] classify error:', err)
      setPreviewError('AI 预览暂时失败，可手动保存')
    } finally {
      if (requestId === classifyRequestRef.current) {
        setClassifyLoading(false)
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
  const combinedTags = buildCombinedTags(previewTags, userTags)
  const previewReady = summary.trim().length > 0 || combinedTags.length > 0 || Boolean(previewCategoryId)
  const previewPending = tab === 'bookmark' && classifyLoading && !previewReady && !previewError
  const canSave = tab === 'note'
    ? content.trim().length > 0
    : tab === 'file'
      ? files.length > 0 && !overLimit
      : url.trim().length > 0 && (!classifyLoading || previewReady || Boolean(previewError))
  const footerMessage = tab === 'bookmark'
    ? saving
      ? '正在写入收藏与标签…'
      : previewPending
        ? 'AI 正在预分析链接，完成后即可保存'
        : previewError
          ? 'AI 预览失败，可直接手动保存'
          : previewReady
            ? '已生成摘要和推荐标签，确认后保存'
            : '输入链接后会自动生成摘要和推荐标签'
    : tab === 'file'
      ? overLimit
        ? `文件总大小超过 ${TOTAL_LIMIT_MB}MB，暂时无法保存`
        : '保存时会先上传文件，再写入收藏'
      : '记录会直接保存到当前文件夹'
  const primaryLabel = saving
    ? isEdit ? '更新中…' : '保存中…'
    : previewPending
      ? 'AI 分析中…'
      : isEdit ? '更新' : '保存'
  const primaryDisabled = !canSave || saving || overLimit || previewPending

  function normalizeFolderId(value: string | null) {
    if (!value || value === INBOX) return null
    return validFolderIds.has(value) ? value : null
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
  }

  function handleRemovePreviewTag(tagToRemove: ConfirmedTagDraft) {
    setPreviewTags(prev => prev.filter(tag => !isSameTag(tag, tagToRemove)))
  }

  function handleRemoveUserTag(tagToRemove: ConfirmedTagDraft) {
    setUserTags(prev => prev.filter(tag => !isSameTag(tag, tagToRemove)))
  }

  function handleAddUserTag() {
    const normalized = normalizeDraftTag(draftTagName, 'content')
    if (!normalized) return

    setUserTags(prev => {
      const withoutDuplicates = prev.filter(tag => !isSameTag(tag, normalized))
      return [...withoutDuplicates, normalized]
    })
    setPreviewTags(prev => prev.filter(tag => !isSameTag(tag, normalized)))
    setDraftTagName('')
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
          summary: summary.trim() || undefined,
          categoryId: previewCategoryId,
          confidence: previewConfidence,
          tags: combinedTags,
        })
      }
    } finally {
      setSaving(false)
    }
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
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">标题</label>
                {url && !title && (
                  <button
                    type="button"
                    onClick={async () => {
                      setFetchingTitle(true)
                      try {
                        const r = await fetch(`/api/fetch-title?url=${encodeURIComponent(url)}`)
                        const data = await r.json()
                        if (data.title) { setTitle(data.title); setTitleTouched(true) }
                      } catch {} finally { setFetchingTitle(false) }
                    }}
                    disabled={fetchingTitle}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    {fetchingTitle ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                    自动获取标题
                  </button>
                )}
              </div>
              <Input
                className="text-sm"
                placeholder="留空则使用链接作为标题"
                value={title}
                onChange={e => { setTitle(e.target.value); setTitleTouched(true) }}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium">标签与备注</label>
                {classifyLoading && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Loader2 size={12} className="animate-spin" /> AI 分析中…
                  </span>
                )}
              </div>
              <div className="rounded-lg border border-border/80 bg-muted/20 px-3 py-3 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {type && type !== 'other' && (
                    <TagChip
                      tone="type"
                      onRemove={() => {
                        setType('other')
                        setTypeTouched(true)
                      }}
                    >
                      {ITEM_TYPE_LABELS[type] || type}
                    </TagChip>
                  )}
                  {sortDisplayTags(combinedTags).map(tag => (
                    <TagChip
                      key={`${tag.type}:${tag.name}:${tag.appliedBy}`}
                      tone={getTagChipTone(tag)}
                      onRemove={tag.appliedBy === 'user' ? () => handleRemoveUserTag(tag) : () => handleRemovePreviewTag(tag)}
                    >
                      {tag.name}
                    </TagChip>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Input
                    className="text-sm"
                    placeholder="添加自定义标签，回车确认"
                    value={draftTagName}
                    onChange={e => setDraftTagName(e.target.value)}
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
                    className="shrink-0 rounded-md border border-input px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    添加
                  </button>
                </div>

                {previewError && (
                  <p className="text-xs text-amber-700">{previewError}</p>
                )}

                <Textarea
                  placeholder="添加备注…"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={2}
                  className="resize-none text-sm"
                />
              </div>
            </div>
            {/* AI 摘要暂时隐藏，底层能力保留 */}
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
