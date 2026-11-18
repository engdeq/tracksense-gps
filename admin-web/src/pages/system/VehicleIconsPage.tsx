import { useEffect, useMemo, useRef, useState } from 'react'
import { LayoutGrid, Table as TableIcon } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { lookupApi, vehicleIconsAdminApi, type SystemConfigRow } from '@/api/endpoints'
import { DataTable } from '@/components/shared/DataTable'
import { FormDialog } from '@/components/shared/FormDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyBlock, LoadingBlock } from '@/components/shared/page-states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { resolveMediaUrl } from '@/lib/media'
import { cn } from '@/lib/utils'

type VehicleIconAdmin = SystemConfigRow & {
  imageUrl?: string
  category?: string
  vehicleTypeId?: { _id: string; name?: string } | string | null
}

const emptyForm = {
  name: '',
  key: '',
  category: 'general',
  imageUrl: '',
  vehicleTypeId: '',
  isActive: true,
}

const ALLOWED_TYPES = ['image/png', 'image/svg+xml', 'image/jpeg', 'image/webp']
const MAX_BYTES = 5 * 1024 * 1024
const MAX_LABEL = '5MB'

function IconPreview({ url, className }: { url?: string; className?: string }) {
  const src = resolveMediaUrl(url)
  if (!src) return <span className="text-[var(--muted)]">—</span>
  return (
    <img
      src={src}
      alt=""
      className={cn('rounded object-contain', className)}
      onError={(e) => {
        const img = e.currentTarget
        img.style.display = 'none'
        const fallback = img.nextElementSibling as HTMLElement | null
        if (fallback) fallback.hidden = false
      }}
    />
  )
}

function assignedType(row: VehicleIconAdmin) {
  const t = row.vehicleTypeId
  if (!t) return '—'
  return typeof t === 'object' ? t.name ?? '—' : t
}

