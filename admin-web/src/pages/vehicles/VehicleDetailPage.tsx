import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { vehiclesApi } from '@/api/endpoints'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorBlock, LoadingBlock, MotionBadge, PageHeader, StatusBadge } from '@/components/shared/page-states'
import type { Vehicle } from '@/types/api'

export function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['vehicle', id],
    queryFn: () => vehiclesApi.get(id!),
    enabled: Boolean(id),
  })

  if (isLoading) return <LoadingBlock />
  if (isError || !data?.vehicle) return <ErrorBlock message="Vehicle not found." onRetry={() => void refetch()} />

  const vehicle = data.vehicle

  return (
    <div className="space-y-6">
      <PageHeader
        title={vehicle.name}
        description={vehicle.plateNumber}
        actions={
          <>
            <MotionBadge status={vehicle.motionStatus} />
            <Button asChild>
              <Link to={`/vehicles/${id}/edit`}>Edit</Link>
            </Button>
          </>
        }
      />
      <VehicleDetailGrid data={vehicle} />
      {data.lastPosition ? (
        <Card>
          <CardHeader>
            <CardTitle>Last GPS sample</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-[var(--muted)]">
            Latest recorded position available from API history (check `source` field for device vs import).
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}

function VehicleDetailGrid({ data }: { data: Vehicle }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Specifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            Brand / model: {data.brand || '—'} {data.model}
          </p>
          <p>Year: {data.year ?? '—'}</p>
          <p>VIN: {data.vin || '—'}</p>
          <p>Speed limit: {data.speedLimitKmh ?? 120} km/h</p>
          <StatusBadge status={data.status} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Assignment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            Customer:{' '}
            {typeof data.customerId === 'object' && data.customerId
              ? 'companyName' in data.customerId
                ? data.customerId.companyName
                : '—'
              : '—'}
          </p>
          <p>
            Device IMEI:{' '}
            {typeof data.deviceId === 'object' && data.deviceId ? data.deviceId.imei : 'Unassigned'}
          </p>
          <p className="text-[var(--muted)]">{data.notes || 'No notes.'}</p>
        </CardContent>
      </Card>
    </div>
  )
}
