import * as React from 'react'
import { cn } from '@/lib/utils'

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-11 w-full rounded-xl border border-[var(--input)] bg-[var(--input-bg)] px-3 py-2 text-sm text-[var(--foreground)] shadow-sm transition-all placeholder:text-[var(--muted)] focus-visible:border-[var(--primary)] focus-visible:bg-[var(--card)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[var(--ring)]/15 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
)
Input.displayName = 'Input'