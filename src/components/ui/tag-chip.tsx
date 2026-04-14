import { X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

export const ITEM_TYPE_LABELS: Record<string, string> = {
  article: '文章',
  video: '视频',
  audio: '音频',
  tweet: '帖子',
  other: '其他',
  note: '灵感',
  file: '资料',
}

const TONE_STYLES = {
  type: 'bg-muted/45 text-muted-foreground border-border/60',
  source: 'bg-muted/45 text-muted-foreground border-border/60',
  ai: 'bg-muted/45 text-muted-foreground border-border/60',
  user: 'bg-muted/45 text-muted-foreground border-border/60',
  muted: 'bg-muted/55 text-muted-foreground border-border/60',
}

const baseChipClassName =
  'h-[22px] rounded-full px-2 text-[11px] font-medium leading-none shadow-none'

export function getTagChipTone(tag?: { type?: string; appliedBy?: string }) {
  if (tag?.appliedBy === 'user') return 'user'
  if (tag?.type === 'source') return 'source'
  return 'ai'
}

export function sortDisplayTags(tags = []) {
  const priority = {
    source: 0,
    ai: 1,
    user: 2,
  }

  return [...tags].sort((a, b) => {
    const aTone = getTagChipTone(a)
    const bTone = getTagChipTone(b)
    return (priority[aTone] ?? 9) - (priority[bTone] ?? 9)
  })
}

interface TagChipProps {
  children: React.ReactNode
  tone?: keyof typeof TONE_STYLES
  className?: string
  onClick?: () => void
  onRemove?: () => void
  disabled?: boolean
}

export function TagChip({
  children,
  tone = 'ai',
  className,
  onClick,
  onRemove,
  disabled = false,
}: TagChipProps) {
  const chipClassName = cn(
    baseChipClassName,
    'inline-flex max-w-full items-center gap-1 transition-colors',
    disabled && 'opacity-50',
    TONE_STYLES[tone],
    className
  )

  if (onRemove) {
    return (
      <Badge variant="outline" className={chipClassName}>
        <span className="truncate">{children}</span>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex size-3.5 items-center justify-center rounded-full text-current/70 transition-colors hover:bg-black/6 hover:text-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={`移除 ${typeof children === 'string' ? children : '标签'}`}
        >
          <X size={9} />
        </button>
      </Badge>
    )
  }

  if (onClick) {
    return (
      <Badge asChild variant="outline" className={chipClassName}>
        <button type="button" onClick={onClick} disabled={disabled}>
          <span className="truncate">{children}</span>
        </button>
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className={chipClassName}>
      {children}
    </Badge>
  )
}
