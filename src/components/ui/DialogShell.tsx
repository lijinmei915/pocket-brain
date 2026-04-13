import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { XIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export const dialogShellHeaderClass = 'shrink-0 flex-row items-center gap-0 px-4 h-12 pr-12'
export const dialogShellBodyClass = 'flex-1 min-h-0 overflow-y-auto px-4 pt-1 pb-3'
export const dialogShellFooterClass = 'shrink-0 border-t bg-muted/40 px-4 py-3 flex justify-end gap-2'

interface DialogShellProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children?: React.ReactNode
  footer?: React.ReactNode
  className?: string
  showCloseButton?: boolean
}

export function DialogShell({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
  showCloseButton = true,
}: DialogShellProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn('sm:max-w-md max-h-[80vh] flex flex-col overflow-hidden p-0 gap-0', className)}
      >
        <DialogHeader className={cn('relative', dialogShellHeaderClass)}>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
          {showCloseButton ? (
            <DialogClose asChild>
              <button
                type="button"
                className="absolute top-1/2 right-2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-[min(var(--radius-md),12px)] border border-transparent text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                aria-label="关闭对话框"
              >
                <XIcon size={16} aria-hidden="true" />
                <span className="sr-only">关闭对话框</span>
              </button>
            </DialogClose>
          ) : null}
        </DialogHeader>
        {children}
        {footer ? <DialogFooter>{footer}</DialogFooter> : null}
      </DialogContent>
    </Dialog>
  )
}

export function DialogBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(dialogShellBodyClass, className)}>
      {children}
    </div>
  )
}

export function DialogFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn(dialogShellFooterClass, className)}>
      {children}
    </div>
  )
}
