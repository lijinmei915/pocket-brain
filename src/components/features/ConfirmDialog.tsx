import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { dialogShellBodyClass, dialogShellFooterClass, dialogShellHeaderClass } from '@/components/ui/DialogShell'

export default function ConfirmDialog({ open, onOpenChange, title, description, onConfirm, danger }) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="gap-0 overflow-hidden p-0">
        <div className={dialogShellHeaderClass}>
          <AlertDialogTitle>{title}</AlertDialogTitle>
        </div>
        <div className={dialogShellBodyClass}>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </div>
        <AlertDialogFooter className={dialogShellFooterClass + ' !mx-0 !mb-0 !rounded-none'}>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={danger ? 'bg-destructive text-white hover:bg-destructive/90' : ''}
          >
            确认
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
