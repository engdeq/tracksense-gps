import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  ArrowUpRight,
  BellRing,
  Car,
  Cpu,
  Hexagon,
  LayoutDashboard,
  Route,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { alertsApi, dashboardApi, geofencesApi, gpsApi } from '@/api/endpoints'
import { TrackingMap } from '@/components/map/TrackingMap'
import { MetricCard } from '@/components/shared/MetricCard'
import { PageHeader } from '@/components/shared/PageHeader'
import { ErrorBlock, LoadingBlock } from '@/components/shared/page-states'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate, formatNumber } from '@/lib/utils'

const PIE_COLORS = ['#16A34A', '#F59E0B']

export function DashboardPage() {
  const dash = useQuery({ queryKey: ['dashboard'], queryFn: dashboardApi.admin, refetchInterval: 120_000 })
  const live = useQuery({ queryKey: ['gps-preview'], queryFn: () => gpsApi.positions({}), refetchInterval: 30_000 })
  const geofenceStats = useQuery({
    queryKey: ['geofence-stats-dash'],
    queryFn: () => geofencesApi.stats(),
  })
  const alerts = useQuery({
    queryKey: ['alerts-dash'],
    queryFn: () => alertsApi.list({ limit: 1, page: 1, isRead: 'false' }),
  })

  if (dash.isLoading) return <LoadingBlock label="Loading dashboard…" />
  if (dash.isError) return <ErrorBlock message="Could not load dashboard metrics." onRetry={() => void dash.refetch()} />

  const data = dash.data!
  const unreadAlerts =
    (alerts.data as { unread?: number } | undefined)?.unread ??
    data.recentAlerts.filter((a) => !a.isRead).length
  const geofenceCount = geofenceStats.data?.totalGeofences ?? 0

  const online = data.kpis.onlineDevices
  const offline = data.kpis.offlineDevices
  const totalDevices = Math.max(1, online + offline)
  const onlinePct = Math.round((online / totalDevices) * 1000) / 10
  const offlinePct = Math.round((1000 - onlinePct * 10)) / 10

  const statusPie = [
    { name: 'Online', value: online, pct: onlinePct },
    { name: 'Offline', value: offline, pct: offlinePct },
  ]

  const alertTrend = data.tripsDistance.map((d) => ({
    day: d._id.slice(5),
    // Use trip volume as activity proxy when dedicated alert trend is unavailable
    alerts: d.trips,
  }))

  return (
    <div className="space-y-6">
      <PageHeader
        icon={LayoutDashboard}
        title="Dashboard"
        description="Fleet overview, real-time status and key performance metrics."
        breadcrumbs={[{ label: 'Dashboard' }]}
        actions={
          <Button variant="secondary" asChild>
            <Link to="/live-tracking">
              Live Tracking
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <MetricCard label="Total Vehicles" value={data.kpis.totalVehicles} icon={Car} tone="blue" />
        <MetricCard label="Online Vehicles" value={online} icon={Wifi} tone="success" />
        <MetricCard label="Offline Vehicles" value={offline} icon={WifiOff} tone="warning" />
        <MetricCard label="Active Alerts" value={unreadAlerts} icon={BellRing} tone="danger" />
        <MetricCard label="Geofences" value={geofenceCount} icon={Hexagon} tone="deep" />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Live Tracking Map</CardTitle>
              <CardDescription>
                {live.data?.note ?? 'Latest GPS positions from connected devices.'}
              </CardDescription>
            </div>
            <Button size="sm" asChild>
              <Link to="/live-tracking">
                View Live Tracking
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {live.isLoading ? (
              <LoadingBlock />
            ) : live.isError ? (
              <ErrorBlock message="Unable to load live positions." onRetry={() => void live.refetch()} />
            ) : (
              <TrackingMap items={live.data?.items ?? []} height={360} />
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Vehicle Status</CardTitle>
              <CardDescription>Online vs offline devices</CardDescription>
            </CardHeader>
            <CardContent className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPie}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={78}
                    paddingAngle={3}
                  >
                    {statusPie.map((entry, idx) => (
                      <Cell key={entry.name} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [`${formatNumber(Number(value))} devices`, String(name)]}
                    contentStyle={{ borderRadius: 12, border: '1px solid var(--border)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-1 flex justify-center gap-4 text-xs text-[var(--muted)]">
                <span>
                  <span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#16A34A]" />
                  Online {onlinePct}%
                </span>
                <span>
                  <span className="mr-1 inline-block h-2 w-2 rounded-full bg-[#F59E0B]" />
                  Offline {offlinePct}%
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity Trend</CardTitle>
              <CardDescription>Daily trip activity (7 days)</CardDescription>
            </CardHeader>
            <CardContent className="h-[180px]">
              {alertTrend.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">No recent activity.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={alertTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="day" stroke="var(--muted)" fontSize={11} />
                    <YAxis stroke="var(--muted)" fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid var(--border)' }} />
                    <Bar dataKey="alerts" fill="#5577E8" radius={[8, 8, 0, 0]} name="Trips" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Recent Alerts</CardTitle>
              <CardDescription>Latest fleet notifications</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/alerts">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentAlerts.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No alerts yet.</p>
            ) : (
              data.recentAlerts.slice(0, 5).map((a) => (
                <div
                  key={a._id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)]/60 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{a.title ?? a.type}</p>
                    <p className="line-clamp-2 text-xs text-[var(--muted)]">{a.message}</p>
                  </div>
                  <span className="shrink-0 text-[11px] text-[var(--muted)]">{formatDate(a.createdAt)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fleet Snapshot</CardTitle>
            <CardDescription>Customers, devices and trips</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {[
              { label: 'Customers', value: data.kpis.totalCustomers, icon: Users },
              { label: 'Devices', value: data.kpis.totalDevices, icon: Cpu },
              { label: 'Trips', value: data.kpis.totalTrips, icon: Route },
              { label: 'Vehicles', value: data.kpis.totalVehicles, icon: Car },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-[var(--border)] bg-[var(--background)]/50 p-3"
              >
                <item.icon className="mb-2 h-4 w-4 text-[var(--primary)]" />
                <p className="text-xs text-[var(--muted)]">{item.label}</p>
                <p className="font-display text-xl font-bold">{formatNumber(item.value)}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Audit trail snapshot</CardDescription>
          </CardHeader>
          <CardContent className="max-h-72 space-y-3 overflow-auto">
            {data.recentActivities.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No activity logged.</p>
            ) : (
              data.recentActivities.slice(0, 8).map((act) => (
                <div key={act._id} className="flex gap-3 text-sm">
                  <Activity className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
                  <div>
                    <p className="font-medium capitalize">
                      {act.action} {act.entityType}
                    </p>
                    <p className="text-xs text-[var(--muted)]">{formatDate(act.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
