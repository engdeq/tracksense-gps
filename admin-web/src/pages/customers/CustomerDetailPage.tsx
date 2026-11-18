import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { customersApi } from '@/api/endpoints'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorBlock, LoadingBlock, PageHeader, StatusBadge } from '@/components/shared/page-states'

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => customersApi.get(id!),
    enabled: Boolean(id),
  })

  if (isLoading) return <LoadingBlock />
  if (isError || !data) return <ErrorBlock message="Customer not found." onRetry={() => void refetch()} />

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.companyName}
        description={data.contactName}
        actions={
          <Button asChild>
            <Link to={`/customers/${id}/edit`}>Edit customer</Link>
          </Button>
        }
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Email: <strong>{data.email}</strong>
            </p>
            <p>Phone: {data.phone || '—'}</p>
            <p>Address: {data.address || '—'}</p>
            <StatusBadge status={data.status} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-[var(--muted)]">{data.notes || 'No notes.'}</CardContent>
        </Card>
      </div>
    </div>
  )
}