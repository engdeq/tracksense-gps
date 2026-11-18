import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Car } from 'lucide-react'
import { vehiclesApi } from '@/api/endpoints'
import { DataTable, type DataTableColumn } from '@/components/shared/DataTable'
import { MotionBadge, PageHeader, StatusBadge } from '@/components/shared/page-states'
import { useUiStore } from '@/stores/uiStore'
import { formatDate } from '@/lib/utils'
import type { Vehicle } from '@/types/api'

function customerName(v: Vehicle) {
  const c = v.customerId
  if (!c) return '—'
  return typeof c === 'object' ? c.companyName || c.contactName : c
}

function typeName(v: Vehicle) {
  const t = v.vehicleTypeId
  if (!t) return '—'
  return typeof t === 'object' ? t.name : t
}

function deviceLabel(v: Vehicle) {
  const d = v.deviceId
  if (!d || typeof d !== 'object') return '—'
  return d.imei || d.name || '—'
}

export function VehiclesPage() {
  const navigate = useNavigate()
  const globalSearch = useUiStore((s) => s.globalSearch)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const q = search || globalSearch

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['vehicles', page, limit, q],
    queryFn: () => vehiclesApi.list({ limit, page, ...(q ? { q } : {}) }),
  })

  const rows = data?.items ?? []

  const columns = useMemo<DataTableColumn<Vehicle>[]>(
    () => [
      {
        key: '#',
        header: '#',
        className: 'w-12',
        cell: (row) => {
          const idx = rows.findIndex((r) => r._id === row._id)
          return <span className="text-[var(--muted)]">{(page - 1) * limit + idx + 1}</span>
        },
      },
      {
        key: 'icon',
        header: 'Icon',
        cell: () => (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
            <Car className="h-4 w-4" />
          </div>
        ),
      },
      {
        key: 'name',
        header: 'Vehicle Name',
        cell: (row) => (
          <Link to={`/vehicles/${row._id}`} className="font-medium hover:text-[var(--primary)]">
            {row.name}
          </Link>
        ),
      },
      {
        key: 'plate',
        header: 'Plate Number',
        cell: (row) => <span className="font-mono text-xs">{row.plateNumber}</span>,
      },
      {
        key: 'customer',
        header: 'Customer',
        cell: (row) => customerName(row),
      },
      {
        key: 'type',
        header: 'Vehicle Type',
        cell: (row) => typeName(row),
      },
      {
        key: 'device',
        header: 'GPS Device',
        cell: (row) => <span className="font-mono text-xs text-[var(--muted)]">{deviceLabel(row)}</span>,
      },
      {
        key: 'motion',
        header: 'Motion',
        cell: (row) => <MotionBadge status={row.motionStatus} />,
      },
      {
        key: 'status',
        header: 'Status',
        cell: (row) => <StatusBadge status={row.status} />,
      },
      {
        key: 'updated',
        header: 'Last Update',
        cell: (row) => <span className="text-[var(--muted)]">{formatDate(row.updatedAt)}</span>,
      },
    ],
    [limit, page, rows],
  )

  return (
    <div>
      <PageHeader
        title="Vehicles"
        description="Fleet units with live motion status and GPS assignments."
        breadcrumbs={[
          { label: 'Management', href: '/vehicles' },
          { label: 'Vehicles' },
        ]}
      />
      <DataTable
        columns={columns}
        rows={rows}
        loading={isLoading}
        error={isError}
        onRetry={() => void refetch()}
        search={search}
        onSearchChange={(v) => {
          setSearch(v)
          setPage(1)
        }}
        onRefresh={() => void refetch()}
        onAdd={() => navigate('/vehicles/new')}
        addLabel="Add Vehicle"
        page={page}
        limit={limit}
        total={data?.total ?? 0}
        onPageChange={setPage}
        onLimitChange={(n) => {
          setLimit(n)
          setPage(1)
        }}
        emptyTitle="No vehicles yet"
        emptyDescription="Register a vehicle and assign a GPS device to start tracking."
        actions={[
          { label: 'View', onClick: (row) => navigate(`/vehicles/${row._id}`) },
          { label: 'Edit', onClick: (row) => navigate(`/vehicles/${row._id}/edit`) },
        ]}
      />
    </div>
  )
}