export function VehicleIconsPage() {
  const qc = useQueryClient()
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<VehicleIconAdmin | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<VehicleIconAdmin | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const typeOptions = useQuery({ queryKey: ['vehicle-types-lookup'], queryFn: lookupApi.vehicleTypes })

  const list = useQuery({
    queryKey: ['admin-vehicle-icons', q, page, limit],
    queryFn: () => vehicleIconsAdminApi.list({ q, page, limit }),
  })

  const rows = (list.data?.items ?? []) as VehicleIconAdmin[]

  const save = useMutation({
    mutationFn: async () => {
      const base = {
        name: form.name,
        key: form.key || undefined,
        category: form.category,
        vehicleTypeId: form.vehicleTypeId || null,
        isActive: form.isActive,
      }
      if (file) {
        const fd = new FormData()
        Object.entries(base).forEach(([k, v]) => {
          if (v !== null && v !== undefined) fd.append(k, String(v))
        })
        if (!editing && form.imageUrl) fd.append('imageUrl', form.imageUrl)
        fd.append('file', file)
        if (editing?._id) return vehicleIconsAdminApi.update(editing._id, fd)
        return vehicleIconsAdminApi.create(fd)
      }
      const body = { ...base, imageUrl: form.imageUrl }
      if (editing?._id) return vehicleIconsAdminApi.update(editing._id, body)
      if (!body.imageUrl) throw new Error('Image URL or file upload is required')
      return vehicleIconsAdminApi.create(body)
    },
    onSuccess: async () => {
      toast.success(editing ? 'Icon updated' : 'Icon created')
      setOpen(false)
      setEditing(null)
      setForm(emptyForm)
      setFile(null)
      await qc.invalidateQueries({ queryKey: ['admin-vehicle-icons'] })
      await qc.invalidateQueries({ queryKey: ['vehicle-icons'] })
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error
          ? err.message
          : err && typeof err === 'object' && 'response' in err
            ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
            : null
      toast.error(msg ?? 'Could not save icon')
    },
  })

  const remove = useMutation({
    mutationFn: async () => vehicleIconsAdminApi.remove(deleting!._id),
    onSuccess: async () => {
      toast.success('Icon deleted')
      setDeleting(null)
      await qc.invalidateQueries({ queryKey: ['admin-vehicle-icons'] })
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null
      toast.error(msg ?? 'Could not delete icon')
    },
  })

  function clearFileInput() {
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function onFilePicked(f: File | null) {
    if (!f) {
      setFile(null)
      return
    }
    // Some browsers leave type empty for PNG — fall back to extension
    const extOk = /\.(png|svg|jpe?g|webp)$/i.test(f.name)
    const typeOk = !f.type || ALLOWED_TYPES.includes(f.type)
    if (!typeOk && !extOk) {
      toast.error('Use PNG, SVG, JPEG, or WebP images')
      setFile(null)
      clearFileInput()
      return
    }
    if (f.size > MAX_BYTES) {
      const sizeMb = (f.size / (1024 * 1024)).toFixed(2)
      toast.error(`Image is ${sizeMb}MB. Maximum allowed size is ${MAX_LABEL}.`)
      setFile(null)
      clearFileInput()
      return
    }
    setFile(f)
  }

  const columns = useMemo(
    () => [
      { key: '#', header: '#', cell: (r: VehicleIconAdmin) => r.rowNumber ?? '—' },
      {
        key: 'preview',
        header: 'Preview',
        cell: (r: VehicleIconAdmin) => (
          <div className="relative flex h-8 w-8 items-center justify-center">
            <IconPreview url={r.imageUrl} className="h-8 w-8" />
            <span hidden className="text-xs text-[var(--muted)]">
              —
            </span>
          </div>
        ),
      },
      { key: 'name', header: 'Name', cell: (r: VehicleIconAdmin) => <span className="font-medium">{r.name}</span> },
      { key: 'key', header: 'Key', cell: (r: VehicleIconAdmin) => r.key ?? '—' },
      { key: 'cat', header: 'Category', cell: (r: VehicleIconAdmin) => r.category ?? '—' },
      { key: 'type', header: 'Assigned Type', cell: (r: VehicleIconAdmin) => assignedType(r) },
      {
        key: 'status',
        header: 'Status',
        cell: (r: VehicleIconAdmin) => (
          <Badge variant={r.isActive === false ? 'danger' : 'success'}>
            {r.isActive === false ? 'Inactive' : 'Active'}
          </Badge>
        ),
      },
    ],
    [],
  )

  const tableActions = [
    {
      label: 'Edit',
      onClick: (r: VehicleIconAdmin) => {
        setEditing(r)
        const vehicleTypeId =
          r.vehicleTypeId && typeof r.vehicleTypeId === 'object'
            ? r.vehicleTypeId._id
            : String(r.vehicleTypeId ?? '')
        setForm({
          name: r.name ?? '',
          key: r.key ?? '',
          category: r.category ?? 'general',
          imageUrl: r.imageUrl ?? '',
          vehicleTypeId,
          isActive: r.isActive !== false,
        })
        setFile(null)
        clearFileInput()
        setOpen(true)
      },
    },
    { label: 'Delete', onClick: (r: VehicleIconAdmin) => setDeleting(r), destructive: true },
  ]

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setFile(null)
    clearFileInput()
    setOpen(true)
  }

  const viewToggle = (
    <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] p-0.5">
      <Button
        type="button"
        size="sm"
        variant={viewMode === 'table' ? 'default' : 'ghost'}
        className="h-8 gap-1 px-2"
        onClick={() => setViewMode('table')}
      >
        <TableIcon className="h-4 w-4" />
        Table
      </Button>
      <Button
        type="button"
        size="sm"
        variant={viewMode === 'grid' ? 'default' : 'ghost'}
        className="h-8 gap-1 px-2"
        onClick={() => setViewMode('grid')}
      >
        <LayoutGrid className="h-4 w-4" />
        Grid
      </Button>
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehicle Icons"
        description="Map marker icons for vehicle types and individual units."
        breadcrumbs={[{ label: 'System Configuration' }, { label: 'Vehicle Icons' }]}
      />

      {viewMode === 'table' ? (
        <DataTable
          columns={columns}
          rows={rows}
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
          addLabel="Add Icon"
          page={page}
          limit={limit}
          total={list.data?.total ?? 0}
          onPageChange={setPage}
          onLimitChange={(n) => {
            setPage(1)
            setLimit(n)
          }}
          actions={tableActions}
          toolbarExtra={viewToggle}
          emptyTitle="No vehicle icons"
          emptyDescription="Upload icons for use on the live map."
        />
      ) : (
        <Card className="border-[var(--border)] shadow-[var(--shadow-card)]">
          <CardContent className="space-y-4 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Input
                className="max-w-xs"
                placeholder="Search icons…"
                value={q}
                onChange={(e) => {
                  setPage(1)
                  setQ(e.target.value)
                }}
              />
              <div className="flex flex-wrap items-center gap-2">
                {viewToggle}
                <Button onClick={openCreate}>Add Icon</Button>
                <Button variant="outline" onClick={() => void list.refetch()}>
                  Refresh
                </Button>
              </div>
            </div>
            {list.isLoading ? <LoadingBlock /> : null}
            {!list.isLoading && rows.length === 0 ? (
              <EmptyBlock title="No vehicle icons" description="Upload icons for use on the live map." />
            ) : null}
            {!list.isLoading && rows.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {rows.map((icon) => (
                  <div
                    key={icon._id}
                    className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-white p-4 shadow-sm"
                  >
                    <div className="flex h-20 items-center justify-center rounded-lg bg-[#F5F7FC]">
                      {icon.imageUrl ? (
                        <IconPreview url={icon.imageUrl} className="max-h-16 max-w-full" />
                      ) : (
                        <span className="text-sm text-[var(--muted)]">No image</span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-[#18213A]">{icon.name}</p>
                      <p className="text-xs text-[var(--muted)]">{icon.key}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant={icon.isActive === false ? 'danger' : 'success'}>
                        {icon.isActive === false ? 'Inactive' : 'Active'}
                      </Badge>
                      {icon.category ? <Badge variant="outline">{icon.category}</Badge> : null}
                    </div>
                    <div className="mt-auto flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => tableActions[0].onClick(icon)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className={cn('flex-1 text-destructive')}
                        onClick={() => setDeleting(icon)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      <FormDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v)
          if (!v) {
            setFile(null)
            clearFileInput()
          }
        }}
        title={editing ? 'Edit Icon' : 'Add Icon'}
        loading={save.isPending}
        onSubmit={async () => {
          await save.mutateAsync()
        }}
        size="lg"
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
            <Label>Category</Label>
            <Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Assigned vehicle type</Label>
            <Select
              value={form.vehicleTypeId || 'none'}
              onValueChange={(v) => setForm((f) => ({ ...f, vehicleTypeId: v === 'none' ? '' : v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {(typeOptions.data as { _id: string; name: string }[] | undefined)?.map((t) => (
                  <SelectItem key={t._id} value={t._id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Image URL</Label>
            <Input
              value={form.imageUrl}
              onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
              placeholder="Or upload a file below"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Upload image (PNG, SVG, JPEG, WebP · max {MAX_LABEL})</Label>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".png,.svg,.jpg,.jpeg,.webp,image/png,image/svg+xml,image/jpeg,image/webp"
              onChange={(e) => onFilePicked(e.target.files?.[0] ?? null)}
            />
            {file && previewUrl ? (
              <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-2">
                <img src={previewUrl} alt="" className="h-12 w-12 rounded-lg object-contain" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {(file.size / (1024 * 1024)).toFixed(2)}MB · ready to upload
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setFile(null)
                    clearFileInput()
                  }}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <p className="text-xs text-[var(--muted)]">No file selected yet.</p>
            )}
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
        title="Delete icon?"
        description={deleting ? `Delete ${deleting.name}?` : undefined}
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </div>
  )
}