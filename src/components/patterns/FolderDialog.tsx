import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DialogBody, DialogFooter, DialogShell } from '@/components/ui/DialogShell'

// mode: 'create' | 'rename'
export default function FolderDialog({ open, onOpenChange, mode, currentName, onConfirm }) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const inputId = 'folder-name'

  useEffect(() => {
    if (open) {
      setName(mode === 'rename' ? (currentName || '') : '')
      setSaving(false)
      setError('')
    }
  }, [open, mode, currentName])

  async function handleSubmit() {
    if (!name.trim() || saving) return

    setSaving(true)
    setError('')
    try {
      await onConfirm(name.trim())
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存文件夹失败，请稍后重试')
    } finally {
      setSaving(false)
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
            disabled={saving}
            onKeyDown={e => { if (e.key === 'Enter') void handleSubmit() }}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>取消</Button>
          <Button onClick={() => void handleSubmit()} disabled={!name.trim() || saving}>
            {saving ? '保存中…' : mode === 'rename' ? '确认' : '创建'}
          </Button>
        </DialogFooter>
    </DialogShell>
  )
}
