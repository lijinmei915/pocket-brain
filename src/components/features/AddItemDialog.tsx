import { useState, useEffect } from 'react'
import { FileText, Video, Headphones, MessageCircle, BookOpen } from 'lucide-react'
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

function guessType(url) {
  const u = (url || '').toLowerCase()
  if (/youtube\.com|youtu\.be|vimeo\.com|bilibili\.com/.test(u)) return 'video'
  if (/twitter\.com|x\.com|weibo\.com|xiaohongshu/.test(u)) return 'tweet'
  if (/spotify\.com|podcast|\.mp3|\.wav/.test(u)) return 'audio'
  return 'article'
}

export default function AddItemDialog({ open, onOpenChange, folders, onSave, defaultFolderId, editItem }) {
  const [tab, setTab] = useState<'bookmark' | 'idea'>('bookmark')
  // 收藏 tab state
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [type, setType] = useState('article')
  // 想法 tab state
  const [content, setContent] = useState('')
  // shared
  const [folderId, setFolderId] = useState(INBOX)
  const [saving, setSaving] = useState(false)

  const isEdit = !!editItem

  useEffect(() => {
    if (!open) return
    if (editItem) {
      if (editItem.type === 'note') {
        setTab('idea')
        setContent(editItem.note || '')
      } else {
        setTab('bookmark')
        setUrl(editItem.url || '')
        setTitle(editItem.title || '')
        setType(editItem.type || 'article')
      }
      setFolderId(editItem.folderId || INBOX)
    } else {
      setTab('bookmark')
      setUrl('')
      setTitle('')
      setType('article')
      setContent('')
      setFolderId(defaultFolderId || INBOX)
    }
  }, [open, editItem, defaultFolderId])

  function handleUrlChange(val) {
    setUrl(val)
    if (!isEdit) setType(guessType(val))
  }

  async function handleSave() {
    setSaving(true)
    try {
      if (tab === 'idea') {
        if (!content.trim()) return
        await onSave({
          ...(isEdit ? { id: editItem.id } : {}),
          url: null,
          title: content.trim().slice(0, 20) || '无标题',
          type: 'note',
          note: content.trim(),
          folderId: folderId === INBOX ? null : folderId,
        })
      } else {
        if (!url.trim()) return
        await onSave({
          ...(isEdit ? { id: editItem.id } : {}),
          url: url.trim(),
          title: title.trim() || '无标题',
          type,
          note: '',
          folderId: folderId === INBOX ? null : folderId,
        })
      }
    } finally {
      setSaving(false)
    }
  }

  const canSave = tab === 'idea' ? content.trim().length > 0 : url.trim().length > 0

  function buildOptions(list, depth = 0) {
    return list.flatMap(f => {
      const prefix = depth > 0 ? '\u00a0\u00a0'.repeat(depth) + '└ ' : ''
      const children = folders.filter(c => c.parentId === f.id)
      return [
        { value: f.id, label: prefix + f.name },
        ...buildOptions(children, depth + 1),
      ]
    })
  }
  const folderOptions = buildOptions(folders.filter(f => !f.parentId))

  const dialogTitle = isEdit ? '编辑' : tab === 'idea' ? '新建想法' : '添加收藏'

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
            <button
              onClick={() => setTab('bookmark')}
              className={cn(
                'flex-1 text-xs font-medium py-1.5 rounded-md transition-colors',
                tab === 'bookmark'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              收藏
            </button>
            <button
              onClick={() => setTab('idea')}
              className={cn(
                'flex-1 text-xs font-medium py-1.5 rounded-md transition-colors',
                tab === 'idea'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              想法
            </button>
          </div>
        )}

        <div className="space-y-4 py-2">
          {tab === 'bookmark' ? (
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
                        <Icon size={10} />
                        {t.label}
                      </button>
                    )
                  })}
                </div>
              </div>

            </>
          ) : (
            <div className="flex flex-col border border-input rounded-md overflow-hidden bg-background" style={{ height: '400px' }}>
              <textarea
                placeholder="记录你的想法…"
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

          <div>
            <label className="text-sm font-medium block mb-1">存入文件夹</label>
            <Select value={folderId} onValueChange={setFolderId}>
              <SelectTrigger>
                <SelectValue />
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
