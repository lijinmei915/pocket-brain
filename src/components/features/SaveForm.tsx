import { useState, useRef, useEffect } from 'react'
import {
  FileText, Video, Headphones, MessageCircle, BookOpen,
  Upload, X, Image, FileArchive, Music, Loader2, RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { uploadFile } from '@/utils/supabase'

// ── 常量 ──────────────────────────────────────────────────────────────────────

const TYPES = [
  { value: 'article', label: '文章',   icon: FileText,      cls: 'component-tag-article' },
  { value: 'video',   label: '视频',   icon: Video,         cls: 'component-tag-video'   },
  { value: 'audio',   label: '音频',   icon: Headphones,    cls: 'component-tag-audio'   },
  { value: 'tweet',   label: '帖子',   icon: MessageCircle, cls: 'component-tag-tweet'   },
  { value: 'other',   label: '其他',   icon: BookOpen,      cls: 'component-tag-other'   },
]

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

let pasteCounter = 0

// ── Props ─────────────────────────────────────────────────────────────────────

export interface SaveData {
  id?: string
  url: string | null
  title: string
  type: string
  note: string
  folderId: string | null
}

interface SaveFormProps {
  folders: { id: string; name: string; parentId?: string | null }[]
  initialUrl?: string
  initialTitle?: string
  defaultFolderId?: string | null
  editItem?: any
  onSave: (data: SaveData) => Promise<void>
  onCancel: () => void
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
  const [typeTouched,    setTypeTouched]    = useState(!!editItem)
  const [classifyLoading, setClassifyLoading] = useState(false)

  // initialTitle 异步到达时，只要用户没手动改过就填入
  useEffect(() => {
    if (initialTitle && !titleTouched) setTitle(initialTitle)
  }, [initialTitle])

  // URL 改变时，自动分类
  useEffect(() => {
    if (!url || url === initialUrl || typeTouched || isEdit) return
    autoClassify()
  }, [url])

  async function autoClassify() {
    if (!url) return
    setClassifyLoading(true)
    try {
      const r = await fetch(`/api/classify?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`)
      if (r.ok) {
        const data = await r.json()
        if (data.type) setType(data.type)
      }
    } catch (err) {
      console.error('[PB] classify error:', err)
    } finally {
      setClassifyLoading(false)
    }
  }

  const [type,  setType]  = useState(editItem?.type  ?? guessType(initialUrl))
  const [note,  setNote]  = useState(editItem?.type !== 'note' ? (editItem?.note ?? '') : '')

  // 记录
  const [content, setContent] = useState(editItem?.type === 'note' ? (editItem?.note ?? '') : '')

  // 资源
  const [files,       setFiles]       = useState<File[]>([])
  const [fileTitle,   setFileTitle]   = useState('')
  const [dragOver,    setDragOver]    = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 共享
  const [folderId, setFolderId] = useState(
    editItem?.folderId ?? defaultFolderId ?? INBOX
  )
  const [saving, setSaving] = useState(false)

  const folderOptions = buildOptions(folders, folders.filter(f => !f.parentId))
  const totalSizeMB   = files.reduce((sum, f) => sum + f.size / (1024 * 1024), 0)
  const overLimit     = totalSizeMB > TOTAL_LIMIT_MB

  function handleUrlChange(val: string) {
    setUrl(val)
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
    setSaving(true)
    try {
      if (tab === 'note') {
        if (!content.trim()) return
        await onSave({
          ...(isEdit ? { id: editItem.id } : {}),
          url: null, type: 'note',
          title: content.trim().slice(0, 20) || '无标题',
          note: content.trim(),
          folderId: folderId === INBOX ? null : folderId,
        })
      } else if (tab === 'file') {
        if (files.length === 0) return
        setUploadError(null)
        for (const file of files) {
          const publicUrl = await uploadFile(file)
          await onSave({
            url: publicUrl,
            title: fileTitle.trim() || file.name,
            type: 'file',
            note: '',
            folderId: folderId === INBOX ? null : folderId,
          })
        }
      } else {
        if (!url.trim()) return
        await onSave({
          ...(isEdit ? { id: editItem.id } : {}),
          url: url.trim(),
          title: title.trim() || '无标题',
          type, note: note.trim(),
          folderId: folderId === INBOX ? null : folderId,
        })
      }
    } finally {
      setSaving(false)
    }
  }

  const canSave = tab === 'note'
    ? content.trim().length > 0
    : tab === 'file'
      ? files.length > 0 && !overLimit
      : url.trim().length > 0

  // 两个 Fragment 子节点作为 flex 容器（父）的直接子元素
  return (
    <>
      {/* 可滚动表单区 */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-4" onPaste={handlePaste}>

        {/* Tab switcher（编辑模式隐藏）*/}
        {!isEdit && (
          <div className="flex gap-1 bg-muted rounded-lg p-1 shrink-0">
            {(['bookmark', 'note', 'file'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
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
              <label className="text-sm font-medium block mb-1">类型</label>
              <div className="flex gap-2 flex-wrap">
                {TYPES.map(t => {
                  const Icon = t.icon
                  const selected = type === t.value
                  return (
                    <button key={t.value} onClick={() => { setType(t.value); setTypeTouched(true) }}
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors border-0',
                        selected ? t.cls : 'bg-[var(--bg-secondary)] text-[var(--text-disabled)] hover:text-[var(--text-secondary)]'
                      )}
                      style={selected ? { background: 'var(--tag-bg)', color: 'var(--tag-text)' } : undefined}
                    >
                      <Icon size={10} />{t.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        )}

        {/* ── 记录 tab ── */}
        {tab === 'note' && (
          <div className="flex flex-col border border-input rounded-md overflow-hidden bg-transparent" style={{ height: '300px' }}>
            <textarea
              placeholder="记录想法、摘录、代码片段…"
              value={content} maxLength={1000}
              onChange={e => setContent(e.target.value)} autoFocus
              className="flex-1 resize-none overflow-y-auto p-3 text-sm outline-none bg-transparent placeholder:text-muted-foreground"
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
                        <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
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

        {/* 备注 — 仅收藏 tab */}
        {tab === 'bookmark' && (
          <div>
            <label className="text-sm font-medium block mb-1">备注</label>
            <textarea
              placeholder="添加备注…" value={note}
              onChange={e => setNote(e.target.value)} rows={3}
              className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t px-4 py-3 flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onCancel}>取消</Button>
        <Button className="flex-1" disabled={!canSave || saving || overLimit} onClick={handleSave}>
          {saving ? <><Loader2 size={14} className="animate-spin mr-2" />保存中…</> : isEdit ? '更新' : '保存'}
        </Button>
      </div>
    </>
  )
}
