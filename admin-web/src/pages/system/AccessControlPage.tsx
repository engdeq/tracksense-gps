import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { KeyRound, Lock, Shield, UserCheck, Users, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { accessControlApi, lookupApi, rolesApi } from '@/api/endpoints'
import { DataTable } from '@/components/shared/DataTable'
import { FormDialog } from '@/components/shared/FormDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDate, formatNumber } from '@/lib/utils'
import type { Paginated } from '@/types/api'

type AccessRuleRow = {
  _id: string
  rowNumber?: number
  name: string
  description?: string
  targetType?: 'user' | 'role'
  userId?: { _id?: string; fullName?: string; username?: string } | string | null
  roleKey?: string
  resource?: string
  accessType?: string
  countryId?: { name?: string } | string | null
  cityId?: { name?: string } | string | null
  startsAt?: string | null
  expiresAt?: string | null
  isActive?: boolean
  createdAt?: string
}

type AccessUserRow = {
  _id: string
  rowNumber?: number
  fullName?: string
  username?: string
  email?: string
  roleKey?: string
  isActive?: boolean
  isLocked?: boolean
  activeSessions?: number
  countryId?: { name?: string } | null
  cityId?: { name?: string } | null
  lastLoginAt?: string
}

type UserPickerRow = { _id: string; fullName?: string; username?: string }

const ACCESS_TYPES = ['allow', 'deny', 'read', 'write', 'manage'] as const

const emptyRuleForm = {
  name: '',
  description: '',
  targetType: 'role' as 'user' | 'role',
  userId: '',
  roleKey: '',
  resource: '',
  accessType: 'allow' as (typeof ACCESS_TYPES)[number],
  countryId: '',
  cityId: '',
  startsAt: '',
  expiresAt: '',
  isActive: true,
}

function refName(ref?: { name?: string } | string | null) {
  if (!ref) return '—'
  if (typeof ref === 'string') return ref
  return ref.name ?? '—'
}

function userLabel(userId?: AccessRuleRow['userId']) {
  if (!userId) return '—'
  if (typeof userId === 'string') return userId
  return userId.fullName || userId.username || '—'
}

export function AccessControlPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('rules')

  const [rulesQ, setRulesQ] = useState('')
  const [rulesPage, setRulesPage] = useState(1)
  const [rulesLimit, setRulesLimit] = useState(20)
  const [ruleOpen, setRuleOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<AccessRuleRow | null>(null)
  const [ruleForm, setRuleForm] = useState(emptyRuleForm)
  const [deletingRule, setDeletingRule] = useState<AccessRuleRow | null>(null)

  const [usersQ, setUsersQ] = useState('')
  const [usersPage, setUsersPage] = useState(1)
  const [usersLimit, setUsersLimit] = useState(20)
  const [userAction, setUserAction] = useState<{
    user: AccessUserRow
    action: 'activate' | 'suspend' | 'unlock' | 'revoke'
  } | null>(null)

  const summary = useQuery({
    queryKey: ['access-control-summary'],
    queryFn: () =>
      accessControlApi.summary() as Promise<{
        totalUsers?: number
        activeUsers?: number
        suspendedUsers?: number
        lockedAccounts?: number
        elevatedUsers?: number
        activeRules?: number
      }>,
  })

  const rulesList = useQuery({
    queryKey: ['access-rules', rulesQ, rulesPage, rulesLimit],
    queryFn: () =>
      accessControlApi.listRules({ q: rulesQ, page: rulesPage, limit: rulesLimit }) as Promise<
        Paginated<AccessRuleRow>
      >,
  })

  const usersList = useQuery({
    queryKey: ['access-users', usersQ, usersPage, usersLimit],
    queryFn: () =>
      accessControlApi.listUsers({ q: usersQ, page: usersPage, limit: usersLimit }) as Promise<
        Paginated<AccessUserRow>
      >,
  })

  const roleOptions = useQuery({
    queryKey: ['roles-picker'],
    queryFn: () =>
      rolesApi.list({ page: 1, limit: 100 }) as Promise<Paginated<{ key: string; name: string }>>,
  })

  const userPicker = useQuery({
    queryKey: ['access-users-picker'],
    queryFn: () => accessControlApi.listUsers({ page: 1, limit: 200 }) as Promise<Paginated<UserPickerRow>>,
  })

  const countries = useQuery({ queryKey: ['countries'], queryFn: lookupApi.countries })
  const cities = useQuery({
    queryKey: ['cities', ruleForm.countryId],
    queryFn: () => lookupApi.cities(ruleForm.countryId || undefined),
    enabled: Boolean(ruleForm.countryId),
  })

  useEffect(() => {
    if (!ruleForm.countryId) {
      setRuleForm((f) => (f.cityId ? { ...f, cityId: '' } : f))
    }
  }, [ruleForm.countryId])

  const saveRule = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        name: ruleForm.name,
        description: ruleForm.description,
        targetType: ruleForm.targetType,
        userId: ruleForm.targetType === 'user' ? ruleForm.userId || null : null,
        roleKey: ruleForm.targetType === 'role' ? ruleForm.roleKey : '',
        resource: ruleForm.resource,
        accessType: ruleForm.accessType,
        countryId: ruleForm.countryId || null,
        cityId: ruleForm.cityId || null,
        startsAt: ruleForm.startsAt || null,
        expiresAt: ruleForm.expiresAt || null,
        isActive: ruleForm.isActive,
      }
      if (editingRule?._id) return accessControlApi.updateRule(editingRule._id, body)
      return accessControlApi.createRule(body)
    },
    onSuccess: async () => {
      toast.success(editingRule ? 'Rule updated' : 'Rule created')
      setRuleOpen(false)
      setEditingRule(null)
      setRuleForm(emptyRuleForm)
      await qc.invalidateQueries({ queryKey: ['access-rules'] })
      await qc.invalidateQueries({ queryKey: ['access-control-summary'] })
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null
      toast.error(msg ?? 'Could not save rule')
    },
  })

  const removeRule = useMutation({
    mutationFn: async () => accessControlApi.removeRule(deletingRule!._id),
    onSuccess: async () => {
      toast.success('Rule deleted')
      setDeletingRule(null)
      await qc.invalidateQueries({ queryKey: ['access-rules'] })
      await qc.invalidateQueries({ queryKey: ['access-control-summary'] })
    },
    onError: () => toast.error('Could not delete rule'),
  })

  const runUserAction = useMutation({
    mutationFn: async () => {
      if (!userAction) return
      if (userAction.action === 'revoke') {
        return accessControlApi.revokeSessions(userAction.user._id)
      }
      return accessControlApi.setUserStatus(userAction.user._id, userAction.action)
    },
    onSuccess: async () => {
      toast.success('Account updated')
      setUserAction(null)
      await qc.invalidateQueries({ queryKey: ['access-users'] })
      await qc.invalidateQueries({ queryKey: ['access-control-summary'] })
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null
      toast.error(msg ?? 'Action failed')
    },
  })

  const ruleColumns = useMemo(
    () => [
      { key: '#', header: '#', cell: (r: AccessRuleRow) => r.rowNumber ?? '—' },
      { key: 'name', header: 'Name', cell: (r: AccessRuleRow) => <span className="font-medium">{r.name}</span> },
      {
        key: 'target',
        header: 'Target',
        cell: (r: AccessRuleRow) =>
          r.targetType === 'user' ? (
            <span>User · {userLabel(r.userId)}</span>
          ) : (
            <Badge variant="outline">{r.roleKey || '—'}</Badge>
          ),
      },
      { key: 'resource', header: 'Resource', cell: (r: AccessRuleRow) => r.resource ?? '—' },
      { key: 'access', header: 'Access', cell: (r: AccessRuleRow) => r.accessType ?? '—' },
      {
        key: 'geo',
        header: 'Location',
        cell: (r: AccessRuleRow) => {
          const c = refName(r.countryId)
          const city = refName(r.cityId)
          return c === '—' && city === '—' ? '—' : `${c}${city !== '—' ? ` / ${city}` : ''}`
        },
      },
      {
        key: 'window',
        header: 'Valid',
        cell: (r: AccessRuleRow) => {
          const start = r.startsAt ? formatDate(r.startsAt) : '—'
          const end = r.expiresAt ? formatDate(r.expiresAt) : '—'
          return `${start} → ${end}`
        },
      },
      {
        key: 'status',
        header: 'Status',
        cell: (r: AccessRuleRow) => (
          <Badge variant={r.isActive === false ? 'danger' : 'success'}>
            {r.isActive === false ? 'Inactive' : 'Active'}
          </Badge>
        ),
      },
    ],
    [],
  )

  const accountColumns = useMemo(
    () => [
      { key: '#', header: '#', cell: (r: AccessUserRow) => r.rowNumber ?? '—' },
      {
        key: 'name',
        header: 'User',
        cell: (r: AccessUserRow) => (
          <div>
            <span className="font-medium">{r.fullName || r.username}</span>
            <p className="text-xs text-[var(--muted)]">{r.email}</p>
          </div>
        ),
      },
      { key: 'role', header: 'Role', cell: (r: AccessUserRow) => <Badge>{r.roleKey ?? '—'}</Badge> },
      {
        key: 'status',
        header: 'Account',
        cell: (r: AccessUserRow) => (
          <div className="flex flex-wrap gap-1">
            <Badge variant={r.isActive === false ? 'danger' : 'success'}>
              {r.isActive === false ? 'Suspended' : 'Active'}
            </Badge>
            {r.isLocked ? <Badge variant="outline">Locked</Badge> : null}
          </div>
        ),
      },
      { key: 'sessions', header: 'Sessions', cell: (r: AccessUserRow) => r.activeSessions ?? 0 },
      {
        key: 'geo',
        header: 'Country / City',
        cell: (r: AccessUserRow) => {
          const c = r.countryId?.name ?? '—'
          const city = r.cityId?.name ?? '—'
          return `${c} / ${city}`
        },
      },
      { key: 'last', header: 'Last login', cell: (r: AccessUserRow) => formatDate(r.lastLoginAt) },
    ],
    [],
  )

  function openCreateRule() {
    setEditingRule(null)
    setRuleForm(emptyRuleForm)
    setRuleOpen(true)
  }

  function openEditRule(row: AccessRuleRow) {
    setEditingRule(row)
    const uid = typeof row.userId === 'object' && row.userId?._id ? String(row.userId._id) : ''
    const countryId =
      typeof row.countryId === 'object' && row.countryId && '_id' in row.countryId
        ? String((row.countryId as { _id: string })._id)
        : typeof row.countryId === 'string'
          ? row.countryId
          : ''
  const cityId =
      typeof row.cityId === 'object' && row.cityId && '_id' in row.cityId
        ? String((row.cityId as { _id: string })._id)
        : typeof row.cityId === 'string'
          ? row.cityId
          : ''
    setRuleForm({
      name: row.name,
      description: row.description || '',
      targetType: row.targetType ?? 'role',
      userId: uid,
      roleKey: row.roleKey || '',
      resource: row.resource || '',
      accessType: (ACCESS_TYPES.includes(row.accessType as (typeof ACCESS_TYPES)[number])
        ? row.accessType
        : 'allow') as (typeof ACCESS_TYPES)[number],
      countryId,
      cityId,
      startsAt: row.startsAt ? String(row.startsAt).slice(0, 10) : '',
      expiresAt: row.expiresAt ? String(row.expiresAt).slice(0, 10) : '',
      isActive: row.isActive !== false,
    })
    setRuleOpen(true)
  }

  const kpis = [
    { label: 'Total users', value: summary.data?.totalUsers ?? 0, icon: Users },
    { label: 'Active users', value: summary.data?.activeUsers ?? 0, icon: UserCheck },
    { label: 'Suspended', value: summary.data?.suspendedUsers ?? 0, icon: Shield },
    { label: 'Locked accounts', value: summary.data?.lockedAccounts ?? 0, icon: Lock },
    { label: 'Elevated users', value: summary.data?.elevatedUsers ?? 0, icon: Zap },
    { label: 'Active rules', value: summary.data?.activeRules ?? 0, icon: KeyRound },
  ]

  const roleRows = (roleOptions.data?.items ?? []) as { key: string; name: string }[]
  const pickerUsers = (userPicker.data?.items ?? []) as UserPickerRow[]

  const confirmCopy = useMemo(() => {
    if (!userAction) return { title: '', description: '' }
    const name = userAction.user.fullName || userAction.user.username
    const map = {
      activate: { title: 'Activate account?', description: `Restore access for ${name}?` },
      suspend: { title: 'Suspend account?', description: `${name} will be unable to sign in.` },
      unlock: { title: 'Unlock account?', description: `Clear lockout for ${name}?` },
      revoke: { title: 'Revoke sessions?', description: `Sign out all active sessions for ${name}.` },
    }
    return map[userAction.action]
  }, [userAction])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Access Control"
        description="Time-bound rules and account-level access management."
        breadcrumbs={[{ label: 'Administration' }, { label: 'Access Control' }]}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-[var(--muted)]">{label}</p>
                <p className="mt-1 font-display text-2xl font-bold text-[#5577E8]">{formatNumber(value)}</p>
              </div>
              <Icon className="h-7 w-7 text-[#5577E8]/35" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="rules">Access Rules</TabsTrigger>
          <TabsTrigger value="accounts">Account Access</TabsTrigger>
        </TabsList>

        <TabsContent value="rules">
          <DataTable
            columns={ruleColumns}
            rows={(rulesList.data?.items ?? []) as AccessRuleRow[]}
            loading={rulesList.isLoading}
            error={rulesList.isError}
            onRetry={() => void rulesList.refetch()}
            search={rulesQ}
            onSearchChange={(v) => {
              setRulesPage(1)
              setRulesQ(v)
            }}
            onRefresh={() => void rulesList.refetch()}
            onAdd={openCreateRule}
            addLabel="Add Rule"
            page={rulesPage}
            limit={rulesLimit}
            total={rulesList.data?.total ?? 0}
            onPageChange={setRulesPage}
            onLimitChange={(n) => {
              setRulesPage(1)
              setRulesLimit(n)
            }}
            actions={[
              { label: 'Edit', onClick: openEditRule },
              { label: 'Delete', onClick: (r) => setDeletingRule(r), destructive: true },
            ]}
            emptyTitle="No access rules"
            emptyDescription="Create rules to allow or deny resources by user or role."
          />
        </TabsContent>

        <TabsContent value="accounts">
          <DataTable
            columns={accountColumns}
            rows={(usersList.data?.items ?? []) as AccessUserRow[]}
            loading={usersList.isLoading}
            error={usersList.isError}
            onRetry={() => void usersList.refetch()}
            search={usersQ}
            onSearchChange={(v) => {
              setUsersPage(1)
              setUsersQ(v)
            }}
            onRefresh={() => void usersList.refetch()}
            page={usersPage}
            limit={usersLimit}
            total={usersList.data?.total ?? 0}
            onPageChange={setUsersPage}
            onLimitChange={(n) => {
              setUsersPage(1)
              setUsersLimit(n)
            }}
            actions={[
              { label: 'Activate', onClick: (r) => setUserAction({ user: r, action: 'activate' }) },
              { label: 'Suspend', onClick: (r) => setUserAction({ user: r, action: 'suspend' }) },
              { label: 'Unlock', onClick: (r) => setUserAction({ user: r, action: 'unlock' }) },
              { label: 'Revoke Sessions', onClick: (r) => setUserAction({ user: r, action: 'revoke' }) },
            ]}
            emptyTitle="No users"
            emptyDescription="Portal users with access metadata appear here."
          />
        </TabsContent>
      </Tabs>

      <FormDialog
        open={ruleOpen}
        onOpenChange={setRuleOpen}
        title={editingRule ? 'Edit access rule' : 'New access rule'}
        description="Rules apply to a user or role for a specific resource."
        loading={saveRule.isPending}
        onSubmit={() => saveRule.mutate()}
        size="xl"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Name</Label>
            <Input value={ruleForm.name} onChange={(e) => setRuleForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Description</Label>
            <Input
              value={ruleForm.description}
              onChange={(e) => setRuleForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Target type</Label>
            <Select
              value={ruleForm.targetType}
              onValueChange={(v) => setRuleForm((f) => ({ ...f, targetType: v as 'user' | 'role' }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="role">Role</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {ruleForm.targetType === 'user' ? (
            <div className="space-y-1.5">
              <Label>User</Label>
              <Select value={ruleForm.userId || 'none'} onValueChange={(v) => setRuleForm((f) => ({ ...f, userId: v === 'none' ? '' : v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select…</SelectItem>
                  {pickerUsers.map((u) => (
                    <SelectItem key={u._id} value={u._id}>
                      {u.fullName || u.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={ruleForm.roleKey || 'none'} onValueChange={(v) => setRuleForm((f) => ({ ...f, roleKey: v === 'none' ? '' : v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select…</SelectItem>
                  {roleRows.map((r) => (
                    <SelectItem key={r.key} value={r.key}>
                      {r.name} ({r.key})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Resource</Label>
            <Input value={ruleForm.resource} onChange={(e) => setRuleForm((f) => ({ ...f, resource: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Access type</Label>
            <Select
              value={ruleForm.accessType}
              onValueChange={(v) => setRuleForm((f) => ({ ...f, accessType: v as typeof ruleForm.accessType }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACCESS_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Country</Label>
            <Select
              value={ruleForm.countryId || 'none'}
              onValueChange={(v) => setRuleForm((f) => ({ ...f, countryId: v === 'none' ? '' : v, cityId: '' }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {(countries.data ?? []).map((c: { _id: string; name: string }) => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>City</Label>
            <Select
              value={ruleForm.cityId || 'none'}
              onValueChange={(v) => setRuleForm((f) => ({ ...f, cityId: v === 'none' ? '' : v }))}
              disabled={!ruleForm.countryId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {(cities.data ?? []).map((c: { _id: string; name: string }) => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Starts at</Label>
            <Input
              type="date"
              value={ruleForm.startsAt}
              onChange={(e) => setRuleForm((f) => ({ ...f, startsAt: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Expires at</Label>
            <Input
              type="date"
              value={ruleForm.expiresAt}
              onChange={(e) => setRuleForm((f) => ({ ...f, expiresAt: e.target.value }))}
            />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2 sm:col-span-2">
            <Label>Active</Label>
            <Switch checked={ruleForm.isActive} onCheckedChange={(v) => setRuleForm((f) => ({ ...f, isActive: v }))} />
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(deletingRule)}
        onOpenChange={(o) => !o && setDeletingRule(null)}
        title="Delete rule?"
        description={deletingRule ? `Remove rule "${deletingRule.name}"?` : undefined}
        confirmLabel="Delete"
        destructive
        loading={removeRule.isPending}
        onConfirm={() => removeRule.mutate()}
      />

      <ConfirmDialog
        open={Boolean(userAction)}
        onOpenChange={(o) => !o && setUserAction(null)}
        title={confirmCopy.title}
        description={confirmCopy.description}
        confirmLabel={userAction?.action === 'revoke' ? 'Revoke' : 'Confirm'}
        destructive={userAction?.action === 'suspend' || userAction?.action === 'revoke'}
        loading={runUserAction.isPending}
        onConfirm={() => runUserAction.mutate()}
      />
    </div>
  )
}