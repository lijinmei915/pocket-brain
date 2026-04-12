import { useState, useEffect } from 'react'
import { FormDialog } from '@/components/ui/FormDialog'
import SaveForm from '@/components/features/SaveForm'

export default function AddItemDialog({ open, onOpenChange, folders, onSave, defaultFolderId, editItem }) {
  // 每次打开对话框时重置表单（通过 key 强制重新挂载 SaveForm）
  const [formKey, setFormKey] = useState(0)
  useEffect(() => {
    if (open) setFormKey(k => k + 1)
  }, [open])

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={editItem ? '编辑' : '添加'}>
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
    </FormDialog>
  )
}
