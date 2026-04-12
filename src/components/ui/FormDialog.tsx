import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface FormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: React.ReactNode
  className?: string
}

export function FormDialog({ open, onOpenChange, title, children, className }: FormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('sm:max-w-md max-h-[80vh] flex flex-col overflow-hidden p-0 gap-0', className)}>
        <DialogHeader className="px-4 pt-4 pb-0 shrink-0">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}
