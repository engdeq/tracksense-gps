import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { deviceModelsAdminApi, lookupApi, type SystemConfigRow } from '@/api/endpoints'
import { DataTable } from '@/components/shared/DataTable'
import { FormDialog } from '@/components/shared/FormDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

type DeviceModelAdmin = SystemConfigRow & {
  manufacturer?: string
  protocolId?: { _id: string; name?: string; key?: string } | string | null
  protocolKey?: string
  totalDevices?: number
}

const emptyForm = {
  manufacturer: '',
  name: '',
  code: '',
  protocolId: '',
  description: '',
  isActive: true,
}

function protocolName(row: DeviceModelAdmin) {
  const p = row.protocolId
  if (p && typeof p === 'object') return p.name || p.key || '—'
  return row.protocolKey || '—'
}

export function DeviceModelsPage() {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<DeviceModelAdmin | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [deleting, setDeleting] = useState<DeviceModelAdmin | null>(null)

  const protocols = useQuery({ queryKey: ['device-protocols-lookup'], queryFn: lookupApi.deviceProtocols })

  const list = useQuery({
    queryKey: ['admin-device-models', q, page, limit],
    queryFn: () => deviceModelsAdminApi.list({ q, page, limit }),
  })

  const save = useMutation({
    mutationFn: async () => {
      const body = { ...form, protocolId: form.protocolId || null }
      if (editing?._id) return deviceModelsAdminApi.update(editing._id, body)
      return deviceModelsAdminApi.create(body)
    },
    onSuccess: async () => {
      toast.success(editing ? 'Device model updated' : 'Device model created')
      setOpen(false)
      setEditing(null)
      setForm(emptyForm)
      await qc.invalidateQueries({ queryKey: ['admin-device-models'] })
      await qc.invalidateQueries({ queryKey: ['device-models'] })
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null
      toast.error(msg ?? 'Could not save device model')
    },
  })

  const remove = useMutation({
    mutationFn: async () => deviceModelsAdminApi.remove(deleting!._id),
    onSuccess: async () => {
      toast.success('Device model deleted')
      setDeleting(null)
      await qc.invalidateQueries({ queryKey: ['admin-device-models'] })
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null
      toast.error(msg ?? 'Could not delete device model')
    },
  })

  const columns = useMemo(
    () => [
      { key: '#', header: '#', cell: (r: DeviceModelAdmin) => r.rowNumber ?? '—' },
      { key: 'mfr', header: 'Manufacturer', cell: (r: DeviceModelAdmin) => r.manufacturer ?? '—' },
      { key: 'name', header: 'Model Name', cell: (r: DeviceModelAdmin) => <span className="font-medium">{r.name}</span> },
      { key: 'code', header: 'Model Code', cell: (r: DeviceModelAdmin) => r.code ?? '—' },
      { key: 'protocol', header: 'Supported Protocol', cell: (r: DeviceModelAdmin) => protocolName(r) },
      { key: 'desc', header: 'Description', cell: (r: DeviceModelAdmin) => r.description || '—' },
      { key: 'devices', header: 'Total Devices', cell: (r: DeviceModelAdmin) => r.totalDevices ?? 0 },
      {
        key: 'status',
        header: 'Status',
        cell: (r: DeviceModelAdmin) => (
          <Badge variant={r.isActive === false ? 'danger' : 'success'}>
            {r.isActive === false ? 'Inactive' : 'Active'}
          </Badge>
        ),
      },
    ],
    [],
  )

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setOpen(true)
  }

  function openEdit(row: DeviceModelAdmin) {
    setEditing(row)
    const protocolId =
      row.protocolId && typeof row.protocolId === 'object' ? row.protocolId._id : String(row.protocolId ?? '')
    setForm({
      manufacturer: row.manufacturer ?? '',
      name: row.name ?? '',
      code: row.code ?? '',
      protocolId,
      description: row.description ?? '',
      isActive: row.isActive !== false,
    })
    setOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Device Models"
        description="Hardware models supported for GPS device registration."
        breadcrumbs={[{ label: 'System Configuration' }, { label: 'Device Models' }]}
      />

      <DataTable
        columns={columns}
        rows={(list.data?.items ?? []) as DeviceModelAdmin[]}
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
        addLabel="Add Device Model"
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
        emptyTitle="No device models"
        emptyDescription="Register GPS hardware models and link them to protocols."
      />

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? 'Edit Device Model' : 'Add Device Model'}
        loading={save.isPending}
        onSubmit={() => save.mutate()}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Manufacturer</Label>
            <Input
              value={form.manufacturer}
              onChange={(e) => setForm((f) => ({ ...f, manufacturer: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Model name</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Model code</Label>
            <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Supported protocol</Label>
            <Select value={form.protocolId} onValueChange={(v) => setForm((f) => ({ ...f, protocolId: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select protocol" />
              </SelectTrigger>
              <SelectContent>
                {(protocols.data as { _id: string; name: string }[] | undefined)?.map((p) => (
                  <SelectItem key={p._id} value={p._id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Description</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2 sm:col-span-2">
            <Label>Active</Label>
            <Switch checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete device model?"
        description={deleting ? `Delete ${deleting.name}? Remove device assignments first.` : undefined}
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </div>
  )
}