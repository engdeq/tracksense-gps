import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { alertsApi } from '@/api/endpoints'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyBlock, ErrorBlock, LoadingBlock, PageHeader } from '@/components/shared/page-states'
import { formatDate } from '@/lib/utils'
import type { Alert } from '@/types/api'

function vehicleLine(a: Alert) {
  const v = a.vehicleId
  if (!v || typeof v === 'string') return ''
  return `${v.name ?? ''} ${v.plateNumber ?? ''}`
}

export function AlertsPage() {
  const qc = useQueryClient()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => alertsApi.list({ limit: 50, page: 1 }),
  })

  const markAll = useMutation({
    mutationFn: () => alertsApi.markAllRead(),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['alerts'] }),
  })

  return (
    <div>
      <PageHeader
        title="Alerts & notifications"
        description="Speed, geofence, and device events"
        actions={
          <Button variant="outline" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
            Mark all read
          </Button>
        }
      />
      <Card>
        <CardContent className="divide-y divide-[var(--border)] p-0">
          {isLoading ? (
            <LoadingBlock />
          ) : isError ? (
            <ErrorBlock message="Failed to load alerts." onRetry={() => void refetch()} />
          ) : !data?.items.length ? (
            <EmptyBlock title="No alerts" description="You're all caught up." />
          ) : (
            data.items.map((alert) => <AlertRow key={alert._id} alert={alert} />)
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function AlertRow({ alert }: { alert: Alert }) {
  const qc = useQueryClient()
  const mark = useMutation({
    mutationFn: () => alertsApi.markRead(alert._id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['alerts'] }),
  })

  return (
    <div className={`flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between ${!alert.isRead ? 'bg-[var(--primary)]/5' : ''}`}>
      <div>
        <p className="font-medium">{alert.title ?? alert.type}</p>
        <p className="text-sm text-[var(--muted)]">{alert.message}</p>
        <p className="text-xs text-[var(--muted)]">
          {vehicleLine(alert)} · {formatDate(alert.createdAt)}
        </p>
      </div>
      {!alert.isRead ? (
        <Button size="sm" variant="secondary" onClick={() => mark.mutate()}>
          Mark read
        </Button>
      ) : null}
    </div>
  )
}