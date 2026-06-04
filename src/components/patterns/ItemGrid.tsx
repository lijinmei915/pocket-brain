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
import { Plus, ExternalLink, Trash2, Pencil, Inbox, Menu, FolderInput, Download, Sparkles } from 'lucide-react'
import { MoreButton } from '@/components/ui/MoreButton'
import { TagChip, sortDisplayTags, getDisplayTags } from '@/components/ui/tag-chip'
import ConfirmDialog from '@/components/patterns/ConfirmDialog'

function getFavicon(url) {
  try {
    const domain = new URL(url).hostname
    return `https://${domain}/favicon.ico`
  } catch {
    return null
  }
}

function ItemCard({ item, onDelete, onEdit, onMove, onProcessKnowledge, folderOptions = [] }) {
  const navigate = useNavigate()
  const favicon = getFavicon(item.url)
  const visibleTags = getDisplayTags(item.tags || [], 3)
  const displayTags = sortDisplayTags(visibleTags)
  const knowledgeReady = Boolean(item.summary?.trim())
  const displayText = item.summary?.trim() || item.note?.trim()

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
            <DropdownMenuItem onClick={() => onProcessKnowledge(item)}>
              <Sparkles size={13} className="mr-2" /> 加工入库
            </DropdownMenuItem>
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

      {(displayText || displayTags.length > 0) && (
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-1 flex-wrap gap-1">
              {displayTags.map(tag => (
                <TagChip
                  key={`${item.id}-${tag.id}-${tag.appliedBy}`}
                  tone={tag.appliedBy === 'user' ? 'user' : tag.type === 'source' ? 'source' : 'ai'}
                >
                  {tag.name}
                </TagChip>
              ))}
            </div>
            <div className="flex shrink-0 items-center gap-1.5 pt-1">
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground">
                {knowledgeReady ? '已入库' : '原材料'}
              </span>
              {date && <span className="text-[11px] leading-none text-muted-foreground">{date}</span>}
            </div>
          </div>

          {displayText && (
            <p className="text-xs leading-5 text-muted-foreground line-clamp-2">
              {displayText}
            </p>
          )}

          {!knowledgeReady && (
            <button
              type="button"
              onClick={event => {
                event.stopPropagation()
                onProcessKnowledge(item)
              }}
              className="inline-flex items-center gap-1 rounded-md text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <Sparkles size={12} /> 加工入库
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function EmptyState({ selectedFolder, onAdd, onGetApp }) {
  const isInbox = selectedFolder === 'inbox'
  const isAll = selectedFolder === 'all'
  const description = isInbox
    ? '安装采集入口后，在任意网页一键保存；之后你可以选择把原材料加工成可复用的知识。'
    : isAll
      ? '还没有保存任何内容。先安装采集入口，或者手动添加第一条内容。'
      : '这个文件夹还是空的。你可以手动添加内容，或先安装采集入口，之后再移动到这里。'

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 py-16 text-center md:px-8">
      <div className="w-full max-w-2xl space-y-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card shadow-[var(--shadow-sm)]">
          <Inbox size={24} className="text-muted-foreground" />
        </div>

        <div className="space-y-2">
          <p className="text-lg font-semibold text-foreground">先把值得看的内容丢进来</p>
          <p className="mx-auto max-w-md text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>

        <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
          <Button onClick={onGetApp} size="lg" shadow="md">
            <Download size={15} /> 安装采集入口
          </Button>
          <Button onClick={onAdd} variant="outline" size="lg">
            <Plus size={15} /> 手动添加
          </Button>
        </div>

        <div className="mx-auto max-w-lg rounded-lg border border-dashed border-border bg-card/70 p-4 text-left shadow-[var(--shadow-none)]">
          <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Sparkles size={14} />
            保存后可以加工成这样
          </div>
          <div className="space-y-3 rounded-md border border-border bg-background p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">React 架构实践文章</p>
                <p className="mt-1 text-xs text-muted-foreground">确认入库：标题、摘要、标签</p>
              </div>
              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">待读</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {['React', '架构设计', '文章'].map(tag => (
                <span key={tag} className="rounded-md border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              AI 先生成知识草稿；你确认后才会写入摘要和标签。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

const SECTION_TITLES = {
  inbox: '稍后整理',
  all: '全部内容',
}

export default function ItemGrid({ items, folders, loading, selectedFolder, onUpdate, onMove, onDelete, onAdd, onGetApp, onEdit, onProcessKnowledge, onMobileMenuOpen }) {
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

  function handleMove(item, folderId) {
    onMove(item.id, folderId ?? null)
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
          <button onClick={onMobileMenuOpen} className="p-1 rounded hover:bg-muted md:hidden" aria-label="打开菜单">
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
        <EmptyState selectedFolder={selectedFolder} onAdd={onAdd} onGetApp={onGetApp} />
      ) : (
        <div className="p-4 md:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map(item => (
              <ItemCard
                key={item.id}
            item={item}
            onDelete={setDeleteId}
            onEdit={onEdit}
            onMove={handleMove}
            onProcessKnowledge={onProcessKnowledge}
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
