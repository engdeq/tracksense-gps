import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Maximize2, Minimize2, RefreshCw } from 'lucide-react'
import { gpsApi, lookupApi } from '@/api/endpoints'
import { TrackingMap } from '@/components/map/TrackingMap'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyBlock, ErrorBlock, LoadingBlock, MotionBadge, PageHeader } from '@/components/shared/page-states'
import type { MotionStatus } from '@/types/api'
import { resolveMediaUrl } from '@/lib/media'
import { formatDate, formatNumber, cn } from '@/lib/utils'
import { useUiStore } from '@/stores/uiStore'
import { useTrackSenseSocket } from '@/hooks/useSocket'

const STATUSES: (MotionStatus | 'all')[] = ['all', 'moving', 'stopped', 'offline', 'speeding', 'engine']

export function LiveTrackingPage() {
  const globalSearch = useUiStore((s) => s.globalSearch)
  const countryId = useUiStore((s) => s.countryId)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<MotionStatus | 'all'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [fullscreen, setFullscreen] = useState(false)

  const qc = useQueryClient()
  useTrackSenseSocket(() => {
    void qc.invalidateQueries({ queryKey: ['gps-live'] })
  })

  const countries = useQuery({ queryKey: ['countries'], queryFn: lookupApi.countries })
  const selectedCountryName = useMemo(() => {
    const list = Array.isArray(countries.data) ? countries.data : []
    return list.find((c) => c._id === countryId)?.name ?? null
  }, [countries.data, countryId])

  const query = useQuery({
    queryKey: ['gps-live', q, countryId],
    queryFn: () =>
      gpsApi.positions({
        ...(q ? { q } : {}),
        ...(countryId ? { countryId } : {}),
      }),
    refetchInterval: 20_000,
  })

  const searchTerm = q || globalSearch

  const filtered = useMemo(() => {
    let items = query.data?.items ?? []
    if (searchTerm) {
      const t = searchTerm.toLowerCase()
      items = items.filter(
        (i) =>
          i.vehicle.name.toLowerCase().includes(t) ||
          i.vehicle.plateNumber.toLowerCase().includes(t) ||
          (typeof i.vehicle.deviceId === 'object' && i.vehicle.deviceId?.imei?.includes(t)),
      )
    }
    if (status !== 'all') items = items.filter((i) => i.vehicle.motionStatus === status)
    return items
  }, [query.data?.items, searchTerm, status])

  return (
    <div className={cn(fullscreen && 'fixed inset-0 z-50 flex flex-col bg-[var(--background)] p-4')}>
      <PageHeader
        title="Live tracking"
        description={
          selectedCountryName
            ? `Showing fleet for ${selectedCountryName}. ${query.data?.note ?? ''}`.trim()
            : (query.data?.note ?? 'Real-time fleet map with motion status colors')
        }
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setFullscreen((f) => !f)}>
              {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              {fullscreen ? 'Exit' : 'Fullscreen'}
            </Button>
          </>
        }
      />

      <div className={cn('grid gap-4', fullscreen ? 'flex-1 lg:grid-cols-4' : 'lg:grid-cols-4')}>
        <Card className="lg:col-span-3 overflow-hidden">
          <CardContent className="p-0">
            {query.isLoading ? (
              <LoadingBlock />
            ) : query.isError ? (
              <ErrorBlock message="Failed to load GPS positions." onRetry={() => void query.refetch()} />
            ) : (
              <TrackingMap
                items={filtered}
                height={fullscreen ? 'calc(100vh - 8rem)' : 520}
                selectedId={selectedId}
                onSelect={setSelectedId}
                focusQuery={selectedCountryName}
              />
            )}
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="space-y-3 pb-2">
            <CardTitle className="text-base">Fleet list</CardTitle>
            <Input placeholder="Filter…" value={q} onChange={(e) => setQ(e.target.value)} />
            <Select value={status} onValueChange={(v) => setStatus(v as MotionStatus | 'all')}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s === 'all' ? 'All statuses' : s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-[420px] px-4 pb-4">
              {filtered.length === 0 ? (
                <EmptyBlock
                  title={selectedCountryName ? `No vehicles in ${selectedCountryName}` : 'No vehicles match'}
                  description={
                    selectedCountryName
                      ? 'Add a customer + vehicle for this country, or choose All countries in the header.'
                      : 'Adjust filters or check device connectivity.'
                  }
                />
              ) : (
                <ul className="space-y-2">
                  {filtered.map((item) => (
                    <li key={item.vehicle._id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(item.vehicle._id)}
                        className={cn(
                          'w-full rounded-xl border border-[var(--border)] p-3 text-left transition hover:border-[var(--primary)]/40',
                          selectedId === item.vehicle._id && 'border-[var(--primary)] bg-[var(--primary-soft)]',
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            {typeof item.vehicle.iconId === 'object' && item.vehicle.iconId?.imageUrl ? (
                              <img
                                src={resolveMediaUrl(item.vehicle.iconId.imageUrl)}
                                alt=""
                                className="h-8 w-8 shrink-0 rounded-full border border-[var(--border)] bg-white object-contain p-0.5"
                              />
                            ) : null}
                            <p className="truncate font-medium text-sm">{item.vehicle.name}</p>
                          </div>
                          <MotionBadge status={item.vehicle.motionStatus} />
                        </div>
                        <p className="text-xs text-[var(--muted)]">{item.vehicle.plateNumber}</p>
                        {item.position ? (
                          <p className="mt-1 text-xs">
                            {formatNumber(item.position.speedKmh ?? 0, 0)} km/h · {formatDate(item.position.recordedAt)}
                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-[var(--color-warning)]">No position</p>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
