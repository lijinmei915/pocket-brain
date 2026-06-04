import { useEffect, useState } from 'react'
import { Check, Loader2, Plus, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { DialogBody, DialogShell } from '@/components/ui/DialogShell'
import { TagChip, getTagChipTone } from '@/components/ui/tag-chip'
import { cn } from '@/lib/utils'
import { generateKnowledgeDraft, type ConfirmedTagDraft, type KnowledgeDraft } from '@/utils/item-service'
import type { BookmarkItem, ItemTag } from '@/utils/supabase'

interface KnowledgeProcessDialogProps {
  open: boolean
  item: BookmarkItem | null
  onOpenChange: (open: boolean) => void
  onConfirm: (item: BookmarkItem, draft: KnowledgeDraft) => Promise<void>
}

function normalizeTagName(value: string) {
  return value.replace(/^#/, '').trim()
}

function isSameTag(a: Pick<ConfirmedTagDraft, 'name' | 'type'>, b: Pick<ConfirmedTagDraft, 'name' | 'type'>) {
  return a.type === b.type && a.name.trim().toLowerCase() === b.name.trim().toLowerCase()
}

function dedupeTags(tags: ConfirmedTagDraft[]) {
  const result: ConfirmedTagDraft[] = []
  for (const tag of tags) {
    if (!tag.name.trim()) continue
    if (result.some(existing => isSameTag(existing, tag))) continue
    result.push(tag)
  }
  return result
}

export default function KnowledgeProcessDialog({
  open,
  item,
  onOpenChange,
  onConfirm,
}: KnowledgeProcessDialogProps) {
  const [draft, setDraft] = useState<KnowledgeDraft | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [tagName, setTagName] = useState('')

  useEffect(() => {
    if (!open) {
      setDraft(null)
      setLoading(false)
      setSaving(false)
      setError('')
      setTagName('')
    }
  }, [open])

  async function handleGenerate() {
    if (!item) return
    setError('')
    setLoading(true)
    try {
      const result = await generateKnowledgeDraft(item)
      setDraft({
        title: result.title || item.title || '未命名内容',
        summary: result.summary || '',
        categoryId: result.categoryId ?? null,
        confidence: result.confidence ?? null,
        tags: dedupeTags(result.tags || []),
      })
    } catch (err) {
      console.error('[PB] generate knowledge draft failed:', err)
      setError(err instanceof Error ? err.message : '加工暂时失败，请稍后再试')
    } finally {
      setLoading(false)
    }
  }

  function updateDraft(changes: Partial<KnowledgeDraft>) {
    setDraft(prev => (prev ? { ...prev, ...changes } : prev))
  }

  function handleAddTag() {
    const name = normalizeTagName(tagName)
    if (!name || !draft) return

    const nextTag: ConfirmedTagDraft = {
      name,
      type: 'content' as ItemTag['type'],
      appliedBy: 'user',
    }
    updateDraft({ tags: dedupeTags([...draft.tags, nextTag]) })
    setTagName('')
  }

  async function handleConfirm() {
    if (!item || !draft) return
    setError('')
    setSaving(true)
    try {
      await onConfirm(item, {
        ...draft,
        title: draft.title.trim() || item.title || '未命名内容',
        summary: draft.summary.trim(),
        tags: dedupeTags(draft.tags),
      })
      onOpenChange(false)
    } catch (err) {
      console.error('[PB] confirm knowledge entry failed:', err)
      setError(err instanceof Error ? err.message : '入库失败，请稍后再试')
    } finally {
      setSaving(false)
    }
  }

  const canConfirm = Boolean(draft?.title.trim() && draft?.summary.trim()) && !saving

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="加工入库"
      description="AI 只生成草稿；确认前不会写入知识摘要和标签。"
      className="sm:max-w-lg"
      footer={
        draft ? (
          <div className="flex w-full items-center justify-between gap-3">
            <p className={cn('min-w-0 flex-1 text-xs', error ? 'text-destructive' : 'text-muted-foreground')}>
              {error || '确认后会更新这条内容的标题、摘要和标签。'}
            </p>
            <div className="flex shrink-0 gap-2">
              <Button type="button" variant="outline" onClick={() => void handleGenerate()} disabled={loading || saving}>
                {loading ? <><Loader2 size={14} className="mr-2 animate-spin" />加工中…</> : '重新加工'}
              </Button>
              <Button type="button" onClick={() => void handleConfirm()} disabled={!canConfirm}>
                {saving ? <><Loader2 size={14} className="mr-2 animate-spin" />入库中…</> : <><Check size={14} />确认入库</>}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex w-full items-center justify-between gap-3">
            <p className={cn('min-w-0 flex-1 text-xs', error ? 'text-destructive' : 'text-muted-foreground')}>
              {error || '先保存原材料，再由你决定是否加工成知识。'}
            </p>
            <Button type="button" onClick={() => void handleGenerate()} disabled={!item || loading}>
              {loading ? <><Loader2 size={14} className="mr-2 animate-spin" />加工中…</> : <><Sparkles size={14} />开始加工</>}
            </Button>
          </div>
        )
      }
    >
      <DialogBody className="space-y-4">
        {!draft ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 px-4 py-5">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-background text-muted-foreground">
                <Sparkles size={16} />
              </div>
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-medium text-foreground">{item?.title || '未命名内容'}</p>
                <p className="text-xs leading-5 text-muted-foreground">
                  这条内容目前只是原材料。点击开始加工后，会生成可编辑的知识草稿。
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium">知识标题</label>
              <Input
                value={draft.title}
                onChange={event => updateDraft({ title: event.target.value })}
                className="text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">知识摘要</label>
              <Textarea
                value={draft.summary}
                onChange={event => updateDraft({ summary: event.target.value })}
                placeholder="整理出未来能帮你找回和复用的摘要"
                className="min-h-28 resize-none text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium">标签</label>
              {draft.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {draft.tags.map(tag => (
                    <TagChip
                      key={`${tag.type}:${tag.name}:${tag.appliedBy}`}
                      tone={getTagChipTone(tag)}
                      onRemove={() => updateDraft({ tags: draft.tags.filter(candidate => !isSameTag(candidate, tag)) })}
                    >
                      {tag.name}
                    </TagChip>
                  ))}
                </div>
              )}
              <div className="relative">
                <Input
                  value={tagName}
                  onChange={event => setTagName(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      handleAddTag()
                    }
                  }}
                  placeholder="手动补充标签"
                  className="pr-11 text-sm"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="absolute inset-y-1.5 right-2 inline-flex items-center rounded-sm px-1.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label="添加标签"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </DialogBody>
    </DialogShell>
  )
}
