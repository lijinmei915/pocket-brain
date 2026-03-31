import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, ExternalLink, MoreHorizontal, Trash2, Pencil, BookOpen, Video, Headphones, MessageCircle, FileText, Inbox, Menu, FolderInput, Folder } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import ConfirmDialog from '@/components/ConfirmDialog'
import { cn } from '@/lib/utils'

const TYPE_CONFIG = {
  article: { icon: FileText,      label: '文章', color: 'bg-[#E8F7EF] text-[#00875A] border-[#B7DFC8]' },
  video:   { icon: Video,         label: '视频', color: 'bg-[#FFF1F0] text-[#CF1322] border-[#FFA39E]' },
  audio:   { icon: Headphones,    label: '音频', color: 'bg-[#F9F0FF] text-[#722ED1] border-[#D3ADF7]' },
  tweet:   { icon: MessageCircle, label: '帖子', color: 'bg-[#E6F4FF] text-[#096DD9] border-[#91CAFF]' },
  other:   { icon: BookOpen,      label: '其他', color: 'bg-[#F5F5F5] text-[#595959] border-[#D9D9D9]' },
}

function getFavicon(url) {
  try {
    const domain = new URL(url).hostname
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
  } catch {
    return null
  }
}

function getDomain(url) {
  try { return new URL(url).hostname.replace('www.', '') }
  catch { return url }
}

function ItemCard({ item, folders, onDelete, onEdit, onMove }) {
  const typeConf = TYPE_CONFIG[item.type] || TYPE_CONFIG.other
  const TypeIcon = typeConf.icon
  const folder = folders.find(f => f.id === item.folderId)
  const favicon = getFavicon(item.url)

  return (
    <div className="group relative flex flex-col bg-card border border-border rounded-lg p-4 hover:border-primary/40 hover:shadow-sm transition-all gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {favicon && (
            <img src={favicon} alt="" className="w-4 h-4 rounded shrink-0" onError={e => e.target.style.display = 'none'} />
          )}
          <span className="text-xs text-muted-foreground truncate">{getDomain(item.url)}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={cn('text-[10px] border rounded-full px-2 py-0.5 flex items-center gap-1', typeConf.color)}>
            <TypeIcon size={10} />{typeConf.label}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-muted transition-opacity">
                <MoreHorizontal size={14} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem asChild>
                <a href={item.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink size={13} className="mr-2" /> 打开链接
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(item)}>
                <Pencil size={13} className="mr-2" /> 编辑
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onMove(item)}>
                <FolderInput size={13} className="mr-2" /> 移动到…
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(item.id)} className="text-destructive">
                <Trash2 size={13} className="mr-2" /> 删除
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Title */}
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-medium leading-snug line-clamp-2 hover:text-primary transition-colors"
      >
        {item.title || item.url}
      </a>

      {/* Note */}
      {item.note && (
        <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/50 rounded-lg px-2.5 py-1.5 italic">
          {item.note}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-1">
        {folder ? (
          <span className="text-[10px] text-muted-foreground flex items-center gap-1 truncate">
            <Folder size={10} className="shrink-0" /> {folder.name}
          </span>
        ) : <span />}
        <span className="text-[10px] text-muted-foreground shrink-0">
          {item.createdAt ? new Date(item.createdAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) : ''}
        </span>
      </div>
    </div>
  )
}

function EmptyState({ selectedFolder, onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center py-20">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
        <Inbox size={28} className="text-muted-foreground" />
      </div>
      <div>
        <p className="font-medium text-foreground">还没有收藏</p>
        <p className="text-sm text-muted-foreground mt-1">
          {selectedFolder === 'inbox' ? '用浏览器扩展或点下方按钮开始收藏' : '这个文件夹还是空的'}
        </p>
      </div>
      <Button onClick={onAdd} size="sm" className="gap-1.5">
        <Plus size={14} /> 添加第一条
      </Button>
    </div>
  )
}

const SECTION_TITLES = {
  inbox: '收件箱',
  all: '全部内容',
}

export default function ItemGrid({ items, folders, loading, selectedFolder, onUpdate, onDelete, onAdd, onEdit, onMobileMenuOpen }) {
  const [deleteId, setDeleteId] = useState(null)
  const [moveItem, setMoveItem] = useState(null)
  const [moveFolderId, setMoveFolderId] = useState('__inbox__')

  const sectionTitle = SECTION_TITLES[selectedFolder]
    || folders.find(f => f.id === selectedFolder)?.name
    || '收藏'

  async function handleDeleteConfirm() {
    if (deleteId) {
      await onDelete(deleteId)
    }
    setDeleteId(null)
  }

  function openMove(item) {
    setMoveItem(item)
    setMoveFolderId(item.folderId || '__inbox__')
  }

  async function handleMove() {
    if (moveItem) {
      await onUpdate(moveItem.id, { folderId: moveFolderId === '__inbox__' ? null : moveFolderId })
    }
    setMoveItem(null)
  }

  // Build folder options for move
  function buildOptions(list, depth = 0) {
    return list.flatMap(f => {
      const prefix = depth > 0 ? '\u00a0\u00a0'.repeat(depth) + '└ ' : ''
      const children = folders.filter(c => c.parentId === f.id)
      return [
        { value: f.id, label: prefix + f.name },
        ...buildOptions(children, depth + 1),
      ]
    })
  }
  const folderOptions = buildOptions(folders.filter(f => !f.parentId))

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-8 py-4 border-b bg-background sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onMobileMenuOpen} className="p-1 rounded hover:bg-muted md:hidden">
            <Menu size={18} />
          </button>
          <h1 className="text-base font-semibold text-foreground">{sectionTitle}</h1>
          {!loading && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {items.length} 条
            </span>
          )}
        </div>
        <Button onClick={onAdd} size="sm" className="gap-1.5 h-8 text-xs">
          <Plus size={13} /> 新建收藏
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="p-4 md:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="border rounded-lg p-4 space-y-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      ) : items.length === 0 ? (
        <EmptyState selectedFolder={selectedFolder} onAdd={onAdd} />
      ) : (
        <div className="p-4 md:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map(item => (
              <ItemCard
                key={item.id}
                item={item}
                folders={folders}
                onDelete={setDeleteId}
                onEdit={onEdit}
                onMove={openMove}
              />
            ))}
          </div>
        </div>
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteId !== null}
        onOpenChange={open => { if (!open) setDeleteId(null) }}
        title="删除收藏"
        description="确认删除这条收藏？此操作无法撤回。"
        onConfirm={handleDeleteConfirm}
        danger
      />

      {/* Move to folder dialog */}
      {moveItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setMoveItem(null)}>
          <div className="bg-card rounded-lg border shadow-lg p-6 w-80 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-sm">移动到文件夹</h3>
            <p className="text-xs text-muted-foreground truncate">{moveItem.title}</p>
            <Select value={moveFolderId} onValueChange={setMoveFolderId}>
              <SelectTrigger>
                <SelectValue placeholder="收件箱" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__inbox__">收件箱</SelectItem>
                {folderOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setMoveItem(null)}>取消</Button>
              <Button size="sm" onClick={handleMove}>移动</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
