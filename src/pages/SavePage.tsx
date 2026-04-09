import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/Logo'
import { createItem, fetchFolders } from '@/utils/supabase'
import SaveForm from '@/components/features/SaveForm'

// PWA standalone 模式下 window.close() 无效，改为跳回首页
const isStandalone = window.matchMedia('(display-mode: standalone)').matches

function dismiss() {
  if (isStandalone) return false // 让调用方用 navigate
  window.close()
  return true
}

export default function SavePage() {
  const navigate   = useNavigate()
  const params     = new URLSearchParams(window.location.search)
  const initUrl    = params.get('url')   || ''
  const initTitle  = params.get('title') || ''

  const [folders,       setFolders]       = useState([])
  const [status,        setStatus]        = useState<'form' | 'done' | 'error'>('form')
  const [resolvedTitle, setResolvedTitle] = useState(initTitle)

  useEffect(() => {
    fetchFolders().then(setFolders).catch(console.error)
  }, [])

  // 有 URL 但没有标题时，后台自动抓取
  useEffect(() => {
    if (!initUrl || initTitle) return
    fetch(`/api/fetch-title?url=${encodeURIComponent(initUrl)}`)
      .then(r => r.json())
      .then(data => { if (data.title) setResolvedTitle(data.title) })
      .catch(() => {})
  }, [])

  async function handleSave(data) {
    try {
      await createItem(data)
      setStatus('done')
      setTimeout(() => {
        if (!dismiss()) navigate('/')
      }, 1200)
    } catch {
      setStatus('error')
    }
  }

  function handleCancel() {
    if (!dismiss()) navigate('/')
  }

  if (status === 'done') return (
    <div className="flex flex-col items-center justify-center h-screen gap-3 bg-background">
      <CheckCircle size={32} className="text-green-600" />
      <p className="text-sm font-medium">已保存到 Pocket Brain</p>
      <p className="text-xs text-muted-foreground">{isStandalone ? '即将返回首页…' : '窗口即将关闭…'}</p>
    </div>
  )

  if (status === 'error') return (
    <div className="flex flex-col items-center justify-center h-screen gap-3 bg-background">
      <p className="text-sm text-destructive">保存失败，请重试</p>
      <Button size="sm" variant="outline" onClick={() => setStatus('form')}>返回</Button>
    </div>
  )

  return (
    <div className="flex flex-col h-[100dvh] bg-background">
      <div className="flex items-center gap-2 px-4 h-12 border-b shrink-0">
        <Logo size={24} />
        <span className="text-sm font-semibold">Pocket Brain</span>
      </div>

      <SaveForm
        folders={folders}
        initialUrl={initUrl}
        initialTitle={resolvedTitle}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  )
}
