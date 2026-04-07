import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Check, Copy } from 'lucide-react'

const APP_URL = 'https://pocket-brain-blush.vercel.app'
const BOOKMARKLET = `javascript:(function(){var u=encodeURIComponent(location.href),t=encodeURIComponent(document.title);window.open('${APP_URL}/save?url='+u+'&title='+t,'pbsave','width=360,height=560,toolbar=0,menubar=0,scrollbars=1')})();`

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="shrink-0 w-5 h-5 rounded-full bg-muted text-muted-foreground text-[11px] font-medium flex items-center justify-center mt-0.5">{n}</span>
      <p className="text-sm text-foreground leading-relaxed">{children}</p>
    </div>
  )
}

export default function GetAppDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [tab, setTab] = useState<'bookmarklet' | 'extension' | 'pwa'>('bookmarklet')
  const [copied, setCopied] = useState(false)

  function copyBookmarklet() {
    navigator.clipboard.writeText(BOOKMARKLET)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-0 shrink-0">
          <DialogTitle>获取应用</DialogTitle>
        </DialogHeader>

        {/* Tab switcher */}
        <div className="px-4 pt-3 shrink-0">
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            {([
              { key: 'bookmarklet', label: '书签栏' },
              { key: 'extension',  label: 'Chrome 扩展' },
              { key: 'pwa',        label: '手机 PWA' },
            ] as const).map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={cn(
                  'flex-1 text-xs font-medium py-1.5 rounded-md transition-colors',
                  tab === t.key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-4 space-y-3 min-h-[180px]">

          {tab === 'bookmarklet' && (
            <>
              <Step n={1}>在任意网页上，点击书签栏中的「Pocket Brain」即可弹出保存窗口。</Step>
              <Step n={2}>如果还没有这个书签，点击下方按钮复制代码，然后在浏览器书签栏新建书签，将代码粘贴到「网址」栏。</Step>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-sm gap-2 mt-1"
                onClick={copyBookmarklet}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? '已复制' : '复制书签代码'}
              </Button>
            </>
          )}

          {tab === 'extension' && (
            <>
              <Step n={1}>下载项目中的 <code className="text-xs bg-muted px-1 py-0.5 rounded">extension/</code> 文件夹到本地。</Step>
              <Step n={2}>打开 Chrome，地址栏输入 <code className="text-xs bg-muted px-1 py-0.5 rounded">chrome://extensions</code>。</Step>
              <Step n={3}>开启右上角「开发者模式」，点击「加载已解压的扩展程序」，选择 extension 文件夹。</Step>
              <Step n={4}>安装后点击工具栏图标，即可一键保存当前页面。</Step>
            </>
          )}

          {tab === 'pwa' && (
            <>
              <Step n={1}>用手机浏览器打开 <span className="text-primary font-medium">pocket-brain-blush.vercel.app</span>。</Step>
              <Step n={2}>iOS Safari：点击底部分享按钮 → 「添加到主屏幕」。</Step>
              <Step n={3}>Android Chrome：点击右上角菜单 → 「添加到主屏幕」或「安装应用」。</Step>
              <Step n={4}>安装后从主屏幕打开，系统分享时选择「Pocket Brain」即可保存内容。</Step>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
