import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { menusApi, type MenuNode } from '@/api/endpoints'
import { DataTable } from '@/components/shared/DataTable'
import { FormDialog } from '@/components/shared/FormDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PageHeader } from '@/components/shared/PageHeader'
import { resolveMenuIcon } from '@/lib/menu-icons'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

const emptyForm = {
  key: '',
  label: '',
  icon: 'Circle',
  path: '',
  parentId: '' as string | null,
  order: 0,
  group: 'main',
  isActive: true,
  isVisible: true,
  roles: 'super_admin, admin, operator',
}

function parentLabel(items: MenuNode[], parentId?: string | null) {
  if (!parentId) return '—'
  return items.find((m) => m._id === parentId)?.label ?? '—'
}

export function MenusPage() {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<MenuNode | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [deleting, setDeleting] = useState<MenuNode | null>(null)

  const list = useQuery({ queryKey: ['admin-menus'], queryFn: menusApi.adminList })

  const filtered = useMemo(() => {
    const items = list.data ?? []
    const needle = q.trim().toLowerCase()
    if (!needle) return items
    return items.filter(
      (m) =>
        m.label.toLowerCase().includes(needle) ||
        m.key.toLowerCase().includes(needle) ||
        (m.path ?? '').toLowerCase().includes(needle),
    )
  }, [list.data, q])

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        key: form.key,
        label: form.label,
        icon: form.icon,
        path: form.path,
        parentId: form.parentId || null,
        order: Number(form.order) || 0,
        group: form.group,
        isActive: form.isActive,
        isVisible: form.isVisible,
        roles: form.roles.split(',').map((s) => s.trim()).filter(Boolean),
      }
      if (editing?._id) return menusApi.update(editing._id, body)
      return menusApi.create(body)
    },
    onSuccess: async () => {
      toast.success(editing ? 'Menu updated' : 'Menu created')
      setOpen(false)
      setEditing(null)
      setForm(emptyForm)
      await qc.invalidateQueries({ queryKey: ['admin-menus'] })
      await qc.invalidateQueries({ queryKey: ['menus-tree'] })
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null
      toast.error(msg ?? 'Could not save menu')
    },
  })

  const remove = useMutation({
    mutationFn: async () => menusApi.remove(deleting!._id),
    onSuccess: async () => {
      toast.success('Menu deleted')
      setDeleting(null)
      await qc.invalidateQueries({ queryKey: ['admin-menus'] })
      await qc.invalidateQueries({ queryKey: ['menus-tree'] })
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null
      toast.error(msg ?? 'Could not delete menu')
    },
  })

  const columns = useMemo(
    () => [
      {
        key: 'label',
        header: 'Label',
        cell: (row: MenuNode) => {
          const Icon = resolveMenuIcon(row.icon)
          return (
            <span className="inline-flex items-center gap-2 font-medium">
              <Icon className="h-4 w-4 text-[var(--primary)]" />
              {row.label}
            </span>
          )
        },
      },
      { key: 'key', header: 'Key', cell: (row: MenuNode) => row.key },
      { key: 'path', header: 'Path', cell: (row: MenuNode) => row.path || '—' },
      {
        key: 'parent',
        header: 'Parent',
        cell: (row: MenuNode) => parentLabel(list.data ?? [], row.parentId),
      },
      { key: 'order', header: 'Order', cell: (row: MenuNode) => row.order ?? 0 },
      {
        key: 'visible',
        header: 'Visible',
        cell: (row: MenuNode) => (
          <Badge variant={row.isVisible === false ? 'secondary' : 'success'}>
            {row.isVisible === false ? 'Hidden' : 'Visible'}
          </Badge>
        ),
      },
    ],
    [list.data],
  )

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setOpen(true)
  }

  function openEdit(row: MenuNode) {
    setEditing(row)
    setForm({
      key: row.key,
      label: row.label,
      icon: row.icon || 'Circle',
      path: row.path || '',
      parentId: row.parentId ?? null,
      order: row.order ?? 0,
      group: row.group || 'main',
      isActive: row.isActive !== false,
      isVisible: row.isVisible !== false,
      roles: (row.roles ?? ['super_admin', 'admin', 'operator']).join(', '),
    })
    setOpen(true)
  }

  const parentOptions = (list.data ?? []).filter((m) => m._id !== editing?._id)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Menu Management"
        description="Configure the sidebar navigation tree served from the API."
        breadcrumbs={[{ label: 'System Configuration' }, { label: 'Menus' }]}
      />

      <DataTable
        columns={columns}
        rows={filtered}
        loading={list.isLoading}
        error={list.isError}
        onRetry={() => void list.refetch()}
        search={q}
        onSearchChange={setQ}
        onRefresh={() => void list.refetch()}
        onAdd={openCreate}
        addLabel="Add Menu"
        actions={[
          { label: 'Edit', onClick: openEdit },
          { label: 'Delete', onClick: (r) => setDeleting(r), destructive: true },
        ]}
        emptyTitle="No menu items"
        emptyDescription="Seed menus or create entries for the sidebar."
      />

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? 'Edit Menu' : 'Add Menu'}
        description="Use Lucide icon names (e.g. LayoutDashboard, Globe2)."
        loading={save.isPending}
        size="xl"
        onSubmit={() => save.mutate()}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Key</Label>
            <Input
              value={form.key}
              onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
              disabled={Boolean(editing)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Label</Label>
            <Input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Icon</Label>
            <Input value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Path</Label>
            <Input value={form.path} onChange={(e) => setForm((f) => ({ ...f, path: e.target.value }))} placeholder="/customers" />
          </div>
          <div className="space-y-1.5">
            <Label>Parent</Label>
            <Select
              value={form.parentId ? form.parentId : 'none'}
              onValueChange={(v) => setForm((f) => ({ ...f, parentId: v === 'none' ? null : v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Top level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (top level)</SelectItem>
                {parentOptions.map((m) => (
                  <SelectItem key={m._id} value={m._id}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Order</Label>
            <Input
              type="number"
              value={form.order}
              onChange={(e) => setForm((f) => ({ ...f, order: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Roles (comma-separated)</Label>
            <Input value={form.roles} onChange={(e) => setForm((f) => ({ ...f, roles: e.target.value }))} />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2">
            <Label>Active</Label>
            <Switch checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2">
            <Label>Visible in sidebar</Label>
            <Switch checked={form.isVisible} onCheckedChange={(v) => setForm((f) => ({ ...f, isVisible: v }))} />
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete menu?"
        description="Remove child menu items first."
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </div>
  )
}