import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { lookupApi, vehicleTypesAdminApi, type SystemConfigRow } from '@/api/endpoints'
import { DataTable } from '@/components/shared/DataTable'
import { FormDialog } from '@/components/shared/FormDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { formatDate } from '@/lib/utils'

type VehicleTypeAdmin = SystemConfigRow & {
  iconKey?: string
  defaultIconId?: { _id: string; name?: string; imageUrl?: string } | string | null
  totalVehicles?: number
}

const emptyForm = {
  name: '',
  code: '',
  description: '',
  iconKey: 'car',
  defaultIconId: '',
  isActive: true,
}

function iconLabel(row: VehicleTypeAdmin) {
  if (row.iconKey) return row.iconKey
  const d = row.defaultIconId
  if (d && typeof d === 'object') return d.name || d._id
  return '—'
}

export function VehicleTypesPage() {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [open, setOpen] = useState(false)
  const [viewing, setViewing] = useState<VehicleTypeAdmin | null>(null)
  const [editing, setEditing] = useState<VehicleTypeAdmin | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [deleting, setDeleting] = useState<VehicleTypeAdmin | null>(null)

  const iconOptions = useQuery({ queryKey: ['vehicle-icons-lookup'], queryFn: lookupApi.vehicleIcons })

  const list = useQuery({
    queryKey: ['admin-vehicle-types', q, page, limit],
    queryFn: () => vehicleTypesAdminApi.list({ q, page, limit }),
  })

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        ...form,
        defaultIconId: form.defaultIconId || null,
      }
      if (editing?._id) return vehicleTypesAdminApi.update(editing._id, body)
      return vehicleTypesAdminApi.create(body)
    },
    onSuccess: async () => {
      toast.success(editing ? 'Vehicle type updated' : 'Vehicle type created')
      setOpen(false)
      setEditing(null)
      setForm(emptyForm)
      await qc.invalidateQueries({ queryKey: ['admin-vehicle-types'] })
      await qc.invalidateQueries({ queryKey: ['vehicle-types'] })
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null
      toast.error(msg ?? 'Could not save vehicle type')
    },
  })

  const remove = useMutation({
    mutationFn: async () => vehicleTypesAdminApi.remove(deleting!._id),
    onSuccess: async () => {
      toast.success('Vehicle type deleted')
      setDeleting(null)
      await qc.invalidateQueries({ queryKey: ['admin-vehicle-types'] })
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null
      toast.error(msg ?? 'Could not delete vehicle type')
    },
  })

  const columns = useMemo(
    () => [
      { key: '#', header: '#', cell: (r: VehicleTypeAdmin) => r.rowNumber ?? '—' },
      { key: 'icon', header: 'Icon', cell: (r: VehicleTypeAdmin) => iconLabel(r) },
      {
        key: 'name',
        header: 'Type Name',
        cell: (r: VehicleTypeAdmin) => <span className="font-medium">{r.name}</span>,
      },
      { key: 'desc', header: 'Description', cell: (r: VehicleTypeAdmin) => r.description || '—' },
      { key: 'vehicles', header: 'Total Vehicles', cell: (r: VehicleTypeAdmin) => r.totalVehicles ?? 0 },
      {
        key: 'status',
        header: 'Status',
        cell: (r: VehicleTypeAdmin) => (
          <Badge variant={r.isActive === false ? 'danger' : 'success'}>
            {r.isActive === false ? 'Inactive' : 'Active'}
          </Badge>
        ),
      },
      { key: 'created', header: 'Created', cell: (r: VehicleTypeAdmin) => formatDate(r.createdAt) },
    ],
    [],
  )

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setOpen(true)
  }

  function openEdit(row: VehicleTypeAdmin) {
    setEditing(row)
    const defaultIconId =
      row.defaultIconId && typeof row.defaultIconId === 'object'
        ? row.defaultIconId._id
        : String(row.defaultIconId ?? '')
    setForm({
      name: row.name ?? '',
      code: row.code ?? '',
      description: row.description ?? '',
      iconKey: row.iconKey ?? 'car',
      defaultIconId,
      isActive: row.isActive !== false,
    })
    setOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehicle Types"
        description="Taxonomy for fleet vehicles (van, truck, motorcycle, etc.)."
        breadcrumbs={[{ label: 'System Configuration' }, { label: 'Vehicle Types' }]}
      />

      <DataTable
        columns={columns}
        rows={(list.data?.items ?? []) as VehicleTypeAdmin[]}
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
        addLabel="Add Vehicle Type"
        page={page}
        limit={limit}
        total={list.data?.total ?? 0}
        onPageChange={setPage}
        onLimitChange={(n) => {
          setPage(1)
          setLimit(n)
        }}
        actions={[
          { label: 'View', onClick: (r) => setViewing(r) },
          { label: 'Edit', onClick: openEdit },
          { label: 'Delete', onClick: (r) => setDeleting(r), destructive: true },
        ]}
        emptyTitle="No vehicle types yet"
        emptyDescription="Create types to classify fleet vehicles."
      />

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? 'Edit Vehicle Type' : 'Add Vehicle Type'}
        description="Codes are generated from the name if omitted."
        loading={save.isPending}
        onSubmit={() => save.mutate()}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Type Name</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Code</Label>
            <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Icon key</Label>
            <Input value={form.iconKey} onChange={(e) => setForm((f) => ({ ...f, iconKey: e.target.value }))} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Description</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Default icon</Label>
            <Select
              value={form.defaultIconId || 'none'}
              onValueChange={(v) => setForm((f) => ({ ...f, defaultIconId: v === 'none' ? '' : v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {(iconOptions.data as { _id: string; name: string }[] | undefined)?.map((icon) => (
                  <SelectItem key={icon._id} value={icon._id}>
                    {icon.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2 sm:col-span-2">
            <Label>Active</Label>
            <Switch checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
          </div>
        </div>
      </FormDialog>

      <FormDialog
        open={Boolean(viewing)}
        onOpenChange={(o) => !o && setViewing(null)}
        title="Vehicle type details"
        submitLabel="Close"
        onSubmit={() => setViewing(null)}
      >
        {viewing ? (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[var(--muted)]">Name</dt>
              <dd className="font-medium">{viewing.name}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Code</dt>
              <dd>{viewing.code ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Icon</dt>
              <dd>{iconLabel(viewing)}</dd>
            </div>
            <div>
              <dt className="text-[var(--muted)]">Vehicles</dt>
              <dd>{viewing.totalVehicles ?? 0}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-[var(--muted)]">Description</dt>
              <dd>{viewing.description || '—'}</dd>
            </div>
          </dl>
        ) : null}
      </FormDialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete vehicle type?"
        description={deleting ? `Delete ${deleting.name}? Unassign vehicles first.` : undefined}
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </div>
  )
}