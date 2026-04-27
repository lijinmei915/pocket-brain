import type { ReactNode } from 'react'
import { CheckCircle2, CircleAlert, CircleHelp, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

type InlineMessageTone = 'default' | 'error' | 'warning' | 'success'

const toneConfig: Record<
  InlineMessageTone,
  { icon: React.ComponentType<{ className?: string; size?: number }>; className: string }
> = {
  default: {
    icon: CircleHelp,
    className: 'text-slate-500',
  },
  error: {
    icon: CircleAlert,
    className: 'text-destructive',
  },
  warning: {
    icon: TriangleAlert,
    className: 'text-amber-600',
  },
  success: {
    icon: CheckCircle2,
    className: 'text-emerald-600',
  },
}

interface InlineMessageProps {
  children: ReactNode
  tone?: InlineMessageTone
  showIcon?: boolean
  className?: string
}

export function InlineMessage({
  children,
  tone = 'default',
  showIcon = false,
  className,
}: InlineMessageProps) {
  const { icon: Icon, className: toneClassName } = toneConfig[tone]

  return (
    <p className={cn('flex items-start gap-1.5 text-sm leading-6', toneClassName, className)}>
      {showIcon ? <Icon size={14} className="mt-1 shrink-0" /> : null}
      <span>{children}</span>
    </p>
  )
}

