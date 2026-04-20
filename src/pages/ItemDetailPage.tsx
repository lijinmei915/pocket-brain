import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { TextStyle, Color, FontSize, BackgroundColor } from '@tiptap/extension-text-style'
import Underline from '@tiptap/extension-underline'
import {
  ArrowLeft, ExternalLink, Pencil, Trash2, Download,
  FolderOpen, Check,
} from 'lucide-react'
import { deleteFile } from '@/utils/supabase'
import EditorBubbleMenu from '@/components/patterns/EditorBubbleMenu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TagChip, sortDisplayTags, getDisplayTags } from '@/components/ui/tag-chip'
import { Skeleton } from '@/components/ui/skeleton'
import { fetchItem, fetchFolders, deleteItem, fetchUserTagLibrary, type ItemTag } from '@/utils/supabase'
import { updateItemWithClassification } from '@/utils/item-service'
import ConfirmDialog from '@/components/patterns/ConfirmDialog'
import { cn } from '@/lib/utils'

function getFavicon(url) {
  try {
    const domain = new URL(url).hostname
    return `https://${domain}/favicon.ico`
  } catch { return null }
}

function toEditorContent(text: string) {
  if (!text) return ''
  if (text.trimStart().startsWith('<')) return text
  return text.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('')
}

function isSameTag(a: Pick<ItemTag, 'name' | 'type'>, b: Pick<ItemTag, 'name' | 'type'>) {
  return a.type === b.type && a.name.trim().toLowerCase() === b.name.trim().toLowerCase()
}

function normalizeTagText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['".,!?()[\]{}\-_/\\]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildTagSearchTokens(value: string) {
  const normalized = normalizeTagText(value)
  if (!normalized) return []

  const compact = normalized.replace(/\s+/g, '')
  const singular = normalized.endsWith('s') && normalized.length > 3
    ? normalized.slice(0, -1)
    : normalized

  return Array.from(new Set([normalized, compact, singular.replace(/\s+/g, '')].filter(Boolean)))
}

function resolveExactCanonicalTag(
  tag: Pick<ItemTag, 'name' | 'type'>,
  tagLibrary: Array<{ name: string; type: ItemTag['type'] }>
) {
  const candidates = tagLibrary.filter(candidate => candidate.type === tag.type)
  if (candidates.length === 0) return tag

  const sourceTokens = buildTagSearchTokens(tag.name)
  if (sourceTokens.length === 0) return tag

  const exactMatch = candidates.find(candidate => {
    const candidateTokens = buildTagSearchTokens(candidate.name)
    return candidateTokens.some(token => sourceTokens.includes(token))
  })

  return exactMatch ? { ...tag, name: exactMatch.name } : tag
}

