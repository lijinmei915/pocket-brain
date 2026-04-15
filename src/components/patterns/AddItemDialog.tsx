import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DialogFooter, DialogShell } from '@/components/ui/DialogShell'
import SaveForm from '@/components/patterns/SaveForm'
import { cn } from '@/lib/utils'

export default function AddItemDialog({ open, onOpenChange, folders, onSave, defaultFolderId, editItem }) {
  // 每次打开对话框时重置表单（通过 key 强制重新挂载 SaveForm）
  const [formKey, setFormKey] = useState(0)
  useEffect(() => {
    if (open) setFormKey(k => k + 1)
  }, [open])

  return (
    <DialogShell open={open} onOpenChange={onOpenChange} title={editItem ? '编辑' : '添加'}>
      <SaveForm
        key={formKey}
        folders={folders}
        initialUrl={editItem?.url ?? ''}
        initialTitle={editItem?.title ?? ''}
        defaultFolderId={editItem?.folderId ?? defaultFolderId}
        editItem={editItem}
        onSave={onSave}
        onCancel={() => onOpenChange(false)}
        renderFooter={({ footerMessage, footerTone, primaryDisabled, primaryLabel, saving, onSave, onCancel }) => (
          <DialogFooter className="items-center justify-between gap-3">
            <p
              className={cn(
                'min-w-0 flex-1 text-xs',
                footerTone === 'error' ? 'text-destructive' : 'text-muted-foreground'
              )}
              aria-live="polite"
            >
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
    </DialogShell>
  )
}
