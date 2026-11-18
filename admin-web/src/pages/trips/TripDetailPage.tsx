import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { tripsApi } from '@/api/endpoints'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorBlock, LoadingBlock, PageHeader } from '@/components/shared/page-states'
import { formatDate, formatNumber } from '@/lib/utils'

export function TripDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['trip', id],
    queryFn: () => tripsApi.get(id!),
    enabled: Boolean(id),
  })

  if (!id) return <ErrorBlock message="Invalid trip id." />
  if (isLoading) return <LoadingBlock />
  if (isError) return <ErrorBlock message="Trip not found." onRetry={() => void refetch()} />

  const vehicle = data?.vehicleId
  const vehicleName = typeof vehicle === 'object' && vehicle ? `${vehicle.name} · ${vehicle.plateNumber}` : 'Vehicle'

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/trips">
          <ArrowLeft className="h-4 w-4" />
          Back to trips
        </Link>
      </Button>
      <PageHeader title={vehicleName} description={`Trip ${formatDate(data?.startTime)}`} />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Distance', value: `${formatNumber(data?.distanceKm, 1)} km` },
          { label: 'Avg speed', value: `${formatNumber(data?.avgSpeedKmh, 0)} km/h` },
          { label: 'Max speed', value: `${formatNumber(data?.maxSpeedKmh, 0)} km/h` },
          { label: 'Status', value: data?.status ?? '—' },
        ].map((k) => (
          <Card key={k.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-[var(--muted)]">{k.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-display text-2xl font-bold">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Route summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <span className="text-[var(--muted)]">From:</span> {data?.startAddress ?? '—'}
          </p>
          <p>
            <span className="text-[var(--muted)]">To:</span> {data?.endAddress ?? '—'}
          </p>
          <p>
            <span className="text-[var(--muted)]">Ended:</span> {data?.endTime ? formatDate(data.endTime) : 'Ongoing'}
          </p>
          {Array.isArray((data as { route?: unknown[] })?.route) ? (
            <p className="text-[var(--muted)]">
              {(data as { route: unknown[] }).route.length} GPS points loaded for playback (seed/import).
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}