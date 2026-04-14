import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DialogFooter } from '@/components/ui/DialogShell'
import { Logo } from '@/components/ui/Logo'
import { fetchFolders } from '@/utils/supabase'
import { createItemWithClassification } from '@/utils/item-service'
import SaveForm from '@/components/patterns/SaveForm'

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
  const [errorMessage,  setErrorMessage]  = useState('')

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
      await createItemWithClassification(data)
      setErrorMessage('')
      setStatus('done')
      if (!isStandalone) {
        setTimeout(() => { dismiss() }, 3000)
      }
    } catch (err) {
      console.error('[PB] save page error:', err)
      setErrorMessage(err instanceof Error ? err.message : '未知错误')
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
      {!isStandalone && <p className="text-xs text-muted-foreground">窗口即将关闭…</p>}
    </div>
  )

  if (status === 'error') return (
    <div className="flex flex-col items-center justify-center h-screen gap-3 bg-background">
      <p className="text-sm text-destructive">保存失败，请重试</p>
      {errorMessage && <p className="max-w-sm px-6 text-center text-xs text-muted-foreground break-all">{errorMessage}</p>}
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
        renderFooter={({ footerMessage, primaryDisabled, primaryLabel, saving, onSave, onCancel }) => (
          <DialogFooter className="rounded-none border-b-0 items-center justify-between gap-3">
            <p className="min-w-0 flex-1 text-xs text-muted-foreground" aria-live="polite">
              {footerMessage}
            </p>
            <div className="flex shrink-0 gap-2">
              <Button type="button" variant="outline" onClick={onCancel}>取消</Button>
              <Button type="button" disabled={primaryDisabled} onClick={onSave}>
                {saving ? <><Loader2 size={14} className="animate-spin mr-2" />{primaryLabel}</> : primaryLabel}
              </Button>
            </div>
          </DialogFooter>
        )}
      />
    </div>
  )
}
