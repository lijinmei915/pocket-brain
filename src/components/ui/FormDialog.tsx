import { DialogShell } from '@/components/ui/DialogShell'

interface FormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: React.ReactNode
  className?: string
}

export function FormDialog({ open, onOpenChange, title, children, className }: FormDialogProps) {
  return (
    <DialogShell open={open} onOpenChange={onOpenChange} title={title} className={className}>
      {children}
    </DialogShell>
  )
}
