import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { countriesAdminApi, type CountryAdmin } from '@/api/endpoints'
import { DataTable } from '@/components/shared/DataTable'
import { FormDialog } from '@/components/shared/FormDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { formatDate } from '@/lib/utils'

const emptyForm = {
  name: '',
  code: '',
  isoAlpha2: '',
  isoAlpha3: '',
  phoneCode: '',
  currencyName: '',
  currencyCode: '',
  currencySymbol: '',
  flagUrl: '',
  isActive: true,
}

export function CountriesPage() {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<CountryAdmin | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [deleting, setDeleting] = useState<CountryAdmin | null>(null)

  const list = useQuery({
    queryKey: ['admin-countries', q, page, limit],
    queryFn: () => countriesAdminApi.list({ q, page, limit }),
  })

  const save = useMutation({
    mutationFn: async () => {
      if (editing?._id) return countriesAdminApi.update(editing._id, form)
      return countriesAdminApi.create(form)
    },
    onSuccess: async () => {
      toast.success(editing ? 'Country updated' : 'Country created')
      setOpen(false)
      setEditing(null)
      setForm(emptyForm)
      await qc.invalidateQueries({ queryKey: ['admin-countries'] })
      await qc.invalidateQueries({ queryKey: ['countries'] })
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null
      toast.error(msg ?? 'Could not save country')
    },
  })

  const remove = useMutation({
    mutationFn: async () => countriesAdminApi.remove(deleting!._id),
    onSuccess: async () => {
      toast.success('Country deleted')
      setDeleting(null)
      await qc.invalidateQueries({ queryKey: ['admin-countries'] })
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null
      toast.error(msg ?? 'Could not delete country')
    },
  })

  const columns = useMemo(
    () => [
      { key: '#', header: '#', cell: (r: CountryAdmin) => r.rowNumber ?? '—' },
      {
        key: 'flag',
        header: 'Flag',
        cell: (r: CountryAdmin) =>
          r.flagUrl ? <img src={r.flagUrl} alt="" className="h-5 w-8 rounded object-cover" /> : '—',
      },
      { key: 'name', header: 'Country Name', cell: (r: CountryAdmin) => <span className="font-medium">{r.name}</span> },
      { key: 'code', header: 'Code', cell: (r: CountryAdmin) => r.code },
      { key: 'a2', header: 'ISO Alpha-2', cell: (r: CountryAdmin) => r.isoAlpha2 },
      { key: 'a3', header: 'ISO Alpha-3', cell: (r: CountryAdmin) => r.isoAlpha3 },
      { key: 'phone', header: 'Phone', cell: (r: CountryAdmin) => r.phoneCode || '—' },
      {
        key: 'currency',
        header: 'Currency',
        cell: (r: CountryAdmin) => `${r.currencyCode || '—'} ${r.currencySymbol || ''}`.trim(),
      },
      { key: 'cities', header: 'Cities', cell: (r: CountryAdmin) => r.totalCities ?? 0 },
      {
        key: 'status',
        header: 'Status',
        cell: (r: CountryAdmin) => (
          <Badge variant={r.isActive === false ? 'danger' : 'success'}>{r.isActive === false ? 'Inactive' : 'Active'}</Badge>
        ),
      },
      { key: 'created', header: 'Created', cell: (r: CountryAdmin) => formatDate(r.createdAt) },
    ],
    [],
  )

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setOpen(true)
  }

  function openEdit(row: CountryAdmin) {
    setEditing(row)
    setForm({
      name: row.name,
      code: row.code,
      isoAlpha2: row.isoAlpha2 || row.code,
      isoAlpha3: row.isoAlpha3 || '',
      phoneCode: row.phoneCode || '',
      currencyName: row.currencyName || '',
      currencyCode: row.currencyCode || '',
      currencySymbol: row.currencySymbol || '',
      flagUrl: row.flagUrl || '',
      isActive: row.isActive !== false,
    })
    setOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Countries"
        description="Manage countries available throughout TrackSense."
        breadcrumbs={[
          { label: 'System Configuration' },
          { label: 'Countries' },
        ]}
      />

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
        onAdd={openCreate}
        addLabel="Add Country"
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
        emptyTitle="No countries yet"
        emptyDescription="Register countries so cities and customers can be linked correctly."
      />

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? 'Edit Country' : 'Add Country'}
        description="ISO codes must be unique."
        loading={save.isPending}
        onSubmit={() => save.mutate()}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ['name', 'Country Name'],
              ['code', 'Country Code'],
              ['isoAlpha2', 'ISO Alpha-2'],
              ['isoAlpha3', 'ISO Alpha-3'],
              ['phoneCode', 'Phone Code'],
              ['currencyName', 'Currency Name'],
              ['currencyCode', 'Currency Code'],
              ['currencySymbol', 'Currency Symbol'],
              ['flagUrl', 'Flag URL'],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-1.5">
              <Label>{label}</Label>
              <Input
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              />
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
        title="Delete country?"
        description={deleting ? `Delete ${deleting.name}? Cities must be removed first.` : undefined}
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </div>
  )
}
