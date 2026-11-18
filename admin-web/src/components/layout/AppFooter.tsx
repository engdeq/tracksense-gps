import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import { APP_TAGLINE, APP_VERSION } from '@/lib/app-meta'
import { cn } from '@/lib/utils'

type HealthPayload = {
  api?: 'online' | 'offline'
  database?: 'online' | 'offline'
  gps?: 'online' | 'offline'
  version?: string
}

async function fetchHealth(): Promise<HealthPayload | null> {
  try {
    const { data } = await api.get<{ success?: boolean; data?: HealthPayload }>('/health')
    return data?.data ?? null
  } catch {
    return null
  }
}

function StatusDot({
  label,
  status,
}: {
  label: string
  status: 'online' | 'offline' | 'unknown'
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          status === 'online' && 'bg-[var(--success)]',
          status === 'offline' && 'bg-[var(--danger)]',
          status === 'unknown' && 'bg-[var(--muted)]',
        )}
        aria-hidden
      />
      <span>
        {label}:{' '}
        <span className="font-medium text-[var(--foreground)]/80">
          {status === 'unknown' ? 'Checking…' : status === 'online' ? 'Online' : 'Offline'}
        </span>
      </span>
    </span>
  )
}

export function AppFooter() {
  const health = useQuery({
    queryKey: ['system-health'],
    queryFn: fetchHealth,
    refetchInterval: 60_000,
    retry: 1,
  })

  const payload = health.data
  // Only show confirmed statuses from the health endpoint — never invent "Online"
  const apiStatus: 'online' | 'offline' | 'unknown' = health.isError
    ? 'offline'
    : payload?.api === 'online'
      ? 'online'
      : payload?.api === 'offline'
        ? 'offline'
        : health.isLoading
          ? 'unknown'
          : 'offline'
  const dbStatus: 'online' | 'offline' | 'unknown' =
    payload?.database === 'online' || payload?.database === 'offline'
      ? payload.database
      : health.isLoading
        ? 'unknown'
        : 'offline'
  const gpsStatus: 'online' | 'offline' | 'unknown' =
    payload?.gps === 'online' || payload?.gps === 'offline'
      ? payload.gps
      : health.isLoading
        ? 'unknown'
        : 'offline'

  const version = payload?.version || APP_VERSION

  return (
    <footer className="shrink-0 border-t border-[var(--border)] bg-[var(--card)]/90 backdrop-blur-sm">
      <div className="mx-auto flex min-h-[44px] w-full max-w-[1600px] flex-col items-start justify-between gap-2 px-5 py-2.5 text-xs sm:flex-row sm:items-center sm:px-6 lg:px-8">
        <p className="text-[var(--muted)]">
          © {new Date().getFullYear()} TrackSense. All rights reserved.
        </p>
        <p className="hidden text-[var(--muted)] md:block">
          {APP_TAGLINE} · v{version}
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <StatusDot label="API" status={apiStatus} />
          <StatusDot label="Database" status={dbStatus} />
          <StatusDot label="GPS" status={gpsStatus} />
        </div>
      </div>
    </footer>
  )
}
