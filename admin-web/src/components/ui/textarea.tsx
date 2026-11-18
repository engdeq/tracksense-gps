import * as React from 'react'
import { cn } from '@/lib/utils'

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        'flex min-h-[88px] w-full rounded-xl border border-[var(--input)] bg-[var(--input-bg)] px-3 py-2 text-sm shadow-sm transition placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:bg-[var(--card)] focus:outline-none focus:ring-4 focus:ring-[var(--ring)]/15 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'
