import { useState, useEffect } from 'react'
import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/Logo'
import { createItem, fetchFolders } from '@/utils/supabase'
import SaveForm from '@/components/features/SaveForm'

export default function SavePage() {
  const params     = new URLSearchParams(window.location.search)
  const initUrl    = params.get('url')   || ''
  const initTitle  = params.get('title') || ''

  const [folders, setFolders] = useState([])
  const [status,  setStatus]  = useState<'form' | 'done' | 'error'>('form')

  useEffect(() => {
    fetchFolders().then(setFolders).catch(console.error)
  }, [])

  async function handleSave(data) {
    try {
      await createItem(data)
      setStatus('done')
      setTimeout(() => window.close(), 1200)
    } catch {
      setStatus('error')
    }
  }

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
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 h-12 border-b shrink-0">
        <Logo size={24} />
        <span className="text-sm font-semibold">Pocket Brain</span>
      </div>

      <SaveForm
        folders={folders}
        initialUrl={initUrl}
        initialTitle={initTitle}
        onSave={handleSave}
        onCancel={() => window.close()}
      />
    </div>
  )
}
