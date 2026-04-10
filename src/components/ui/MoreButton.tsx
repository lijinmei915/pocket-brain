import { forwardRef } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * 统一的「更多操作」触发按钮，用于 DropdownMenuTrigger asChild。
 * hideUntilHover：侧边栏场景，默认隐藏，hover 父级时显示。
 */
export const MoreButton = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { hideUntilHover?: boolean }
>(({ hideUntilHover = false, className, ...props }, ref) => (
  <button
    ref={ref}
    {...props}
    className={cn(
      'p-0.5 rounded text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
      hideUntilHover && 'opacity-0 group-hover:opacity-100 transition-opacity',
      className
    )}
  >
    <MoreHorizontal size={13} />
  </button>
))
MoreButton.displayName = 'MoreButton'
