import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import SaveForm from '@/components/features/SaveForm'

export default function AddItemDialog({ open, onOpenChange, folders, onSave, defaultFolderId, editItem }) {
  // 每次打开对话框时重置表单（通过 key 强制重新挂载 SaveForm）
  const [formKey, setFormKey] = useState(0)
  useEffect(() => {
    if (open) setFormKey(k => k + 1)
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-0 shrink-0">
          <DialogTitle>{editItem ? '编辑' : '添加'}</DialogTitle>
        </DialogHeader>
        <SaveForm
          key={formKey}
          folders={folders}
          initialUrl={editItem?.url ?? ''}
          initialTitle={editItem?.title ?? ''}
          defaultFolderId={editItem?.folderId ?? defaultFolderId}
          editItem={editItem}
          onSave={onSave}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
