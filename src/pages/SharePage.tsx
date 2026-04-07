import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

export default function SharePage() {
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const url   = params.get('url')   || params.get('text') || ''
    const title = params.get('title') || ''

    if (!url.trim()) {
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
