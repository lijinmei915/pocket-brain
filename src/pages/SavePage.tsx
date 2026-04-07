import { useState, useEffect } from 'react'
import { CheckCircle, Loader2 } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createItem, fetchFolders } from '@/utils/supabase'

const TYPES = [
  { value: 'article', label: '文章' },
  { value: 'video',   label: '视频' },
  { value: 'audio',   label: '音频' },
  { value: 'tweet',   label: '帖子' },
  { value: 'other',   label: '其他' },
]

const INBOX = '__inbox__'

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

export default function SavePage() {
  const params = new URLSearchParams(window.location.search)
  const initUrl   = params.get('url')   || ''
  const initTitle = params.get('title') || ''

  const [title,    setTitle]    = useState(initTitle)
  const [type,     setType]     = useState(guessType(initUrl))
  const [note,     setNote]     = useState('')
  const [folderId, setFolderId] = useState(INBOX)
  const [folders,  setFolders]  = useState([])
  const [status,   setStatus]   = useState<'form' | 'saving' | 'done' | 'error'>('form')

  useEffect(() => {
    fetchFolders().then(setFolders).catch(console.error)
  }, [])

  const folderOptions = buildOptions(folders, folders.filter(f => !f.parentId))

  async function handleSave() {
    if (!initUrl.trim()) return
    setStatus('saving')
    try {
      await createItem({
        url:      initUrl.trim(),
        title:    title.trim() || initTitle || initUrl,
        type,
        note:     note.trim(),
        folderId: folderId === INBOX ? null : folderId,
      })
      setStatus('done')
      setTimeout(() => window.close(), 1200)
    } catch {
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3 bg-background">
        <CheckCircle size={32} className="text-green-600" />
        <p className="text-sm font-medium">已保存到 Pocket Brain</p>
        <p className="text-xs text-muted-foreground">窗口即将关闭…</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-3 bg-background">
        <p className="text-sm text-destructive">保存失败，请重试</p>
        <Button size="sm" variant="outline" onClick={() => setStatus('form')}>返回</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 h-12 border-b shrink-0">
        <Logo size={24} />
        <span className="text-sm font-semibold">Pocket Brain</span>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* URL 只读展示 */}
        <div>
          <p className="text-xs text-muted-foreground mb-1">链接</p>
          <p className="text-xs text-foreground truncate bg-muted rounded px-2 py-1.5">{initUrl || '（未获取到链接）'}</p>
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1">标题</label>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="留空则使用链接作为标题"
            className="text-sm h-8"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1">类型</label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1">存入文件夹</label>
          <Select value={folderId} onValueChange={setFolderId}>
            <SelectTrigger className="h-8 text-sm">
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

        <div>
          <label className="text-xs text-muted-foreground block mb-1">备注</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="添加备注…"
            rows={3}
            className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t shrink-0">
        <Button
          onClick={handleSave}
          disabled={!initUrl.trim() || status === 'saving'}
          className="w-full h-8 text-sm"
        >
          {status === 'saving' ? <><Loader2 size={14} className="animate-spin mr-2" />保存中…</> : '保存'}
        </Button>
      </div>
    </div>
  )
}
