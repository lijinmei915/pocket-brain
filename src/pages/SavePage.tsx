import { useState, useEffect, useRef } from 'react'
import { CheckCircle, Loader2, Upload, X, Image, FileArchive, Music, Video as VideoIcon, FileText, Headphones, MessageCircle, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Logo } from '@/components/ui/Logo'
import { createItem, fetchFolders } from '@/utils/supabase'
import { cn } from '@/lib/utils'

const TYPES = [
  { value: 'article', label: '文章',   icon: FileText,      cls: 'component-tag-article' },
  { value: 'video',   label: '视频',   icon: VideoIcon,     cls: 'component-tag-video'   },
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

function getSingleFileHint(file: File): string | null {
  const rule = FILE_HINTS.find(r => r.test(file))
  if (!rule) return null
  return file.size / (1024 * 1024) > rule.limit ? rule.message : null
}

const INBOX = '__inbox__'
const TOTAL_LIMIT_MB = 20

function guessType(url: string) {
  const u = url.toLowerCase()
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
  if (file.type.startsWith('video/')) return VideoIcon
  return FileArchive
}

let pasteCounter = 0

export default function SavePage() {
  const params = new URLSearchParams(window.location.search)
  const initUrl   = params.get('url')   || ''
  const initTitle = params.get('title') || ''

  const [tab,      setTab]      = useState<'bookmark' | 'note' | 'file'>('bookmark')
  // 收藏
  const [url,      setUrl]      = useState(initUrl)
  const [title,    setTitle]    = useState(initTitle)
  const [type,     setType]     = useState(guessType(initUrl))
  const [note,     setNote]     = useState('')
  // 记录
  const [content,  setContent]  = useState('')
  // 资源
  const [files,    setFiles]    = useState<File[]>([])
  const [fileTitle, setFileTitle] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // shared
  const [folderId, setFolderId] = useState(INBOX)
  const [folders,  setFolders]  = useState([])
  const [status,   setStatus]   = useState<'form' | 'saving' | 'done' | 'error'>('form')

  useEffect(() => {
    fetchFolders().then(setFolders).catch(console.error)
  }, [])

  const folderOptions = buildOptions(folders, folders.filter(f => !f.parentId))
  const totalSizeMB = files.reduce((sum, f) => sum + f.size / (1024 * 1024), 0)
  const overLimit = totalSizeMB > TOTAL_LIMIT_MB

  function handleUrlChange(val: string) {
    setUrl(val)
    setType(guessType(val))
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
    setStatus('saving')
    try {
      if (tab === 'note') {
        if (!content.trim()) { setStatus('form'); return }
        await createItem({
          url: null, type: 'note',
          title: content.trim().slice(0, 20) || '无标题',
          note: content.trim(),
          folderId: folderId === INBOX ? null : folderId,
        })
      } else if (tab === 'file') {
        setStatus('form'); return
      } else {
        if (!url.trim()) { setStatus('form'); return }
        await createItem({
          url: url.trim(),
          title: title.trim() || url,
          type, note: note.trim(),
          folderId: folderId === INBOX ? null : folderId,
        })
      }
      setStatus('done')
      setTimeout(() => window.close(), 1200)
    } catch {
      setStatus('error')
    }
  }

  const canSave = tab === 'note'
    ? content.trim().length > 0
    : tab === 'file'
      ? false
      : url.trim().length > 0

  if (status === 'done') return (
    <div className="flex flex-col items-center justify-center h-screen gap-3 bg-background">
      <CheckCircle size={32} className="text-green-600" />
      <p className="text-sm font-medium">已保存到 Pocket Brain</p>
      <p className="text-xs text-muted-foreground">窗口即将关闭…</p>
    </div>
  )

  if (status === 'error') return (
    <div className="flex flex-col items-center justify-center h-screen gap-3 bg-background">
      <p className="text-sm text-destructive">保存失败，请重试</p>
      <Button size="sm" variant="outline" onClick={() => setStatus('form')}>返回</Button>
    </div>
  )

  return (
    <div className="flex flex-col h-screen bg-background" onPaste={handlePaste}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 h-12 border-b shrink-0">
        <Logo size={24} />
        <span className="text-sm font-semibold">Pocket Brain</span>
      </div>

      {/* Tab switcher */}
      <div className="px-4 pt-3 shrink-0">
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {(['bookmark', 'note', 'file'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn(
                'flex-1 text-xs font-medium py-1.5 rounded-md transition-colors',
                tab === t ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t === 'bookmark' ? '收藏' : t === 'note' ? '记录' : '资源'}
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">

        {/* ── 收藏 tab ── */}
        {tab === 'bookmark' && (
          <>
            <div>
              <label className="text-sm font-medium block mb-1">链接 *</label>
              <Input
                placeholder="https://..."
                value={url}
                onChange={e => handleUrlChange(e.target.value)}
                autoFocus={!initUrl}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">标题</label>
              <Input value={title} onChange={e => setTitle(e.target.value)}
                placeholder="留空则使用链接作为标题" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">类型</label>
              <div className="flex gap-2 flex-wrap">
                {TYPES.map(t => {
                  const Icon = t.icon
                  const selected = type === t.value
                  return (
                    <button key={t.value} onClick={() => setType(t.value)}
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
            <textarea placeholder="记录想法、摘录、代码片段…"
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
              <Input value={fileTitle} onChange={e => setFileTitle(e.target.value)}
                placeholder="留空则使用文件名" />
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
            <textarea value={note} onChange={e => setNote(e.target.value)}
              placeholder="添加备注…" rows={3}
              className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary" />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t shrink-0 flex gap-2">
        <Button variant="outline" className="flex-1 h-9 text-sm" onClick={() => window.close()}>取消</Button>
        <Button onClick={handleSave} disabled={!canSave || status === 'saving' || overLimit} className="flex-1 h-9 text-sm">
          {status === 'saving' ? <><Loader2 size={14} className="animate-spin mr-2" />保存中…</> : '保存'}
        </Button>
      </div>
    </div>
  )
}
