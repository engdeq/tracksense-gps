import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { customersApi } from '@/api/endpoints'
import { DataTable, type DataTableColumn } from '@/components/shared/DataTable'
import { PageHeader, StatusBadge } from '@/components/shared/page-states'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { formatDate } from '@/lib/utils'
import type { Customer } from '@/types/api'

function countryName(c: Customer) {
  const co = c.countryId
  if (!co) return '—'
  return typeof co === 'object' ? co.name : co
}

function cityName(c: Customer) {
  const city = c.cityId
  if (!city) return '—'
  return typeof city === 'object' ? city.name : city
}

export function CustomersPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['customers', page, limit, search],
    queryFn: () => customersApi.list({ limit, page, ...(search ? { q: search } : {}) }),
  })

  const rows = data?.items ?? []

  const columns = useMemo<DataTableColumn<Customer>[]>(
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
        key: 'profile',
        header: 'Profile',
        cell: (row) => {
          const initials = (row.contactName || row.companyName || 'C')
            .split(' ')
            .map((p) => p[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()
          return (
            <Avatar className="h-9 w-9">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
          )
        },
      },
      {
        key: 'name',
        header: 'Full Name',
        cell: (row) => (
          <div>
            <Link to={`/customers/${row._id}`} className="font-medium hover:text-[var(--primary)]">
              {row.contactName || row.companyName}
            </Link>
            <p className="text-xs text-[var(--muted)]">{row.companyName}</p>
          </div>
        ),
      },
      {
        key: 'phone',
        header: 'Phone',
        cell: (row) => row.phone || '—',
      },
      {
        key: 'email',
        header: 'Email',
        cell: (row) => <span className="text-[var(--muted)]">{row.email}</span>,
      },
      {
        key: 'country',
        header: 'Country',
        cell: (row) => countryName(row),
      },
      {
        key: 'city',
        header: 'City',
        cell: (row) => cityName(row),
      },
      {
        key: 'status',
        header: 'Status',
        cell: (row) => <StatusBadge status={row.status} />,
      },
      {
        key: 'created',
        header: 'Created Date',
        cell: (row) => <span className="text-[var(--muted)]">{formatDate(row.createdAt)}</span>,
      },
    ],
    [limit, page, rows],
  )

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Manage fleet owners and enterprise accounts across TrackSense."
        breadcrumbs={[
          { label: 'Management', href: '/customers' },
          { label: 'Customers' },
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
        onAdd={() => navigate('/customers/new')}
        addLabel="Add Customer"
        page={page}
        limit={limit}
        total={data?.total ?? 0}
        onPageChange={setPage}
        onLimitChange={(n) => {
          setLimit(n)
          setPage(1)
        }}
        emptyTitle="No customers yet"
        emptyDescription="Create your first customer to assign vehicles and GPS devices."
        actions={[
          { label: 'View', onClick: (row) => navigate(`/customers/${row._id}`) },
          { label: 'Edit', onClick: (row) => navigate(`/customers/${row._id}/edit`) },
        ]}
      />
    </div>
  )
}
