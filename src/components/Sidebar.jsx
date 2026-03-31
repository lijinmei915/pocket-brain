import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Inbox, BookOpen, Plus, Search, FolderOpen, Folder,
  MoreHorizontal, Pencil, Trash2, FolderPlus, Brain, X
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import FolderDialog from '@/components/FolderDialog'
import ConfirmDialog from '@/components/ConfirmDialog'
import { cn } from '@/lib/utils'

function FolderItem({ folder, folders, items, selected, depth, onSelect, onRename, onDelete, onCreateSub }) {
  const children = folders.filter(f => f.parentId === folder.id)
  const count = items.filter(i => i.folderId === folder.id).length
  const isSelected = selected === folder.id

  return (
    <div>
      <div
        className={cn(
          'group flex items-center gap-1.5 rounded-md px-2 py-1.5 cursor-pointer text-sm transition-colors',
          isSelected ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-foreground'
        )}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => onSelect(folder.id)}
      >
        {isSelected
          ? <FolderOpen size={14} className="shrink-0" />
          : <Folder size={14} className="shrink-0 text-muted-foreground" />
        }
        <span className="flex-1 truncate">{folder.name}</span>
        {count > 0 && <span className="text-xs text-muted-foreground">{count}</span>}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
            <button className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-muted-foreground/20 transition-opacity">
              <MoreHorizontal size={13} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={() => onCreateSub(folder.id)}>
              <FolderPlus size={13} className="mr-2" /> 新建子文件夹
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRename(folder.id, folder.name)}>
              <Pencil size={13} className="mr-2" /> 重命名
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(folder.id)} className="text-destructive">
              <Trash2 size={13} className="mr-2" /> 删除文件夹
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {children.map(child => (
        <FolderItem
          key={child.id}
          folder={child}
          folders={folders}
          items={items}
          selected={selected}
          depth={depth + 1}
          onSelect={onSelect}
          onRename={onRename}
          onDelete={onDelete}
          onCreateSub={onCreateSub}
        />
      ))}
    </div>
  )
}

export default function Sidebar({ folders, items, selected, onSelect, onCreateFolder, onRenameFolder, onDeleteFolder, search, onSearch, onAdd, mobileOpen, onMobileClose }) {
  // Dialog states
  const [folderDialogOpen, setFolderDialogOpen] = useState(false)
  const [folderDialogMode, setFolderDialogMode] = useState('create')
  const [folderDialogParent, setFolderDialogParent] = useState(null)
  const [folderDialogName, setFolderDialogName] = useState('')
  const [folderDialogId, setFolderDialogId] = useState(null)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState(null)

  const inboxCount = items.filter(i => !i.folderId).length
  const allCount = items.length
  const rootFolders = folders.filter(f => !f.parentId)

  function openCreateFolder(parentId = null) {
    setFolderDialogMode('create')
    setFolderDialogParent(parentId)
    setFolderDialogName('')
    setFolderDialogId(null)
    setFolderDialogOpen(true)
  }

  function openRenameFolder(id, currentName) {
    setFolderDialogMode('rename')
    setFolderDialogId(id)
    setFolderDialogName(currentName)
    setFolderDialogOpen(true)
  }

  async function handleFolderConfirm(name) {
    if (folderDialogMode === 'create') {
      await onCreateFolder(name, folderDialogParent)
    } else {
      await onRenameFolder(folderDialogId, name)
    }
  }

  function openDeleteFolder(id) {
    setDeleteTargetId(id)
    setDeleteDialogOpen(true)
  }

  async function handleDeleteConfirm() {
    if (deleteTargetId) {
      await onDeleteFolder(deleteTargetId)
    }
    setDeleteDialogOpen(false)
  }

  function handleSelect(id) {
    onSelect(id)
    onMobileClose?.()
  }

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-4 border-b">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
          <Brain size={14} className="text-primary-foreground" />
        </div>
        <span className="font-semibold text-sm">Pocket Brain</span>
        {/* Mobile close button */}
        <button
          onClick={onMobileClose}
          className="ml-auto p-1 rounded hover:bg-muted md:hidden"
        >
          <X size={16} />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="搜索…"
            className="pl-7 h-8 text-sm"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 px-2">
        <Button onClick={() => { onAdd(); onMobileClose?.() }} size="sm" className="w-full mb-3 gap-1.5">
          <Plus size={14} /> 添加收藏
        </Button>

        <div className="space-y-0.5 mb-2">
          <NavItem icon={Inbox} label="收件箱" count={inboxCount} active={selected === 'inbox'} onClick={() => handleSelect('inbox')} />
          <NavItem icon={BookOpen} label="全部内容" count={allCount} active={selected === 'all'} onClick={() => handleSelect('all')} />
        </div>

        <Separator className="my-2" />

        <div className="flex items-center justify-between px-2 mb-1">
          <span className="text-xs font-medium text-muted-foreground tracking-wider">文件夹</span>
          <button
            className="p-0.5 rounded hover:bg-muted text-muted-foreground"
            onClick={() => openCreateFolder(null)}
            title="新建文件夹"
          >
            <FolderPlus size={13} />
          </button>
        </div>

        <div className="space-y-0.5">
          {rootFolders.map(folder => (
            <FolderItem
              key={folder.id}
              folder={folder}
              folders={folders}
              items={items}
              selected={selected}
              depth={0}
              onSelect={handleSelect}
              onRename={openRenameFolder}
              onDelete={openDeleteFolder}
              onCreateSub={openCreateFolder}
            />
          ))}
        </div>
      </ScrollArea>

      <div className="px-4 py-3 border-t">
        <p className="text-xs text-muted-foreground">共 {allCount} 条收藏</p>
      </div>

      {/* Dialogs */}
      <FolderDialog
        open={folderDialogOpen}
        onOpenChange={setFolderDialogOpen}
        mode={folderDialogMode}
        currentName={folderDialogName}
        onConfirm={handleFolderConfirm}
      />
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="删除文件夹"
        description="删除后，文件夹内的收藏会移到收件箱。确认删除？"
        onConfirm={handleDeleteConfirm}
        danger
      />
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex w-56 border-r bg-sidebar flex-col h-full shrink-0">
        {sidebarContent}
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={onMobileClose} />
          <div className="relative w-64 h-full bg-sidebar flex flex-col shadow-xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  )
}

function NavItem({ icon: Icon, label, count, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors text-left',
        active ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-muted text-foreground'
      )}
    >
      <Icon size={14} className={active ? 'text-primary' : 'text-muted-foreground'} />
      <span className="flex-1">{label}</span>
      {count > 0 && <span className="text-xs text-muted-foreground">{count}</span>}
    </button>
  )
}
