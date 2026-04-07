import { useState, useEffect, useRef } from 'react'
import { FileText, Video, Headphones, MessageCircle, BookOpen, Upload, X, Image, FileArchive, Music } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

const TYPES = [
  { value: 'article', label: '文章',   icon: FileText,      cls: 'component-tag-article' },
  { value: 'video',   label: '视频',   icon: Video,         cls: 'component-tag-video'   },
  { value: 'audio',   label: '音频',   icon: Headphones,    cls: 'component-tag-audio'   },
  { value: 'tweet',   label: '帖子',   icon: MessageCircle, cls: 'component-tag-tweet'   },
  { value: 'other',   label: '其他',   icon: BookOpen,      cls: 'component-tag-other'   },
]

const INBOX = '__inbox__'
const TOTAL_LIMIT_MB = 20

// 单文件超限提示（仅作引导，不阻止添加，总额度兜底）
const FILE_HINTS: { test: (f: File) => boolean; limit: number; message: string }[] = [
  { test: f => f.type.startsWith('video/'), limit: 50, message: '视频超过 50MB，建议上传到视频平台后用链接收藏' },
  { test: f => f.type.startsWith('audio/'), limit: 50, message: '音频超过 50MB，建议剪辑压缩后再上传' },
  { test: f => f.type.startsWith('image/'), limit: 10, message: '图片超过 10MB，建议压缩后上传' },
  { test: () => true,                        limit: 20, message: '文件超过 20MB，建议存到云盘后复制链接收藏' },
]

function getSingleFileHint(file: File): string | null {
  const rule = FILE_HINTS.find(r => r.test(file))
  if (!rule) return null
  return file.size / (1024 * 1024) > rule.limit ? rule.message : null
}

