import { useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const APP_URL = typeof window !== 'undefined' ? window.location.origin : 'https://pocket-brain-blush.vercel.app'
const BOOKMARKLET = `javascript:(function(){var a='${APP_URL}',u=encodeURIComponent(location.href),t=encodeURIComponent(document.title),s=a+'/save?url='+u+'&title='+t,w=window.open(s,'pbsave','width=360,height=560,toolbar=0,menubar=0,scrollbars=1');if(!w)location.href=s;})();`

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

  // React 会拦截 href="javascript:..."，用 callback ref 直接写 DOM 绕过
  const bookmarkletRef = useCallback((node: HTMLAnchorElement | null) => {
    if (node) node.setAttribute('href', BOOKMARKLET)
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-0 shrink-0">
          <DialogTitle>获取应用</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={value => setTab(value as typeof tab)} className="gap-0">
          <div className="px-4 pt-3 shrink-0">
            <TabsList>
              <TabsTrigger value="bookmarklet">书签栏</TabsTrigger>
              <TabsTrigger value="extension">Chrome 扩展</TabsTrigger>
              <TabsTrigger value="pwa">手机 PWA</TabsTrigger>
            </TabsList>
          </div>

          <div className="px-4 py-4 min-h-[200px]">
            <TabsContent value="bookmarklet" className="space-y-3">
              <Step n={1}>
                先显示书签栏：Mac 按 <kbd className="text-xs bg-muted px-1 py-0.5 rounded">⌘ Shift B</kbd>，Windows 按 <kbd className="text-xs bg-muted px-1 py-0.5 rounded">Ctrl Shift B</kbd>。
              </Step>
              <Step n={2}>
                把下方按钮直接拖到书签栏，松手即完成安装。
              </Step>
              {/* 拖拽目标：真实的 <a href="javascript:..."> */}
              <div className="flex justify-center pt-1">
                <a
                  ref={bookmarkletRef}
                  href="#"
                  onClick={e => e.preventDefault()}
                  draggable
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-input bg-muted text-sm font-medium text-foreground cursor-grab active:cursor-grabbing select-none hover:bg-muted/70 transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 200 200" fill="none">
                    <path d="M166.662 16.668C173.292 16.668 179.651 19.302 184.34 23.9902C189.028 28.6786 191.662 35.0376 191.662 41.668V91.668C191.662 115.978 182.005 139.293 164.815 156.483C147.625 173.673 124.31 183.33 100 183.33C75.6896 183.33 52.3746 173.673 35.1846 156.483C17.9945 139.293 8.33789 115.978 8.33789 91.668V41.668C8.33789 35.0376 10.9717 28.6786 15.6602 23.9902C20.3485 19.3019 26.7076 16.668 33.3379 16.668H166.662Z" fill="black" fillOpacity="0.9"/>
                    <path d="M88.4221 107.42H71.3159C69.0825 107.42 67.5419 105.185 68.3366 103.099L85.3345 58.4824C85.5645 57.8788 85.9724 57.3593 86.5042 56.9927C87.0361 56.6261 87.6668 56.4298 88.3127 56.4297H116.996C119.259 56.4297 120.802 58.7226 119.948 60.8189L110.05 85.1119H128.682C131.423 85.1119 132.885 88.3419 131.077 90.401L85.3961 142.453C83.1755 144.984 79.0583 142.791 79.92 139.536L88.4221 107.42Z" fill="white"/>
                  </svg>
                  Pocket Brain
                </a>
              </div>
              <Step n={3}>
                安装后在任意网页点击书签栏中的「Pocket Brain」，即可弹出保存窗口。
              </Step>
            </TabsContent>

            <TabsContent value="extension" className="space-y-3">
              <Step n={1}>下载项目中的 <code className="text-xs bg-muted px-1 py-0.5 rounded">extension/</code> 文件夹到本地。</Step>
              <Step n={2}>打开 Chrome，地址栏输入 <code className="text-xs bg-muted px-1 py-0.5 rounded">chrome://extensions</code>。</Step>
              <Step n={3}>开启右上角「开发者模式」，点击「加载已解压的扩展程序」，选择 extension 文件夹。</Step>
              <Step n={4}>安装后点击工具栏图标，即可一键保存当前页面。</Step>
            </TabsContent>

            <TabsContent value="pwa" className="space-y-3">
              <Step n={1}>用手机浏览器打开 <span className="text-primary font-medium">{APP_URL.replace(/^https?:\/\//, '')}</span>。</Step>
              <Step n={2}>iOS Safari：点击底部分享按钮 → 「添加到主屏幕」。</Step>
              <Step n={3}>Android Chrome：点击右上角菜单 → 「添加到主屏幕」或「安装应用」。</Step>
              <Step n={4}>安装后从主屏幕打开，系统分享时选择「Pocket Brain」即可保存内容。</Step>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
