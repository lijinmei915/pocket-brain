import type { ReactNode } from 'react'
import { InlineMessage } from '@/components/primitive/InlineMessage'
import { cn } from '@/lib/utils'

type FormFieldMessageTone = 'default' | 'error' | 'warning' | 'success'

interface FormFieldMessageProps {
  children?: ReactNode
  tone?: FormFieldMessageTone
  className?: string
}

export function FormFieldMessage({
  children,
  tone = 'default',
  className,
}: FormFieldMessageProps) {
  const hasContent = Boolean(children)
  const shouldShowIcon = tone === 'error' || tone === 'warning' || tone === 'success'

  return (
    <div
      className={cn(
        'min-h-6 text-sm transition-all duration-200',
        hasContent ? 'opacity-100' : 'opacity-0',
        className
      )}
      aria-live="polite"
    >
      {hasContent ? (
        <InlineMessage tone={tone} showIcon={shouldShowIcon}>
          {children}
        </InlineMessage>
      ) : null}
    </div>
  )
}

