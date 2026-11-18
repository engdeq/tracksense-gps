import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Download, ShieldAlert, LogIn, Activity } from 'lucide-react'
import { toast } from 'sonner'
import { auditLogsApi } from '@/api/endpoints'
import { DataTable } from '@/components/shared/DataTable'
import { FormDialog } from '@/components/shared/FormDialog'
import { PageHeader } from '@/components/shared/PageHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatDate, formatNumber } from '@/lib/utils'
import type { Paginated } from '@/types/api'

type AuditRow = {
  _id: string
  rowNumber?: number
  userName?: string
  userRole?: string
  action?: string
  module?: string
  entity?: string
  description?: string
  ipAddress?: string
  userAgent?: string
  createdAt?: string
  status?: string
}

type AuditDetail = AuditRow & {
  entityId?: string
  actorRole?: string
  metadata?: unknown
  before?: unknown
  after?: unknown
  requestId?: string
}

function truncateAgent(ua?: string, max = 48) {
  if (!ua) return '—'
  return ua.length > max ? `${ua.slice(0, max)}…` : ua
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function JsonBlock({ value }: { value: unknown }) {
  if (value == null) return <span className="text-[var(--muted)]">—</span>
  return (
    <pre className="max-h-40 overflow-auto rounded-lg bg-[var(--background)] p-3 text-xs">
      {JSON.stringify(value, null, 2)}
    </pre>
  )
}

export function AuditLogsPage() {
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [action, setAction] = useState('')
  const [module, setModule] = useState('')
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [viewing, setViewing] = useState<AuditRow | null>(null)

  const summary = useQuery({
    queryKey: ['audit-summary'],
    queryFn: () =>
      auditLogsApi.summary() as Promise<{ total?: number; failures?: number; logins?: number; windowDays?: number }>,
  })

  const listParams = useMemo(() => {
    const p: Record<string, string | number> = { q, page, limit }
    if (action) p.action = action
    if (module) p.module = module
    if (status) p.status = status
    if (from) p.from = from
    if (to) p.to = to
    return p
  }, [q, page, limit, action, module, status, from, to])

  const list = useQuery({
    queryKey: ['audit-logs', listParams],
    queryFn: () => auditLogsApi.list(listParams) as Promise<Paginated<AuditRow>>,
  })

  const detail = useQuery({
    queryKey: ['audit-log', viewing?._id],
    queryFn: () => auditLogsApi.get(viewing!._id) as Promise<AuditDetail>,
    enabled: Boolean(viewing),
  })

  const exportCsv = useMutation({
    mutationFn: async () => {
      const params: Record<string, string> = {}
      if (from) params.from = from
      if (to) params.to = to
      if (action) params.action = action
      if (module) params.module = module
      if (status) params.status = status
      return auditLogsApi.exportCsv(params)
    },
    onSuccess: (blob) => {
      downloadBlob(blob, 'audit-logs.csv')
      toast.success('Export downloaded')
    },
    onError: () => toast.error('Could not export audit logs'),
  })

  const columns = useMemo(
    () => [
      { key: '#', header: '#', cell: (r: AuditRow) => r.rowNumber ?? '—' },
      { key: 'user', header: 'User', cell: (r: AuditRow) => <span className="font-medium">{r.userName ?? 'System'}</span> },
      {
        key: 'role',
        header: 'Role',
        cell: (r: AuditRow) => <Badge variant="outline">{r.userRole ?? '—'}</Badge>,
      },
      { key: 'action', header: 'Action', cell: (r: AuditRow) => r.action ?? '—' },
      { key: 'module', header: 'Module', cell: (r: AuditRow) => r.module ?? r.entity ?? '—' },
      { key: 'desc', header: 'Description', cell: (r: AuditRow) => r.description || '—' },
      { key: 'ip', header: 'IP', cell: (r: AuditRow) => r.ipAddress || '—' },
      { key: 'device', header: 'Device/Browser', cell: (r: AuditRow) => truncateAgent(r.userAgent) },
      { key: 'time', header: 'Timestamp', cell: (r: AuditRow) => formatDate(r.createdAt) },
      {
        key: 'status',
        header: 'Status',
        cell: (r: AuditRow) => (
          <Badge variant={r.status === 'failure' ? 'danger' : r.status === 'info' ? 'outline' : 'success'}>
            {r.status ?? 'success'}
          </Badge>
        ),
      },
    ],
    [],
  )

  const windowDays = summary.data?.windowDays ?? 7

  const filters = (
    <div className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <Label className="text-xs">Action</Label>
        <Input
          className="h-9 w-28"
          value={action}
          onChange={(e) => {
            setPage(1)
            setAction(e.target.value)
          }}
          placeholder="action"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Module</Label>
        <Input
          className="h-9 w-28"
          value={module}
          onChange={(e) => {
            setPage(1)
            setModule(e.target.value)
          }}
          placeholder="entity"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Status</Label>
        <Select
          value={status || 'all'}
          onValueChange={(v) => {
            setPage(1)
            setStatus(v === 'all' ? '' : v)
          }}
        >
          <SelectTrigger className="h-9 w-32">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="success">Success</SelectItem>
            <SelectItem value="failure">Failure</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">From</Label>
        <Input
          type="date"
          className="h-9"
          value={from}
          onChange={(e) => {
            setPage(1)
            setFrom(e.target.value)
          }}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">To</Label>
        <Input
          type="date"
          className="h-9"
          value={to}
          onChange={(e) => {
            setPage(1)
            setTo(e.target.value)
          }}
        />
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Review platform activity, sign-ins, and configuration changes."
        breadcrumbs={[{ label: 'Administration' }, { label: 'Audit Logs' }]}
        actions={
          <Button
            variant="outline"
            size="sm"
            disabled={exportCsv.isPending}
            onClick={() => exportCsv.mutate()}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-[var(--muted)]">Events ({windowDays}d)</p>
              <p className="mt-1 font-display text-2xl font-bold text-[#5577E8]">
                {formatNumber(summary.data?.total ?? 0)}
              </p>
            </div>
            <Activity className="h-8 w-8 text-[#5577E8]/40" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-[var(--muted)]">Failures ({windowDays}d)</p>
              <p className="mt-1 font-display text-2xl font-bold text-[var(--color-danger)]">
                {formatNumber(summary.data?.failures ?? 0)}
              </p>
            </div>
            <ShieldAlert className="h-8 w-8 text-[var(--color-danger)]/40" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-[var(--muted)]">Logins ({windowDays}d)</p>
              <p className="mt-1 font-display text-2xl font-bold">{formatNumber(summary.data?.logins ?? 0)}</p>
            </div>
            <LogIn className="h-8 w-8 text-[var(--muted)]/50" />
          </CardContent>
        </Card>
      </div>

      <DataTable
        columns={columns}
        rows={(list.data?.items ?? []) as AuditRow[]}
        loading={list.isLoading}
        error={list.isError}
        onRetry={() => void list.refetch()}
        search={q}
        onSearchChange={(v) => {
          setPage(1)
          setQ(v)
        }}
        onRefresh={() => void list.refetch()}
        toolbarExtra={filters}
        page={page}
        limit={limit}
        total={list.data?.total ?? 0}
        onPageChange={setPage}
        onLimitChange={(n) => {
          setPage(1)
          setLimit(n)
        }}
        actions={[{ label: 'View', onClick: (r) => setViewing(r) }]}
        emptyTitle="No audit entries"
        emptyDescription="Activity will appear here as users interact with the platform."
      />

      <FormDialog
        open={Boolean(viewing)}
        onOpenChange={(o) => !o && setViewing(null)}
        title="Audit log detail"
        description={viewing ? `${viewing.action} · ${viewing.module ?? viewing.entity}` : undefined}
        submitLabel="Close"
        onSubmit={() => setViewing(null)}
        size="xl"
      >
        {detail.isLoading ? (
          <p className="text-sm text-[var(--muted)]">Loading…</p>
        ) : detail.data ? (
          <div className="space-y-4 text-sm">
            <dl className="grid gap-3 sm:grid-cols-2">
              {[
                ['User', detail.data.userName ?? 'System'],
                ['Role', detail.data.userRole ?? detail.data.actorRole ?? '—'],
                ['Action', detail.data.action ?? '—'],
                ['Module', detail.data.module ?? detail.data.entity ?? '—'],
                ['Entity ID', detail.data.entityId ?? '—'],
                ['Status', detail.data.status ?? 'success'],
                ['IP', detail.data.ipAddress ?? '—'],
                ['Timestamp', formatDate(detail.data.createdAt)],
                ['Request ID', detail.data.requestId ?? '—'],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[var(--muted)]">{label}</dt>
                  <dd className="font-medium break-all">{value}</dd>
                </div>
              ))}
            </dl>
            <div>
              <Label className="text-[var(--muted)]">Description</Label>
              <p className="mt-1">{detail.data.description || '—'}</p>
            </div>
            <div>
              <Label className="text-[var(--muted)]">User agent</Label>
              <p className="mt-1 break-all text-xs">{detail.data.userAgent || '—'}</p>
            </div>
            <div>
              <Label>Metadata</Label>
              <JsonBlock value={detail.data.metadata} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Before</Label>
                <JsonBlock value={detail.data.before} />
              </div>
              <div>
                <Label>After</Label>
                <JsonBlock value={detail.data.after} />
              </div>
            </div>
          </div>
        ) : null}
      </FormDialog>
    </div>
  )
}