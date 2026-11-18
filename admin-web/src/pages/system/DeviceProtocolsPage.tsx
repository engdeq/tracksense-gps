import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { deviceProtocolsAdminApi, type SystemConfigRow } from '@/api/endpoints'
import { DataTable } from '@/components/shared/DataTable'
import { FormDialog } from '@/components/shared/FormDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

type DeviceProtocolAdmin = SystemConfigRow & {
  version?: string
  defaultPort?: number
  connectionType?: string
  decoderKey?: string
  supportedModels?: number
  parserImplemented?: boolean
}

const emptyForm = {
  name: '',
  key: '',
  version: '1.0',
  defaultPort: '5027',
  connectionType: 'tcp',
  description: '',
  decoderKey: '',
  isActive: true,
}

const CONNECTIONS = ['tcp', 'udp', 'http', 'mqtt'] as const

export function DeviceProtocolsPage() {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<DeviceProtocolAdmin | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [deleting, setDeleting] = useState<DeviceProtocolAdmin | null>(null)

  const list = useQuery({
    queryKey: ['admin-device-protocols', q, page, limit],
    queryFn: () => deviceProtocolsAdminApi.list({ q, page, limit }),
  })

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        name: form.name,
        key: form.key || undefined,
        version: form.version,
        defaultPort: Number(form.defaultPort) || 5027,
        connectionType: form.connectionType,
        description: form.description,
        decoderKey: form.decoderKey,
        isActive: form.isActive,
      }
      if (editing?._id) return deviceProtocolsAdminApi.update(editing._id, body)
      return deviceProtocolsAdminApi.create(body)
    },
    onSuccess: async () => {
      toast.success(editing ? 'Protocol updated' : 'Protocol created')
      setOpen(false)
      setEditing(null)
      setForm(emptyForm)
      await qc.invalidateQueries({ queryKey: ['admin-device-protocols'] })
      await qc.invalidateQueries({ queryKey: ['device-protocols'] })
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null
      toast.error(msg ?? 'Could not save protocol')
    },
  })

  const remove = useMutation({
    mutationFn: async () => deviceProtocolsAdminApi.remove(deleting!._id),
    onSuccess: async () => {
      toast.success('Protocol deleted')
      setDeleting(null)
      await qc.invalidateQueries({ queryKey: ['admin-device-protocols'] })
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null
      toast.error(msg ?? 'Could not delete protocol')
    },
  })

  const columns = useMemo(
    () => [
      { key: '#', header: '#', cell: (r: DeviceProtocolAdmin) => r.rowNumber ?? '—' },
      { key: 'name', header: 'Name', cell: (r: DeviceProtocolAdmin) => <span className="font-medium">{r.name}</span> },
      { key: 'key', header: 'Code / key', cell: (r: DeviceProtocolAdmin) => r.key ?? '—' },
      { key: 'ver', header: 'Version', cell: (r: DeviceProtocolAdmin) => r.version ?? '—' },
      { key: 'models', header: 'Supported Models', cell: (r: DeviceProtocolAdmin) => r.supportedModels ?? 0 },
      { key: 'port', header: 'Port', cell: (r: DeviceProtocolAdmin) => r.defaultPort ?? '—' },
      { key: 'conn', header: 'Connection Type', cell: (r: DeviceProtocolAdmin) => (r.connectionType ?? 'tcp').toUpperCase() },
      {
        key: 'status',
        header: 'Status',
        cell: (r: DeviceProtocolAdmin) => (
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={r.isActive === false ? 'danger' : 'success'}>
              {r.isActive === false ? 'Inactive' : 'Active'}
            </Badge>
            {r.parserImplemented === false ? (
              <Badge variant="outline" className="text-xs">
                Config only
              </Badge>
            ) : null}
          </div>
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

  function openEdit(row: DeviceProtocolAdmin) {
    setEditing(row)
    setForm({
      name: row.name ?? '',
      key: row.key ?? '',
      version: row.version ?? '1.0',
      defaultPort: String(row.defaultPort ?? 5027),
      connectionType: row.connectionType ?? 'tcp',
      description: row.description ?? '',
      decoderKey: row.decoderKey ?? '',
      isActive: row.isActive !== false,
    })
    setOpen(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Device Protocols"
        description="GPS ingestion protocols and decoder configuration."
        breadcrumbs={[{ label: 'System Configuration' }, { label: 'Device Protocols' }]}
      />

      <DataTable
        columns={columns}
        rows={(list.data?.items ?? []) as DeviceProtocolAdmin[]}
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
        addLabel="Add Protocol"
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
        emptyTitle="No protocols"
        emptyDescription="Register how GPS devices connect and which decoder handles their payloads."
      />

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? 'Edit Protocol' : 'Add Protocol'}
        description="Registering a protocol does not implement a GPS decoder unless parserImplemented is true (e.g. Teltonika)."
        loading={save.isPending}
        onSubmit={() => save.mutate()}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Name</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Key</Label>
            <Input value={form.key} onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Version</Label>
            <Input value={form.version} onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Default port</Label>
            <Input
              type="number"
              value={form.defaultPort}
              onChange={(e) => setForm((f) => ({ ...f, defaultPort: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Connection type</Label>
            <Select value={form.connectionType} onValueChange={(v) => setForm((f) => ({ ...f, connectionType: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONNECTIONS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c.toUpperCase()}
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
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Decoder key</Label>
            <Input
              value={form.decoderKey}
              onChange={(e) => setForm((f) => ({ ...f, decoderKey: e.target.value }))}
              placeholder="Defaults to protocol key"
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
        title="Delete protocol?"
        description={deleting ? `Delete ${deleting.name}? Unlink device models first.` : undefined}
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </div>
  )
}