import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DialogFooter, DialogShell } from '@/components/ui/DialogShell'
import SaveForm from '@/components/features/SaveForm'

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
        renderFooter={({ canSave, saving, overLimit, isEdit, onSave, onCancel }) => (
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>取消</Button>
            <Button type="button" disabled={!canSave || saving || overLimit} onClick={onSave}>
              {saving ? <><Loader2 size={14} className="animate-spin mr-2" />保存中…</> : isEdit ? '更新' : '保存'}
            </Button>
          </DialogFooter>
        )}
      />
    </DialogShell>
  )
}