function getFileIcon(file: File) {
  if (file.type.startsWith('image/')) return Image
  if (file.type.startsWith('audio/')) return Music
  if (file.type.startsWith('video/')) return Video
  return FileArchive
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function guessType(url) {
  const u = (url || '').toLowerCase()
  if (/youtube\.com|youtu\.be|vimeo\.com|bilibili\.com/.test(u)) return 'video'
  if (/twitter\.com|x\.com|weibo\.com|xiaohongshu/.test(u)) return 'tweet'
  if (/spotify\.com|podcast|\.mp3|\.wav/.test(u)) return 'audio'
  return 'article'
}

let pasteCounter = 0

export default function AddItemDialog({ open, onOpenChange, folders, onSave, defaultFolderId, editItem }) {
  const [tab, setTab] = useState<'bookmark' | 'note' | 'file'>('bookmark')
  // 收藏
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [type, setType] = useState('article')
  const [note, setNote] = useState('')
  // 记录
  const [content, setContent] = useState('')
  // 资源
  const [files, setFiles] = useState<File[]>([])
  const [fileTitle, setFileTitle] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // shared
  const [folderId, setFolderId] = useState(INBOX)
  const [saving, setSaving] = useState(false)

  const isEdit = !!editItem

  const totalSizeMB = files.reduce((sum, f) => sum + f.size / (1024 * 1024), 0)
  const overLimit = totalSizeMB > TOTAL_LIMIT_MB

  useEffect(() => {
    if (!open) return
    if (editItem) {
      if (editItem.type === 'note') {
        setTab('note')
        setContent(editItem.note || '')
      } else {
        setTab('bookmark')
        setUrl(editItem.url || '')
        setTitle(editItem.title || '')
        setType(editItem.type || 'article')
        setNote(editItem.note || '')
      }
      setFolderId(editItem.folderId || INBOX)
    } else {
      setTab('bookmark')
      setUrl('')
      setTitle('')
      setType('article')
      setNote('')
      setContent('')
      setFiles([])
      setFileTitle('')
      setFolderId(defaultFolderId || INBOX)
    }
  }, [open, editItem, defaultFolderId])

  function addFiles(incoming: File[]) {
    setFiles(prev => {
      const merged = [...prev, ...incoming]
      // 自动设标题：用第一个文件名
      if (prev.length === 0 && incoming.length > 0 && !fileTitle) {
        setFileTitle(incoming[0].name)
      }
      return merged
    })
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? [])
    if (selected.length) addFiles(selected)
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const dropped = Array.from(e.dataTransfer.files)
    if (dropped.length) addFiles(dropped)
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = Array.from(e.clipboardData?.items ?? [])
    const images = items
      .filter(item => item.type.startsWith('image/'))
      .map(item => {
        const f = item.getAsFile()
        if (!f) return null
        pasteCounter++
        return new File([f], `截图-${pasteCounter}.png`, { type: f.type })
      })
      .filter(Boolean) as File[]
    if (images.length) addFiles(images)
  }

  function removeFile(index: number) {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  function handleUrlChange(val) {
    setUrl(val)
    if (!isEdit) setType(guessType(val))
  }

  async function handleSave() {
    setSaving(true)
    try {
      if (tab === 'note') {
        if (!content.trim()) return
        await onSave({
          ...(isEdit ? { id: editItem.id } : {}),
          url: null,
          title: content.trim().slice(0, 20) || '无标题',
          type: 'note',
          note: content.trim(),
          folderId: folderId === INBOX ? null : folderId,
        })
      } else if (tab === 'file') {
        // 上传逻辑待接入 Supabase Storage
        return
      } else {
        if (!url.trim()) return
        await onSave({
          ...(isEdit ? { id: editItem.id } : {}),
          url: url.trim(),
          title: title.trim() || '无标题',
          type,
          note: note.trim(),
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
      ? false // 暂未接入存储
      : url.trim().length > 0

  function buildOptions(list, depth = 0) {
    return list.flatMap(f => {
      const prefix = depth > 0 ? '\u00a0\u00a0'.repeat(depth) + '└ ' : ''
      const children = folders.filter(c => c.parentId === f.id)
      return [
        { value: f.id, name: f.name, label: prefix + f.name },
        ...buildOptions(children, depth + 1),
      ]
    })
  }
  const folderOptions = buildOptions(folders.filter(f => !f.parentId))

  const dialogTitle = isEdit
    ? '编辑'
    : tab === 'note' ? '新建记录' : tab === 'file' ? '上传资源' : '添加收藏'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col flex-1 overflow-y-auto px-1">
          {/* Tab switcher */}
          {!isEdit && (
            <div className="flex gap-1 bg-muted rounded-lg p-1 shrink-0">
              {(['bookmark', 'note', 'file'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={cn(
                    'flex-1 text-xs font-medium py-1.5 rounded-md transition-colors',
                    tab === t
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {t === 'bookmark' ? '收藏' : t === 'note' ? '记录' : '资源'}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-4 py-2">
            {/* ── 收藏 tab ── */}
            {tab === 'bookmark' && (
              <>
                <div>
                  <label className="text-sm font-medium block mb-1">链接 *</label>
                  <Input
                    placeholder="https://..."
                    value={url}
                    onChange={e => handleUrlChange(e.target.value)}
                    autoFocus={!isEdit}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">标题</label>
                  <Input
                    placeholder="留空则使用链接作为标题"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1">类型</label>
                  <div className="flex gap-2 flex-wrap">
                    {TYPES.map(t => {
                      const Icon = t.icon
                      const selected = type === t.value
                      return (
                        <button
                          key={t.value}
                          onClick={() => setType(t.value)}
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
              <div className="flex flex-col border border-input rounded-md overflow-hidden bg-background" style={{ height: '300px' }}>
                <textarea
                  placeholder="记录想法、摘录、代码片段…"
                  value={content}
                  maxLength={1000}
                  onChange={e => setContent(e.target.value)}
                  autoFocus
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
              <div onPaste={handlePaste} className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleInputChange}
                />

                {/* 上传区域 */}
                <div
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={cn(
                    'flex flex-col items-center justify-center gap-2 h-24 border-2 border-dashed rounded-md cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    dragOver
                      ? 'border-primary bg-primary/5'
                      : 'border-input hover:border-primary/50 hover:bg-muted/40'
                  )}
                >
                  <Upload size={18} className="text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">点击、拖拽或粘贴截图</p>
                  <p className="text-xs text-muted-foreground/60">图片、PDF、音频、视频等，总计不超过 {TOTAL_LIMIT_MB}MB</p>
                </div>

                {/* 已选文件列表 */}
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
                            <button
                              onClick={() => removeFile(i)}
                              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                            >
                              <X size={12} />
                            </button>
                          </div>
                          {hint && (
                            <p className="text-[11px] text-amber-600 px-1">{hint}</p>
                          )}
                        </div>
                      )
                    })}

                    {/* 总额度 */}
                    <div className={cn(
                      'flex items-center justify-between px-1 pt-1 text-[11px]',
                      overLimit ? 'text-destructive' : 'text-muted-foreground'
                    )}>
                      <span>{overLimit ? `总大小超过 ${TOTAL_LIMIT_MB}MB，请移除部分文件` : ''}</span>
                      <span>{totalSizeMB.toFixed(1)} / {TOTAL_LIMIT_MB} MB</span>
                    </div>
                  </div>
                )}

                {/* 标题 */}
                <div>
                  <label className="text-sm font-medium block mb-1">标题</label>
                  <Input
                    placeholder="留空则使用文件名"
                    value={fileTitle}
                    onChange={e => setFileTitle(e.target.value)}
                  />
                </div>

                <p className="text-xs text-muted-foreground bg-muted/60 rounded-md px-3 py-2">
                  文件上传功能即将开放，当前仅支持选择预览。
                </p>
              </div>
            )}

            {/* ── 共享：存入文件夹 ── */}
            <div>
              <label className="text-sm font-medium block mb-1">存入文件夹</label>
              <Select value={folderId} onValueChange={setFolderId}>
                <SelectTrigger>
                  <SelectValue>
                    {folderId === INBOX
                      ? '稍后整理'
                      : folderOptions.find(o => o.value === folderId)?.name ?? ''}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={INBOX}>稍后整理</SelectItem>
                  {folderOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 备注 — 仅收藏 tab */}
            {tab === 'bookmark' && (
              <div>
                <label className="text-sm font-medium block mb-1">备注</label>
                <textarea
                  placeholder="添加备注…"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSave} disabled={!canSave || saving}>
            {saving ? '保存中…' : isEdit ? '更新' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
