import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

const TYPES = [
  { value: 'article', label: '文章' },
  { value: 'video',   label: '视频' },
  { value: 'audio',   label: '音频' },
  { value: 'tweet',   label: '帖子' },
  { value: 'other',   label: '其他' },
]

function guessType(url) {
  const u = (url || '').toLowerCase()
  if (/youtube\.com|youtu\.be|vimeo\.com|bilibili\.com/.test(u)) return 'video'
  if (/twitter\.com|x\.com|weibo\.com|xiaohongshu/.test(u)) return 'tweet'
  if (/spotify\.com|podcast|\.mp3|\.wav/.test(u)) return 'audio'
  return 'article'
}

// editItem: null = 新建模式, {id, url, title, type, note, folderId} = 编辑模式
export default function AddItemDialog({ open, onOpenChange, folders, onSave, defaultFolderId, editItem }) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [type, setType] = useState('article')
  const [note, setNote] = useState('')
  const [folderId, setFolderId] = useState('')
  const [saving, setSaving] = useState(false)

  const isEdit = !!editItem

  useEffect(() => {
    if (!open) return
    if (editItem) {
      setUrl(editItem.url || '')
      setTitle(editItem.title || '')
      setType(editItem.type || 'article')
      setNote(editItem.note || '')
      setFolderId(editItem.folderId || '')
    } else {
      setUrl('')
      setTitle('')
      setType('article')
      setNote('')
      setFolderId(defaultFolderId || '')
    }
  }, [open, editItem, defaultFolderId])

  function handleUrlChange(val) {
    setUrl(val)
    if (!isEdit) setType(guessType(val))
  }

  async function handleSave() {
    if (!url.trim()) return
    setSaving(true)
    try {
      await onSave({
        ...(isEdit ? { id: editItem.id } : {}),
        url: url.trim(),
        title: title.trim() || url.trim(),
        type,
        note: note.trim(),
        folderId: folderId || null,
      })
    } finally {
      setSaving(false)
    }
  }

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
  const rootFolders = folders.filter(f => !f.parentId)
  const folderOptions = buildOptions(rootFolders)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑收藏' : '添加收藏'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">链接 *</label>
            <Input
              placeholder="https://..."
              value={url}
              onChange={e => handleUrlChange(e.target.value)}
              autoFocus={!isEdit}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">标题</label>
            <Input
              placeholder="留空则使用链接作为标题"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">类型</label>
            <div className="flex gap-2 flex-wrap">
              {TYPES.map(t => (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs border transition-colors',
                    type === t.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:bg-muted'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">备注</label>
            <Textarea
              placeholder="为什么收藏？随手记一下…"
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">存入文件夹</label>
            <Select value={folderId} onValueChange={setFolderId}>
              <SelectTrigger>
                <SelectValue placeholder="收件箱（稍后整理）" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">收件箱（稍后整理）</SelectItem>
                {folderOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSave} disabled={!url.trim() || saving}>
            {saving ? '保存中…' : isEdit ? '更新' : '保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
