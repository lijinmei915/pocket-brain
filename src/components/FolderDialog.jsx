import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

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
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{mode === 'rename' ? '重命名文件夹' : '新建文件夹'}</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="文件夹名称"
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            {mode === 'rename' ? '确认' : '创建'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
