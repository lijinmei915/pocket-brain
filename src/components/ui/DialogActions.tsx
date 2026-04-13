import { DialogFooter } from '@/components/ui/DialogShell'

/**
 * 兼容旧调用名，实际复用 DialogShell 的底部操作区。
 */
export function DialogActions({ children }: { children: React.ReactNode }) {
  return <DialogFooter>{children}</DialogFooter>
}
