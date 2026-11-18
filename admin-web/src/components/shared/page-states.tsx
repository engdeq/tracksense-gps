import { AlertCircle, Inbox, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MOTION_STATUS_CLASS, MOTION_STATUS_LABEL } from '@/lib/status'
import type { MotionStatus } from '@/types/api'
import { cn } from '@/lib/utils'

export { PageHeader } from '@/components/shared/PageHeader'
export type { BreadcrumbItem } from '@/components/shared/PageHeader'

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-[var(--muted)]">
      <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      <p className="text-sm">{label}</p>
    </div>
  )
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[var(--color-danger)]/40 bg-[var(--color-danger)]/5 p-8 text-center">
      <AlertCircle className="h-10 w-10 text-[var(--color-danger)]" />
      <p className="max-w-md text-sm text-[var(--foreground)]">{message}</p>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  )
}

export function EmptyBlock({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--border)] p-8 text-center">
      <Inbox className="h-10 w-10 text-[var(--muted)]" />
      <p className="font-medium text-[var(--foreground)]">{title}</p>
      {description ? <p className="max-w-sm text-sm text-[var(--muted)]">{description}</p> : null}
    </div>
  )
}

export function StatusBadge({ status }: { status?: string }) {
  if (!status) return null
  const map: Record<string, string> = {
    active: 'success',
    online: 'success',
    inactive: 'secondary',
    offline: 'warning',
    suspended: 'danger',
    maintenance: 'warning',
  }
  const variant = (map[status] ?? 'secondary') as 'success' | 'secondary' | 'warning' | 'danger'
  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-2 py-0.5 text-xs font-medium capitalize',
        variant === 'success' && 'border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]',
        variant === 'warning' && 'border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 text-[var(--color-warning)]',
        variant === 'danger' && 'border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 text-[var(--color-danger)]',
        variant === 'secondary' && 'border-[var(--border)] bg-[var(--background)] text-[var(--muted)]',
      )}
    >
      {status}
    </span>
  )
}

export function MotionBadge({ status }: { status?: string }) {
  if (!status) return <span className="text-[var(--muted)]">—</span>
  const key = status as MotionStatus
  const cls = MOTION_STATUS_CLASS[key]
  if (!cls) return <span className="capitalize">{status}</span>
  return (
    <span className={cn('inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold', cls)}>
      {MOTION_STATUS_LABEL[key] ?? status}
    </span>
  )
}