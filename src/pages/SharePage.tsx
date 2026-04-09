import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

export default function SharePage() {
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const rawUrl   = params.get('url') || ''
    const rawText  = params.get('text') || ''
    const title    = params.get('title') || ''

    // 优先用 url 参数，没有则从 text 里提取第一个 http 链接（小红书等 app 把链接混在文字里）
    const extracted = rawText.match(/https?:\/\/[^\s"'<>）】]+/)?.[0] ?? ''
    const url = rawUrl.trim() || extracted.trim()

    if (!url) {
      navigate('/')
      return
    }

    const target = `/save?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`
    navigate(target, { replace: true })
  }, [])

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4 bg-background">
      <Loader2 size={32} className="animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">正在跳转…</p>
    </div>
  )
}
