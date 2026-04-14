import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DialogBody, DialogFooter, DialogShell } from '@/components/ui/DialogShell'

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
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={mode === 'rename' ? '重命名文件夹' : '新建文件夹'}
      className="sm:max-w-sm"
    >
        <DialogBody className="space-y-1">
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
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            {mode === 'rename' ? '确认' : '创建'}
          </Button>
        </DialogFooter>
    </DialogShell>
  )
}
