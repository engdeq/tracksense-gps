import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { devicesApi } from '@/api/endpoints'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorBlock, LoadingBlock, PageHeader, StatusBadge } from '@/components/shared/page-states'
import { formatDate } from '@/lib/utils'

export function DeviceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['device', id],
    queryFn: () => devicesApi.get(id!),
    enabled: Boolean(id),
  })

  if (isLoading) return <LoadingBlock />
  if (isError || !data) return <ErrorBlock message="Device not found." onRetry={() => void refetch()} />

  return (
    <div className="space-y-6">
      <PageHeader title={data.name ?? data.imei} description={`IMEI ${data.imei}`} actions={
        <Button asChild><Link to={`/devices/${id}/edit`}>Edit</Link></Button>
      } />
      <Card>
        <CardHeader>
          <CardTitle>Device info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <StatusBadge status={data.connectionStatus} />
          <p>Last communication: {formatDate(data.lastCommunicationAt)}</p>
          <p>SIM: {data.simNumber || '—'}</p>
          <p>Firmware: {data.firmwareVersion || '—'}</p>
          <p className="text-[var(--muted)]">GPS samples may be imported or streamed — check position source on live map.</p>
        </CardContent>
      </Card>
    </div>
  )
}