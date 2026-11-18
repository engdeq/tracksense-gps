import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { permissionsApi, rolesApi } from '@/api/endpoints'
import { DataTable } from '@/components/shared/DataTable'
import { FormDialog } from '@/components/shared/FormDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { formatDate } from '@/lib/utils'
import type { Paginated } from '@/types/api'

type RoleRow = {
  _id: string
  name: string
  key: string
  code?: string
  description?: string
  scope?: string
  isActive?: boolean
  isSystem?: boolean
  assignedUsers?: number
  permissionsCount?: number
  rowNumber?: number
  createdAt?: string
}

type PermissionItem = { _id: string; key: string; name: string; module: string; description?: string }

type PermissionsPayload = {
  items?: PermissionItem[]
  modules?: { module: string; permissions: PermissionItem[] }[]
}

const SCOPES = ['global', 'country', 'city', 'customer', 'assigned'] as const

const emptyForm = {
  name: '',
  key: '',
  description: '',
  scope: 'global' as (typeof SCOPES)[number],
  isActive: true,
}

function scopeLabel(scope?: string) {
  if (!scope) return '—'
  return scope.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function RolesPage() {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<RoleRow | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [deleting, setDeleting] = useState<RoleRow | null>(null)
  const [permRole, setPermRole] = useState<RoleRow | null>(null)
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [viewing, setViewing] = useState<RoleRow | null>(null)
  const [viewDetail, setViewDetail] = useState<Record<string, unknown> | null>(null)

  const list = useQuery({
    queryKey: ['roles', q, page, limit],
    queryFn: () => rolesApi.list({ q, page, limit }) as Promise<Paginated<RoleRow>>,
  })

  const catalog = useQuery({
    queryKey: ['permissions-catalog'],
    queryFn: () => permissionsApi.list() as Promise<PermissionsPayload>,
    enabled: Boolean(permRole),
  })

  const roleDetail = useQuery({
    queryKey: ['role', permRole?._id],
    queryFn: () => rolesApi.get(permRole!._id) as Promise<{ permissionKeys?: string[] }>,
    enabled: Boolean(permRole),
  })

  useEffect(() => {
    if (roleDetail.data?.permissionKeys) {
      setSelectedKeys(new Set(roleDetail.data.permissionKeys))
    }
  }, [roleDetail.data])

  const viewQuery = useQuery({
    queryKey: ['role-view', viewing?._id],
    queryFn: () => rolesApi.get(viewing!._id),
    enabled: Boolean(viewing),
  })

  useEffect(() => {
    if (viewQuery.data) setViewDetail(viewQuery.data as Record<string, unknown>)
  }, [viewQuery.data])

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        name: form.name,
        description: form.description,
        scope: form.scope,
        isActive: form.isActive,
        ...(editing ? {} : { key: form.key }),
      }
      if (editing?._id) return rolesApi.update(editing._id, body)
      return rolesApi.create(body)
    },
    onSuccess: async () => {
      toast.success(editing ? 'Role updated' : 'Role created')
      setOpen(false)
      setEditing(null)
      setForm(emptyForm)
      await qc.invalidateQueries({ queryKey: ['roles'] })
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null
      toast.error(msg ?? 'Could not save role')
    },
  })

  const remove = useMutation({
    mutationFn: async () => rolesApi.remove(deleting!._id),
    onSuccess: async () => {
      toast.success('Role deleted')
      setDeleting(null)
      await qc.invalidateQueries({ queryKey: ['roles'] })
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null
      toast.error(msg ?? 'Could not delete role')
    },
  })

  const savePermissions = useMutation({
    mutationFn: async () => rolesApi.setPermissions(permRole!._id, Array.from(selectedKeys)),
    onSuccess: async () => {
      toast.success('Permissions saved')
      setPermRole(null)
      await qc.invalidateQueries({ queryKey: ['roles'] })
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null
      toast.error(msg ?? 'Could not save permissions')
    },
  })

  const allPermissionKeys = useMemo(() => {
    const payload = catalog.data
    if (!payload?.items?.length && payload?.modules) {
      return payload.modules.flatMap((m) => m.permissions.map((p) => p.key))
    }
    return (payload?.items ?? []).map((p) => p.key)
  }, [catalog.data])

  const modules = catalog.data?.modules ?? []

  function toggleKey(key: string, checked: boolean) {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (checked) next.add(key)
      else next.delete(key)
      return next
    })
  }

  function setModuleKeys(moduleKeys: string[], checked: boolean) {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      for (const k of moduleKeys) {
        if (checked) next.add(k)
        else next.delete(k)
      }
      return next
    })
  }

  const columns = useMemo(
    () => [
      { key: '#', header: '#', cell: (r: RoleRow) => r.rowNumber ?? '—' },
      { key: 'name', header: 'Role Name', cell: (r: RoleRow) => <span className="font-medium">{r.name}</span> },
      {
        key: 'code',
        header: 'Role Code',
        cell: (r: RoleRow) => (
          <code className="rounded bg-[var(--primary-soft)] px-1.5 py-0.5 text-xs">{r.code ?? r.key}</code>
        ),
      },
      { key: 'desc', header: 'Description', cell: (r: RoleRow) => r.description || '—' },
      { key: 'users', header: 'Assigned Users', cell: (r: RoleRow) => r.assignedUsers ?? 0 },
      { key: 'perms', header: 'Permissions Count', cell: (r: RoleRow) => r.permissionsCount ?? 0 },
      { key: 'scope', header: 'Scope', cell: (r: RoleRow) => <Badge variant="outline">{scopeLabel(r.scope)}</Badge> },
      {
        key: 'status',
        header: 'Status',
        cell: (r: RoleRow) => (
          <Badge variant={r.isActive === false ? 'danger' : 'success'}>
            {r.isActive === false ? 'Inactive' : 'Active'}
          </Badge>
        ),
      },
      { key: 'created', header: 'Created', cell: (r: RoleRow) => formatDate(r.createdAt) },
    ],
    [],
  )

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setOpen(true)
  }

  function openEdit(row: RoleRow) {
    setEditing(row)
    setForm({
      name: row.name,
      key: row.key,
      description: row.description || '',
      scope: (SCOPES.includes(row.scope as (typeof SCOPES)[number]) ? row.scope : 'global') as (typeof SCOPES)[number],
      isActive: row.isActive !== false,
    })
    setOpen(true)
  }

  function requestDelete(row: RoleRow) {
    if (row.isSystem) {
      toast.error('System roles cannot be deleted')
      return
    }
    setDeleting(row)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roles & Permissions"
        description="Define roles, scopes, and permission bundles for portal users."
        breadcrumbs={[{ label: 'Administration' }, { label: 'Roles' }]}
      />

      <DataTable
        columns={columns}
        rows={(list.data?.items ?? []) as RoleRow[]}
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
        addLabel="Add Role"
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
          { label: 'Manage Permissions', onClick: (r) => setPermRole(r) },
          { label: 'View Details', onClick: (r) => setViewing(r) },
          { label: 'Delete', onClick: requestDelete, destructive: true },
        ]}
        emptyTitle="No roles yet"
        emptyDescription="Create custom roles or adjust permissions on system roles."
      />

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? 'Edit Role' : 'Add Role'}
        description={
          editing?.key === 'super_admin'
            ? 'Super Admin is a protected role. Only name and description can be changed by authorized users.'
            : 'Role codes must be unique and use lowercase with underscores.'
        }
        loading={save.isPending}
        onSubmit={() => save.mutate()}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Role Name</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          {!editing ? (
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Role Code (key)</Label>
              <Input
                value={form.key}
                onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
                placeholder="e.g. fleet_operator"
              />
            </div>
          ) : null}
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Description</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Scope</Label>
            <Select value={form.scope} onValueChange={(v) => setForm((f) => ({ ...f, scope: v as typeof form.scope }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCOPES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {scopeLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2">
            <Label>Active</Label>
            <Switch
              checked={form.isActive}
              onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
              disabled={editing?.key === 'super_admin'}
            />
          </div>
        </div>
      </FormDialog>

      <FormDialog
        open={Boolean(permRole)}
        onOpenChange={(o) => {
          if (!o) {
            setPermRole(null)
            setSelectedKeys(new Set())
          }
        }}
        title={permRole ? `Permissions — ${permRole.name}` : 'Permissions'}
        description="Grant or revoke capabilities by module."
        size="xl"
        submitLabel="Save Permissions"
        loading={savePermissions.isPending || roleDetail.isLoading || catalog.isLoading}
        onSubmit={() => savePermissions.mutate()}
      >
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setSelectedKeys(new Set(allPermissionKeys))}>
              Select All
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setSelectedKeys(new Set())}>
              Clear All
            </Button>
            <span className="ml-auto text-sm text-[var(--muted)]">{selectedKeys.size} selected</span>
          </div>
          {catalog.isLoading ? (
            <p className="text-sm text-[var(--muted)]">Loading permission catalog…</p>
          ) : (
            <div className="space-y-5">
              {modules.map((mod) => {
                const keys = mod.permissions.map((p) => p.key)
                const allOn = keys.length > 0 && keys.every((k) => selectedKeys.has(k))
                const someOn = keys.some((k) => selectedKeys.has(k))
                return (
                  <div key={mod.module} className="rounded-xl border border-[var(--border)] p-4">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold capitalize text-[var(--foreground)]">
                        {mod.module.replace(/_/g, ' ')}
                      </h3>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setModuleKeys(keys, !allOn)}
                      >
                        {allOn ? 'Clear module' : someOn ? 'Select all in module' : 'Select module'}
                      </Button>
                    </div>
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {mod.permissions.map((p) => (
                        <li key={p.key} className="flex items-start gap-2">
                          <Checkbox
                            id={p.key}
                            checked={selectedKeys.has(p.key)}
                            onCheckedChange={(c) => toggleKey(p.key, c === true)}
                          />
                          <label htmlFor={p.key} className="cursor-pointer text-sm leading-tight">
                            <span className="font-medium">{p.name}</span>
                            <span className="mt-0.5 block font-mono text-xs text-[var(--muted)]">{p.key}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </FormDialog>

      <FormDialog
        open={Boolean(viewing)}
        onOpenChange={(o) => {
          if (!o) {
            setViewing(null)
            setViewDetail(null)
          }
        }}
        title="Role details"
        description={viewing ? `${viewing.name} (${viewing.key})` : undefined}
        submitLabel="Close"
        onSubmit={() => setViewing(null)}
      >
        {viewQuery.isLoading ? (
          <p className="text-sm text-[var(--muted)]">Loading…</p>
        ) : viewDetail ? (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            {[
              ['Name', String(viewDetail.name ?? '')],
              ['Code', String(viewDetail.key ?? viewDetail.code ?? '')],
              ['Scope', scopeLabel(String(viewDetail.scope ?? ''))],
              ['Assigned users', String(viewDetail.assignedUsers ?? 0)],
              ['Permissions', String((viewDetail.permissionKeys as string[] | undefined)?.length ?? 0)],
              ['System role', viewDetail.isSystem ? 'Yes' : 'No'],
              ['Active', viewDetail.isActive === false ? 'No' : 'Yes'],
              ['Description', String(viewDetail.description ?? '—')],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[var(--muted)]">{label}</dt>
                <dd className="font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </FormDialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete role?"
        description={deleting ? `Delete ${deleting.name}? Users must be reassigned first.` : undefined}
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </div>
  )
}