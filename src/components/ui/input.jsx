import * as React from "react"
import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"

const inputVariants = cva(
  "w-full min-w-0 appearance-none border bg-transparent text-base shadow-none transition-all outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
  {
    variants: {
      size: {
        default: "h-8 rounded-lg px-2.5 py-1",
        sm: "h-9 rounded-xl px-3 py-2",
        lg: "h-12 rounded-xl px-3.5 py-2.5 text-[15px]",
        xl: "h-14 rounded-2xl px-4 py-3 text-base",
      },
      shadow: {
        none: "shadow-[var(--shadow-none)]",
        md: "shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-md-hover)]",
        lg: "shadow-[var(--shadow-lg)] hover:shadow-[var(--shadow-lg)]",
      },
    },
    defaultVariants: {
      size: "default",
      shadow: "none",
    },
  }
)

function Input({
  className,
  type,
  size = "default",
  shadow = "none",
  ...props
}) {
  return (
    <input
      type={type}
      data-slot="input"
      data-size={size}
      data-shadow={shadow}
      className={cn(
        inputVariants({ size, shadow }),
        className
      )}
      {...props} />
  );
}

export { Input }
