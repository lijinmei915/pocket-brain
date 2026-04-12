import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormDialog } from '@/components/ui/FormDialog'
import { DialogActions } from '@/components/ui/DialogActions'

// mode: 'create' | 'rename'
export default function FolderDialog({ open, onOpenChange, mode, currentName, onConfirm }) {
  const [name, setName] = useState('')
  const inputId = 'folder-name'

  useEffect(() => {
    if (open) {
      setName(mode === 'rename' ? (currentName || '') : '')
    }
  }, [open, mode, currentName])

  function handleSubmit() {
    if (name.trim()) {
      onConfirm(name.trim())
      onOpenChange(false)
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={mode === 'rename' ? '重命名文件夹' : '新建文件夹'}
      className="sm:max-w-sm"
    >
        <div className="px-4 py-3">
          <label htmlFor={inputId} className="mb-1 block text-sm font-medium">
            文件夹名称
          </label>
          <Input
            id={inputId}
            name="folderName"
            className="text-sm"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="文件夹名称"
            autoComplete="off"
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
          />
        </div>
        <DialogActions>
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>取消</Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={!name.trim()}>
            {mode === 'rename' ? '确认' : '创建'}
          </Button>
        </DialogActions>
    </FormDialog>
  )
}
