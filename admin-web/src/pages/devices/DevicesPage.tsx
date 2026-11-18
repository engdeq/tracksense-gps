import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { devicesApi } from '@/api/endpoints'
import { DataTable, type DataTableColumn } from '@/components/shared/DataTable'
import { PageHeader, StatusBadge } from '@/components/shared/page-states'
import { formatDate } from '@/lib/utils'
import type { Device } from '@/types/api'

function modelName(d: Device) {
  const m = d.modelId
  if (!m) return '—'
  return typeof m === 'object' ? m.name : m
}

function protocolName(d: Device) {
  const p = d.protocolId
  if (!p) return '—'
  return typeof p === 'object' ? p.name : p
}

function vehicleName(d: Device) {
  const v = d.vehicleId
  if (!v || typeof v !== 'object') return '—'
  return v.name || v.plateNumber || '—'
}

function customerName(d: Device) {
  const c = d.customerId
  if (!c) return '—'
  return typeof c === 'object' ? c.companyName || c.contactName : c
}

export function DevicesPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['devices', page, limit, search],
    queryFn: () => devicesApi.list({ limit, page, ...(search ? { q: search } : {}) }),
  })

  const rows = data?.items ?? []

  const columns = useMemo<DataTableColumn<Device>[]>(
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
        key: 'name',
        header: 'Device Name',
        cell: (row) => (
          <Link to={`/devices/${row._id}`} className="font-medium hover:text-[var(--primary)]">
            {row.name || 'Unnamed device'}
          </Link>
        ),
      },
      {
        key: 'imei',
        header: 'IMEI',
        cell: (row) => <span className="font-mono text-xs">{row.imei}</span>,
      },
      {
        key: 'model',
        header: 'Model',
        cell: (row) => modelName(row),
      },
      {
        key: 'protocol',
        header: 'Protocol',
        cell: (row) => protocolName(row),
      },
      {
        key: 'vehicle',
        header: 'Assigned Vehicle',
        cell: (row) => vehicleName(row),
      },
      {
        key: 'customer',
        header: 'Customer',
        cell: (row) => customerName(row),
      },
      {
        key: 'connection',
        header: 'Connection',
        cell: (row) => <StatusBadge status={row.connectionStatus} />,
      },
      {
        key: 'last',
        header: 'Last Communication',
        cell: (row) => <span className="text-[var(--muted)]">{formatDate(row.lastCommunicationAt)}</span>,
      },
      {
        key: 'sim',
        header: 'SIM',
        cell: (row) => row.simNumber || '—',
      },
    ],
    [limit, page, rows],
  )

  return (
    <div>
      <PageHeader
        title="GPS Devices"
        description="IMEI registry, connectivity status, and vehicle assignments."
        breadcrumbs={[
          { label: 'Management', href: '/devices' },
          { label: 'GPS Devices' },
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
        onAdd={() => navigate('/devices/new')}
        addLabel="Register Device"
        page={page}
        limit={limit}
        total={data?.total ?? 0}
        onPageChange={setPage}
        onLimitChange={(n) => {
          setLimit(n)
          setPage(1)
        }}
        emptyTitle="No GPS devices yet"
        emptyDescription="Register a Teltonika or compatible device to begin live tracking."
        actions={[
          { label: 'View', onClick: (row) => navigate(`/devices/${row._id}`) },
          { label: 'Edit', onClick: (row) => navigate(`/devices/${row._id}/edit`) },
        ]}
      />
    </div>
  )
}
