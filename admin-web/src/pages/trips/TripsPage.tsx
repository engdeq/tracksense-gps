import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Eye } from 'lucide-react'
import { tripsApi } from '@/api/endpoints'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyBlock, ErrorBlock, LoadingBlock, PageHeader } from '@/components/shared/page-states'
import type { Trip } from '@/types/api'
import { formatDate, formatNumber } from '@/lib/utils'

function vehicleLabel(v: Trip['vehicleId']) {
  if (!v) return '—'
  if (typeof v === 'string') return v
  return `${v.name} (${v.plateNumber})`
}

export function TripsPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['trips'],
    queryFn: () => tripsApi.list({ limit: 50, page: 1 }),
  })

  return (
  <div>
    <PageHeader title="Trips & history" description="Completed and in-progress journeys across the fleet" />
    <Card>
      <CardContent className="p-0">
        {isLoading ? (
          <LoadingBlock />
        ) : isError ? (
          <ErrorBlock message="Could not load trips." onRetry={() => void refetch()} />
        ) : !data?.items.length ? (
          <EmptyBlock title="No trips" description="Trips appear when vehicles move between start/stop events." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-[var(--muted)]">
                  <th className="p-4 font-medium">Vehicle</th>
                  <th className="p-4 font-medium">Start</th>
                  <th className="p-4 font-medium">End</th>
                  <th className="p-4 font-medium">Distance</th>
                  <th className="p-4 font-medium">Max speed</th>
                  <th className="p-4 font-medium" />
                </tr>
              </thead>
              <tbody>
                {data.items.map((trip) => (
                  <tr key={trip._id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--background)]/80">
                    <td className="p-4 font-medium">{vehicleLabel(trip.vehicleId)}</td>
                    <td className="p-4">{formatDate(trip.startTime)}</td>
                    <td className="p-4">{trip.endTime ? formatDate(trip.endTime) : 'In progress'}</td>
                    <td className="p-4">{formatNumber(trip.distanceKm, 1)} km</td>
                    <td className="p-4">{formatNumber(trip.maxSpeedKmh, 0)} km/h</td>
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/trips/${trip._id}`}>
                          <Eye className="h-4 w-4" />
                          Details
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  </div>
  )
}