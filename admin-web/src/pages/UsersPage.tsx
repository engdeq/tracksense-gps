import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '@/api/endpoints'
import { DataTable, type DataTableColumn } from '@/components/shared/DataTable'
import { FormDialog } from '@/components/shared/FormDialog'
import { PageHeader, StatusBadge } from '@/components/shared/page-states'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatDate } from '@/lib/utils'

type UserRow = {
  _id: string
  username: string
  email: string
  fullName?: string
  phone?: string
  role?: string | { key?: string; name?: string }
  status?: string
  createdAt?: string
}

export function UsersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    fullName: '',
    phone: '',
    roleKey: 'operator',
  })

  const users = useQuery({ queryKey: ['users'], queryFn: () => usersApi.list() })

  const create = useMutation({
    mutationFn: () => usersApi.create(form),
    onSuccess: async () => {
      setOpen(false)
      setForm({ username: '', email: '', password: '', fullName: '', phone: '', roleKey: 'operator' })
      await qc.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const rows = useMemo(() => {
    const items = (users.data as UserRow[] | undefined) ?? []
    if (!search.trim()) return items
    const t = search.toLowerCase()
    return items.filter(
      (u) =>
        u.username?.toLowerCase().includes(t) ||
        u.email?.toLowerCase().includes(t) ||
        u.fullName?.toLowerCase().includes(t),
    )
  }, [search, users.data])

  const columns = useMemo<DataTableColumn<UserRow>[]>(
    () => [
      {
        key: '#',
        header: '#',
        className: 'w-12',
        cell: (row) => rows.findIndex((r) => r._id === row._id) + 1,
      },
      {
        key: 'name',
        header: 'Full Name',
        cell: (row) => <span className="font-medium">{row.fullName || row.username}</span>,
      },
      { key: 'username', header: 'Username', cell: (row) => row.username },
      { key: 'email', header: 'Email', cell: (row) => <span className="text-[var(--muted)]">{row.email}</span> },
      { key: 'phone', header: 'Phone', cell: (row) => row.phone || '—' },
      {
        key: 'role',
        header: 'Role',
        cell: (row) => {
          const role =
            typeof row.role === 'object' ? row.role?.name || row.role?.key : row.role
          return <Badge>{String(role || '—').replace('_', ' ')}</Badge>
        },
      },
      {
        key: 'status',
        header: 'Status',
        cell: (row) => <StatusBadge status={row.status || 'active'} />,
      },
      {
        key: 'created',
        header: 'Created',
        cell: (row) => <span className="text-[var(--muted)]">{formatDate(row.createdAt)}</span>,
      },
    ],
    [rows],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users & Access"
        description="Manage portal accounts, roles, and access."
        breadcrumbs={[{ label: 'Administration' }, { label: 'Users' }]}
      />

      <DataTable
        columns={columns}
        rows={rows}
        loading={users.isLoading}
        error={users.isError}
        onRetry={() => void users.refetch()}
        search={search}
        onSearchChange={setSearch}
        onRefresh={() => void users.refetch()}
        onAdd={() => setOpen(true)}
        addLabel="Add User"
        emptyTitle="No users"
        emptyDescription="Create admin and operator accounts for the portal."
      />

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="Add user"
        description="Create a portal account with an initial password."
        loading={create.isPending}
        submitLabel="Create user"
        onSubmit={async () => {
          await create.mutateAsync()
        }}
        size="lg"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ['fullName', 'Full name'],
              ['username', 'Username'],
              ['email', 'Email'],
              ['phone', 'Phone'],
              ['password', 'Password'],
              ['roleKey', 'Role key'],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-1.5">
              <Label>{label}</Label>
              <Input
                type={key === 'password' ? 'password' : key === 'email' ? 'email' : 'text'}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
      </FormDialog>
    </div>
  )
}