function makeUserTag(name: string, type: ItemTag['type'] = 'content'): ItemTag | null {
  const nextName = String(name || '').replace(/^#/, '').trim()
  if (!nextName) return null
  return {
    id: `draft-${type}-${nextName.toLowerCase()}`,
    name: nextName,
    type,
    appliedBy: 'user',
  }
}

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [item, setItem] = useState(null)
  const [folders, setFolders] = useState([])
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editUrl, setEditUrl] = useState('')
  const [editTags, setEditTags] = useState<ItemTag[]>([])
  const [tagDraftName, setTagDraftName] = useState('')
  const [tagInputError, setTagInputError] = useState('')
  const [tagLibrary, setTagLibrary] = useState<Array<{ name: string; type: ItemTag['type'] }>>([])
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: '记录你的想法…' }),
      TextStyle,
      Color,
      FontSize,
      BackgroundColor,
      Underline,
    ],
    content: '',
    editable: false,
  })

  // Load data
  useEffect(() => {
    Promise.all([fetchItem(id!), fetchFolders()])
      .then(([fetchedItem, fetchedFolders]) => {
        setItem(fetchedItem)
        setFolders(fetchedFolders)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  // Sync editor content when item loads (only on item change, not editor state change)
  useEffect(() => {
    if (item?.note && editor && !isEditing) {
      editor.commands.setContent(toEditorContent(item.note))
    }
  }, [item?.id])


  function startEdit() {
    setEditTitle(item.title || '')
    setEditUrl(item.url || '')
    setEditTags(Array.isArray(item.tags) ? item.tags.filter(Boolean) : [])
    setTagDraftName('')
    setTagInputError('')
    void fetchUserTagLibrary()
      .then(tags => setTagLibrary(tags))
      .catch(error => {
        console.error('[PB] fetch tag library failed:', error)
        setTagLibrary([])
      })
    if (item.type === 'note') {
      editor?.commands.setContent(toEditorContent(item.note || ''))
      editor?.setEditable(true)
    }
    setIsEditing(true)
  }

  function cancelEdit() {
    if (item.type === 'note') {
      editor?.commands.setContent(toEditorContent(item.note || ''))
      editor?.setEditable(false)
    }
    setTagDraftName('')
    setTagInputError('')
    setIsEditing(false)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const isNote = item.type === 'note'
      const html = isNote ? (editor?.getHTML() || '') : ''
      const text = isNote ? (editor?.getText() || '') : ''
      const updated = await updateItemWithClassification(item.id, {
        title: editTitle.trim() || (isNote ? text.slice(0, 20).trim() || '无标题' : '无标题'),
        url: isNote ? null : (editUrl.trim() || null),
        type: item.type,
        note: html,
        tags: editTags,
      })
      setItem(updated)
      if (isNote) editor?.setEditable(false)
      setIsEditing(false)
    } catch (err) {
      console.error('[PB] save error:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    try {
      if (item?.type === 'file' && item?.url) {
        await deleteFile(item.url).catch(() => {}) // storage 删除失败不阻断
      }
      await deleteItem(id!)
      navigate('/')
    } catch (err) {
      console.error('[PB] delete error:', err)
    }
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background border-b h-14" />
        <div className="max-w-2xl mx-auto px-4 md:px-8 py-8 space-y-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-muted-foreground text-sm">找不到这条记录</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/')}>返回</Button>
      </div>
    )
  }

  const favicon = item.url ? getFavicon(item.url) : null
  const date = item.createdAt
    ? new Date(item.createdAt).toLocaleString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
    : ''
  const folder = folders.find(f => f.id === item.folderId)
  const isNote = item.type === 'note'
  const displayTags = sortDisplayTags(getDisplayTags(item.tags || []))
  const draftLower = tagDraftName.trim().toLowerCase()
  const isSearchingTags = draftLower.length > 0
  const searchTokens = isSearchingTags ? buildTagSearchTokens(draftLower) : []
  const searchMatches = isSearchingTags
    ? tagLibrary
        .filter(lib => {
          const libTokens = buildTagSearchTokens(lib.name)
          return libTokens.some(lt => searchTokens.some(st => lt.includes(st) || st.includes(lt)))
        })
        .filter(lib => !editTags.some(tag => isSameTag(tag, lib)))
        .slice(0, 8)
    : []
  const canCreateTag = Boolean(tagDraftName.trim()) && !searchMatches.some(match => normalizeTagText(match.name) === normalizeTagText(tagDraftName))

  function handleAddTag(nameOverride?: string, typeOverride: ItemTag['type'] = 'content') {
    const nextTag = makeUserTag(nameOverride ?? tagDraftName, typeOverride)
    if (!nextTag) {
      setTagInputError('')
      return
    }

    const normalized = resolveExactCanonicalTag(nextTag, tagLibrary)
    const duplicateTag = editTags.find(tag => isSameTag(tag, normalized))
    if (duplicateTag) {
      setTagInputError(`标签“${duplicateTag.name}”已存在`)
      return
    }

    setTagInputError('')
    setEditTags(prev => [...prev, { ...normalized, appliedBy: 'user', id: normalized.id || `${normalized.type}-${normalized.name}` }])
    setTagDraftName('')
  }

  function handleRemoveTag(tagToRemove: ItemTag) {
    setEditTags(prev => prev.filter(tag => !isSameTag(tag, tagToRemove)))
  }
  return (
    <div className="min-h-screen bg-background">
      {/* Sticky top: header row + toolbar */}
      <div className="sticky top-0 z-10 bg-background border-b">
        {/* Header row */}
        <div className="flex items-center justify-between px-4 md:px-8 h-12 gap-4">
          {/* Left: back + title */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => navigate('/')}
              className="shrink-0 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ArrowLeft size={16} />
            </button>
            <span className="text-sm font-medium truncate text-foreground">{item.title || '无标题'}</span>
          </div>
          {/* Right: actions */}
          <div className="flex items-center gap-2 shrink-0">
            {isEditing ? (
              <>
                <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={saving}>取消</Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? '保存中…' : '保存'}
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={startEdit}>
                  <Pencil size={13} className="mr-1.5" />编辑
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
                  <Trash2 size={13} className="mr-1.5" />删除
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 md:px-12 py-6">
        {/* Title — large document heading */}
        {isEditing ? (
          <input
            value={editTitle}
            onChange={e => setEditTitle(e.target.value)}
            placeholder={isNote ? '标题（留空则自动生成）' : '标题'}
            className="w-full text-3xl font-bold leading-tight bg-transparent outline-none placeholder:text-muted-foreground mb-6"
          />
        ) : (
          item.url ? (
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-2 group mb-6">
              {favicon && (
                <img src={favicon} alt="" className="w-6 h-6 rounded shrink-0 mt-1" onError={e => (e.target as HTMLImageElement).style.display = 'none'} />
              )}
              <h1 className="text-3xl font-bold leading-tight group-hover:text-primary transition-colors">
                {item.title || '无标题'}
                <ExternalLink size={16} className="inline ml-2 opacity-30 group-hover:opacity-60" />
              </h1>
            </a>
          ) : (
            <h1 className="text-3xl font-bold leading-tight mb-6">{item.title || '无标题'}</h1>
          )
        )}

        <div className="space-y-3 mb-6">
          {!isEditing && (
            <div className="flex flex-wrap gap-2">
              {displayTags.map(tag => (
                <TagChip
                  key={`${tag.id}-${tag.appliedBy}`}
                  tone={tag.appliedBy === 'user' ? 'user' : tag.type === 'source' ? 'source' : 'ai'}
                >
                  {tag.name}
                </TagChip>
              ))}
            </div>
          )}
          {(date || folder) && (
            <div className="flex items-center gap-2.5 flex-wrap text-xs text-muted-foreground">
              {date && <span>{date}</span>}
              {folder && (
                <span className="flex items-center gap-1">
                  <FolderOpen size={12} />{folder.name}
                </span>
              )}
            </div>
          )}
        </div>

        {/* URL fields — bookmark */}
        {isEditing && !isNote && (
          <div className="mb-6">
            <Input className="text-sm" value={editUrl} onChange={e => setEditUrl(e.target.value)} placeholder="https://..." />
          </div>
        )}

        {isEditing && (
          <div className="mb-6 space-y-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium">标签</label>
            </div>

            <div className="relative">
              <Input
                className="pr-11 text-sm"
                placeholder="输入标签名搜索或新建"
                value={tagDraftName}
                onChange={e => {
                  setTagDraftName(e.target.value)
                  if (tagInputError) setTagInputError('')
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddTag()
                  }
                }}
              />
              <button
                type="button"
                onClick={() => handleAddTag()}
                aria-label="添加标签"
                className={cn(
                  'absolute inset-y-1.5 right-2 inline-flex items-center rounded-sm px-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  tagDraftName.trim()
                    ? 'text-foreground hover:text-primary'
                    : 'text-muted-foreground/60 hover:text-muted-foreground'
                )}
              >
                <Check size={14} />
              </button>
            </div>

            {tagInputError && <p className="text-xs text-destructive">{tagInputError}</p>}

            {editTags.length > 0 && (
              <div className="flex gap-1.5">
                <span className="text-[11px] font-medium text-foreground shrink-0 leading-6">已选：</span>
                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  {editTags.map(tag => (
                    <TagChip
                      key={`${tag.id}-${tag.appliedBy}`}
                      tone={tag.appliedBy === 'user' ? 'user' : tag.type === 'source' ? 'source' : 'ai'}
                      onRemove={() => handleRemoveTag(tag)}
                    >
                      {tag.name}
                    </TagChip>
                  ))}
                </div>
              </div>
            )}

            {isSearchingTags && searchMatches.length > 0 && (
              <div className="flex gap-1.5">
                <span className="text-[11px] text-muted-foreground shrink-0 leading-6">匹配：</span>
                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  {searchMatches.map(tag => (
                    <TagChip
                      key={`${tag.type}-${tag.name}`}
                      tone="muted"
                      onClick={() => handleAddTag(tag.name, tag.type)}
                    >
                      {tag.name}
                    </TagChip>
                  ))}
                </div>
              </div>
            )}

            {isSearchingTags && canCreateTag && (
              <div className="flex gap-1.5">
                <span className="text-[11px] text-muted-foreground shrink-0 leading-6">新建：</span>
                <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                  <TagChip tone="muted" onClick={() => handleAddTag()}>
                    {`新建“${tagDraftName.trim()}”`}
                  </TagChip>
                </div>
              </div>
            )}
          </div>
        )}

        {!isEditing && item.url && item.type !== 'file' && (
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="block text-sm text-muted-foreground hover:text-primary transition-colors break-all mb-6">
            {item.url}
          </a>
        )}

        {!isEditing && item.type === 'file' && item.url && (
          <a
            href={item.url}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-input bg-muted/40 text-sm text-foreground hover:bg-muted transition-colors mb-6"
          >
            <Download size={14} />
            下载文件
          </a>
        )}

        {!isEditing && !isNote && item.note && item.note.trim() && (
          <div className="mb-8 rounded-xl border border-border/80 bg-muted/25 px-4 py-3">
            <div className="mb-1.5 text-xs font-medium text-foreground">备注</div>
            <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{item.note}</p>
          </div>
        )}

        {/* Body — note rich text */}
        {isNote && (
          <div className="tiptap-editor">
            {editor && <EditorBubbleMenu editor={editor} />}
            <EditorContent editor={editor} className="text-sm leading-relaxed min-h-[200px]" />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={open => { if (!open) setDeleteOpen(false) }}
        title="删除记录"
        description="确认删除？此操作无法撤回。"
        onConfirm={handleDelete}
        danger
      />
    </div>
  )
}
