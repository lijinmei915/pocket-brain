import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu'
import { Plus, ExternalLink, Trash2, Pencil, Inbox, Menu, FolderInput } from 'lucide-react'
import { MoreButton } from '@/components/ui/MoreButton'
import { ITEM_TYPE_LABELS, TagChip, sortDisplayTags } from '@/components/ui/tag-chip'
import ConfirmDialog from '@/components/patterns/ConfirmDialog'

function getFavicon(url) {
  try {
    const domain = new URL(url).hostname
    return `https://${domain}/favicon.ico`
  } catch {
    return null
  }
}

function getDomain(url) {
  try { return new URL(url).hostname.replace('www.', '') }
  catch { return url }
}

function getVisibleTags(tags = []) {
  const priority = { user: 0, ai: 1, content: 0, status: 1, source: 2 }
  return [...tags]
    .sort((a, b) => {
      const appliedDiff = (priority[a.appliedBy] ?? 9) - (priority[b.appliedBy] ?? 9)
      if (appliedDiff !== 0) return appliedDiff
      return (priority[a.type] ?? 9) - (priority[b.type] ?? 9)
    })
    .slice(0, 3)
}

function ItemCard({ item, folders, onDelete, onEdit, onMove, folderOptions = [] }) {
  const navigate = useNavigate()
  const favicon = getFavicon(item.url)
  const visibleTags = getVisibleTags(item.tags || [])
  const displayTags = sortDisplayTags(visibleTags)

  const date = item.createdAt ? new Date(item.createdAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : ''

  return (
    <div
      className="group relative flex flex-col bg-card border border-border rounded-lg p-3 hover:border-primary/40 hover:shadow-sm transition-all gap-2 cursor-pointer"
      style={{ boxShadow: 'var(--card-shadow)' }}
      onClick={() => navigate(`/item/${item.id}`)}
    >
      {/* Row 1: favicon + title | menu */}
      <div className="flex items-start justify-between gap-2">
        {item.url ? (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="flex items-start gap-1.5 min-w-0 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            {favicon && (
              <img src={favicon} alt="" className="w-4 h-4 rounded shrink-0 mt-0.5" onError={e => (e.target as HTMLImageElement).style.display = 'none'} />
            )}
            <span className="text-sm font-medium leading-snug line-clamp-1">{item.title || item.url}</span>
          </a>
        ) : (
          <span className="text-sm font-medium leading-snug line-clamp-1 min-w-0">{item.title || '无标题'}</span>
        )}
        <div onClick={e => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <MoreButton className="shrink-0" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            {item.url && (
            <DropdownMenuItem asChild>
              <a href={item.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={13} className="mr-2" /> 打开链接
              </a>
            </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onEdit(item)}>
              <Pencil size={13} className="mr-2" /> 编辑
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <FolderInput size={13} className="mr-2" /> 移动到…
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => onMove(item, null)}>
                  稍后整理
                </DropdownMenuItem>
                {folderOptions.map(opt => (
                  <DropdownMenuItem key={opt.id} onClick={() => onMove(item, opt.id)}>
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem onClick={() => onDelete(item.id)} variant="destructive">
              <Trash2 size={13} className="mr-2" /> 删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>

      {(item.summary || displayTags.length > 0 || item.type) && (
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-1 flex-wrap gap-1">
              <TagChip tone="type">{ITEM_TYPE_LABELS[item.type] || '其他'}</TagChip>
              {displayTags.map(tag => (
                <TagChip
                  key={`${item.id}-${tag.id}-${tag.appliedBy}`}
                  tone={tag.appliedBy === 'user' ? 'user' : tag.type === 'source' ? 'source' : 'ai'}
                >
                  {tag.name}
                </TagChip>
              ))}
            </div>
            {date && <span className="shrink-0 pt-1 text-[11px] leading-none text-muted-foreground">{date}</span>}
          </div>

          {item.summary && item.summary.trim() && (
            <p className="text-xs leading-5 text-muted-foreground line-clamp-2">
              {item.summary}
            </p>
          )}
        </div>
      )}
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
      <Button onClick={onAdd} size="default">
        <Plus size={14} /> 添加第一条
      </Button>
    </div>
  )
}

const SECTION_TITLES = {
  inbox: '稍后整理',
  all: '全部内容',
}

export default function ItemGrid({ items, folders, loading, selectedFolder, onUpdate, onDelete, onAdd, onEdit, onMobileMenuOpen }) {
  const [deleteId, setDeleteId] = useState(null)

  const sectionTitle = SECTION_TITLES[selectedFolder]
    || folders.find(f => f.id === selectedFolder)?.name
    || '收藏'

  async function handleDeleteConfirm() {
    if (deleteId) {
      await onDelete(deleteId)
    }
    setDeleteId(null)
  }

  async function handleMove(item, folderId) {
    await onUpdate(item.id, { folderId })
  }

  function buildFolderOptions(list, depth = 0) {
    return list.flatMap(f => {
      const prefix = depth > 0 ? '\u00a0\u00a0'.repeat(depth) + '└ ' : ''
      const children = folders.filter(c => c.parentId === f.id)
      return [
        { id: f.id, label: prefix + f.name },
        ...buildFolderOptions(children, depth + 1),
      ]
    })
  }
  const folderOptions = buildFolderOptions(folders.filter(f => !f.parentId))

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-8 border-b bg-background sticky top-0 z-10 h-14 shrink-0 overflow-hidden">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onMobileMenuOpen} className="p-1 rounded hover:bg-muted md:hidden">
            <Menu size={18} />
          </button>
          <h1 className="text-base font-semibold text-foreground truncate">{sectionTitle}</h1>
          {!loading && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {items.length} 条
            </span>
          )}
        </div>
        <Button onClick={onAdd} size="default">
          <Plus size={14} /> 添加
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
                onMove={handleMove}
                folderOptions={folderOptions}
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

    </div>
  )
}
