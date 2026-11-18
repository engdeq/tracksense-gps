import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/api/endpoints'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ErrorBlock, LoadingBlock, PageHeader } from '@/components/shared/page-states'
import { formatNumber } from '@/lib/utils'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

export function ReportsPage() {
  const [tab, setTab] = useState('distance')

  const distance = useQuery({ queryKey: ['report-distance'], queryFn: () => reportsApi.distance(), enabled: tab === 'distance' })
  const trips = useQuery({ queryKey: ['report-trips'], queryFn: () => reportsApi.trips(), enabled: tab === 'trips' })
  const speed = useQuery({ queryKey: ['report-speed'], queryFn: () => reportsApi.speed(), enabled: tab === 'speed' })
  const vehicles = useQuery({ queryKey: ['report-vehicles'], queryFn: () => reportsApi.vehicles(), enabled: tab === 'vehicles' })

  return (
    <div className="space-y-6">
      <PageHeader title="Reports & analytics" description="Distance, trips, speed and fleet utilization" />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="distance">Distance</TabsTrigger>
          <TabsTrigger value="trips">Trips</TabsTrigger>
          <TabsTrigger value="speed">Speed</TabsTrigger>
          <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
        </TabsList>
        <TabsContent value="distance">
          <ReportDistance query={distance} />
        </TabsContent>
        <TabsContent value="trips">
          <ReportTrips query={trips} />
        </TabsContent>
        <TabsContent value="speed">
          <ReportGeneric query={speed} title="Speed events" />
        </TabsContent>
        <TabsContent value="vehicles">
          <ReportGeneric query={vehicles} title="Vehicle summary" />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ReportDistance({ query }: { query: ReturnType<typeof useQuery<unknown>> }) {
  if (query.isLoading) return <LoadingBlock />
  if (query.isError) return <ErrorBlock message="Distance report unavailable." onRetry={() => void query.refetch()} />
  const data = query.data as { items?: { totalDistanceKm?: number; tripCount?: number; vehicle?: { name?: string; plateNumber?: string } }[] }
  const chart = (data.items ?? []).map((r) => ({
    name: r.vehicle?.plateNumber ?? '—',
    km: r.totalDistanceKm ?? 0,
  }))
  return (
    <Card>
      <CardHeader>
        <CardTitle>Distance by vehicle</CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        {chart.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">No completed trips in range.</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" fontSize={11} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="km" fill="#5577E8" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

function ReportTrips({ query }: { query: ReturnType<typeof useQuery<unknown>> }) {
  if (query.isLoading) return <LoadingBlock />
  if (query.isError) return <ErrorBlock message="Trip report unavailable." />
  const data = query.data as { summary?: { trips?: number; distanceKm?: number; avgSpeedKmh?: number }; byDay?: { _id: string; trips: number }[] }
  const s = data.summary ?? {}
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {[
        { label: 'Trips', value: formatNumber(s.trips) },
        { label: 'Distance km', value: formatNumber(s.distanceKm, 1) },
        { label: 'Avg speed', value: `${formatNumber(s.avgSpeedKmh, 0)} km/h` },
      ].map((k) => (
        <Card key={k.label}>
          <CardContent className="p-6">
            <p className="text-sm text-[var(--muted)]">{k.label}</p>
            <p className="font-display text-3xl font-bold">{k.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function ReportGeneric({ query, title }: { query: ReturnType<typeof useQuery<unknown>>; title: string }) {
  if (query.isLoading) return <LoadingBlock />
  if (query.isError) return <ErrorBlock message={`${title} unavailable.`} />
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="max-h-96 overflow-auto rounded-xl bg-[var(--background)] p-4 text-xs">{JSON.stringify(query.data, null, 2)}</pre>
      </CardContent>
    </Card>
  )
}