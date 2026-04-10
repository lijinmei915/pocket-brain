import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DialogActions } from '@/components/ui/DialogActions'

// mode: 'create' | 'rename'
export default function FolderDialog({ open, onOpenChange, mode, currentName, onConfirm }) {
  const [name, setName] = useState('')

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-0">
          <DialogTitle>{mode === 'rename' ? '重命名文件夹' : '新建文件夹'}</DialogTitle>
        </DialogHeader>
        <div className="px-4 py-3">
          <Input
            className="text-sm"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="文件夹名称"
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
      </DialogContent>
    </Dialog>
  )
}
