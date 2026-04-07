import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, Loader2 } from 'lucide-react'
import { createItem } from '@/utils/supabase'

function guessType(url: string) {
  const u = (url || '').toLowerCase()
  if (/youtube\.com|youtu\.be|vimeo\.com|bilibili\.com/.test(u)) return 'video'
  if (/twitter\.com|x\.com|weibo\.com|xiaohongshu/.test(u)) return 'tweet'
  if (/spotify\.com|podcast|\.mp3|\.wav/.test(u)) return 'audio'
  return 'article'
}

export default function SharePage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<'saving' | 'done' | 'error'>('saving')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const url   = params.get('url')   || params.get('text') || ''
    const title = params.get('title') || url

    if (!url.trim()) {
      navigate('/')
      return
    }

    createItem({
      url: url.trim(),
      title: title.trim() || url.trim(),
      type: guessType(url),
      note: '',
      folderId: null,
    })
      .then(() => {
        setStatus('done')
        setTimeout(() => navigate('/'), 1200)
      })
      .catch(() => {
        setStatus('error')
        setTimeout(() => navigate('/'), 2000)
      })
  }, [])

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4 bg-background">
      {status === 'saving' && (
        <>
          <Loader2 size={32} className="animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">正在保存…</p>
        </>
      )}
      {status === 'done' && (
        <>
          <CheckCircle size={32} className="text-green-600" />
          <p className="text-sm font-medium">已保存到 Pocket Brain</p>
        </>
      )}
      {status === 'error' && (
        <p className="text-sm text-destructive">保存失败，请重试</p>
      )}
    </div>
  )
}
