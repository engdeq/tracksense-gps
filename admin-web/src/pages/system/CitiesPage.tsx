import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { citiesAdminApi, countriesAdminApi, type CityAdmin } from '@/api/endpoints'
import { DataTable } from '@/components/shared/DataTable'
import { FormDialog } from '@/components/shared/FormDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

const emptyForm = {
  name: '',
  countryId: '',
  cityCode: '',
  region: '',
  timezone: '',
  description: '',
  isActive: true,
}

function countryName(row: CityAdmin) {
  const c = row.countryId
  if (!c) return '—'
  return typeof c === 'object' ? c.name : c
}

export function CitiesPage() {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [countryFilter, setCountryFilter] = useState('all')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<CityAdmin | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [deleting, setDeleting] = useState<CityAdmin | null>(null)

  const countries = useQuery({
    queryKey: ['admin-countries-options'],
    queryFn: () => countriesAdminApi.list({ page: 1, limit: 100 }),
  })

  const list = useQuery({
    queryKey: ['admin-cities', q, page, limit, countryFilter],
    queryFn: () => {
      const params: Record<string, string | number> = { page, limit }
      if (q.trim()) params.q = q.trim()
      if (countryFilter !== 'all') params.countryId = countryFilter
      return citiesAdminApi.list(params)
    },
  })

  const save = useMutation({
    mutationFn: async () => {
      if (editing?._id) return citiesAdminApi.update(editing._id, form)
      return citiesAdminApi.create(form)
    },
    onSuccess: async () => {
      toast.success(editing ? 'City updated' : 'City created')
      setOpen(false)
      setEditing(null)
      setForm(emptyForm)
      await qc.invalidateQueries({ queryKey: ['admin-cities'] })
      await qc.invalidateQueries({ queryKey: ['cities'] })
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null
      toast.error(msg ?? 'Could not save city')
    },
  })

  const remove = useMutation({
    mutationFn: async () => citiesAdminApi.remove(deleting!._id),
    onSuccess: async () => {
      toast.success('City deleted')
      setDeleting(null)
      await qc.invalidateQueries({ queryKey: ['admin-cities'] })
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null
      toast.error(msg ?? 'Could not delete city')
    },
  })

  const columns = useMemo(
    () => [
      { key: '#', header: '#', cell: (r: CityAdmin) => r.rowNumber ?? '—' },
      { key: 'name', header: 'City', cell: (r: CityAdmin) => <span className="font-medium">{r.name}</span> },
      { key: 'country', header: 'Country', cell: (r: CityAdmin) => countryName(r) },
      { key: 'code', header: 'Code', cell: (r: CityAdmin) => r.cityCode || '—' },
      { key: 'region', header: 'Region', cell: (r: CityAdmin) => r.region || '—' },
      { key: 'tz', header: 'Timezone', cell: (r: CityAdmin) => r.timezone || '—' },
      { key: 'customers', header: 'Customers', cell: (r: CityAdmin) => r.totalCustomers ?? 0 },
      {
        key: 'status',
        header: 'Status',
        cell: (r: CityAdmin) => (
          <Badge variant={r.isActive === false ? 'danger' : 'success'}>{r.isActive === false ? 'Inactive' : 'Active'}</Badge>
        ),
      },
    ],
    [],
  )

  const noCountries = !countries.isLoading && (countries.data?.items.length ?? 0) === 0

  function openCreate() {
    if (noCountries) {
      toast.message('Add a country before creating cities')
      return
    }
    setEditing(null)
    setForm({ ...emptyForm, countryId: countryFilter !== 'all' ? countryFilter : '' })
    setOpen(true)
  }

  function openEdit(row: CityAdmin) {
    const countryId = typeof row.countryId === 'object' ? row.countryId._id : String(row.countryId ?? '')
    setEditing(row)
    setForm({
      name: row.name,
      countryId,
      cityCode: row.cityCode || '',
      region: row.region || '',
      timezone: row.timezone || '',
      description: row.description || '',
      isActive: row.isActive !== false,
    })
    setOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cities"
        description="Cities link customers to regions and timezones."
        breadcrumbs={[{ label: 'System Configuration' }, { label: 'Cities' }]}
      />

      {noCountries ? (
        <p className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--card)] p-4 text-center text-sm text-[var(--muted)]">
          No countries defined yet.{' '}
          <Link to="/countries" className="font-medium text-[var(--primary)] hover:underline">
            Add countries
          </Link>{' '}
          first.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Select
          value={countryFilter}
          onValueChange={(v) => {
            setCountryFilter(v)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Filter by country" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All countries</SelectItem>
            {countries.data?.items.map((c) => (
              <SelectItem key={c._id} value={c._id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        rows={list.data?.items ?? []}
        loading={list.isLoading}
        error={list.isError}
        onRetry={() => void list.refetch()}
        search={q}
        onSearchChange={(v) => {
          setPage(1)
          setQ(v)
        }}
        onRefresh={() => void list.refetch()}
        onAdd={noCountries ? undefined : openCreate}
        addLabel="Add City"
        page={page}
        limit={limit}
        total={list.data?.total ?? 0}
        onPageChange={setPage}
        onLimitChange={(n) => {
          setPage(1)
          setLimit(n)
        }}
        actions={[
          { label: 'Edit', onClick: openEdit },
          { label: 'Delete', onClick: (r) => setDeleting(r), destructive: true },
        ]}
        emptyTitle="No cities yet"
        emptyDescription="Create cities after registering countries."
      />

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? 'Edit City' : 'Add City'}
        loading={save.isPending}
        onSubmit={() => save.mutate()}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Country</Label>
            <Select value={form.countryId} onValueChange={(v) => setForm((f) => ({ ...f, countryId: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {countries.data?.items.map((c) => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(
            [
              ['name', 'City name'],
              ['cityCode', 'City code'],
              ['region', 'Region'],
              ['timezone', 'Timezone'],
              ['description', 'Description'],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className={`space-y-1.5 ${key === 'description' ? 'sm:col-span-2' : ''}`}>
              <Label>{label}</Label>
              <Input value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
            </div>
          ))}
          <div className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2 sm:col-span-2">
            <Label>Active</Label>
            <Switch checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete city?"
        description={deleting ? `Delete ${deleting.name}? Reassign customers first.` : undefined}
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </div>
  )
}