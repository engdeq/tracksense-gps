import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { mapSettingsApi } from '@/api/endpoints'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PageHeader } from '@/components/shared/PageHeader'
import { ErrorBlock, LoadingBlock } from '@/components/shared/page-states'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

type MapSettingsForm = {
  provider: string
  mapStyle: string
  defaultLat: string
  defaultLng: string
  defaultZoom: string
  minZoom: string
  maxZoom: string
  clusteringEnabled: boolean
  showVehicleLabels: boolean
  refreshIntervalSeconds: string
  googleMapsApiKey: string
}

const defaultForm: MapSettingsForm = {
  provider: 'google',
  mapStyle: 'normal',
  defaultLat: '24.7136',
  defaultLng: '46.6753',
  defaultZoom: '6',
  minZoom: '3',
  maxZoom: '19',
  clusteringEnabled: true,
  showVehicleLabels: true,
  refreshIntervalSeconds: '20',
  googleMapsApiKey: '',
}

type MapSettingsResponse = MapSettingsForm & {
  note?: string
  googleMapsConfigured?: boolean
}

function toForm(data: Record<string, unknown>): MapSettingsForm {
  return {
    provider: String(data.provider ?? 'google'),
    mapStyle: String(data.mapStyle ?? 'normal'),
    defaultLat: String(data.defaultLat ?? defaultForm.defaultLat),
    defaultLng: String(data.defaultLng ?? defaultForm.defaultLng),
    defaultZoom: String(data.defaultZoom ?? defaultForm.defaultZoom),
    minZoom: String(data.minZoom ?? defaultForm.minZoom),
    maxZoom: String(data.maxZoom ?? defaultForm.maxZoom),
    clusteringEnabled: data.clusteringEnabled !== false,
    showVehicleLabels: data.showVehicleLabels !== false,
    refreshIntervalSeconds: String(data.refreshIntervalSeconds ?? defaultForm.refreshIntervalSeconds),
    googleMapsApiKey: String(data.googleMapsApiKey ?? ''),
  }
}

export function MapSettingsPage() {
  const qc = useQueryClient()
  const [form, setForm] = useState<MapSettingsForm>(defaultForm)
  const [note, setNote] = useState<string | undefined>()
  const [confirmReset, setConfirmReset] = useState(false)

  const settings = useQuery({
    queryKey: ['admin-map-settings'],
    queryFn: () => mapSettingsApi.get() as Promise<MapSettingsResponse>,
  })

  useEffect(() => {
    if (settings.data) {
      setForm(toForm(settings.data as unknown as Record<string, unknown>))
      setNote(settings.data.note)
    }
  }, [settings.data])

  const save = useMutation({
    mutationFn: () =>
      mapSettingsApi.update({
        provider: form.provider,
        mapStyle: form.mapStyle,
        defaultLat: Number(form.defaultLat),
        defaultLng: Number(form.defaultLng),
        defaultZoom: Number(form.defaultZoom),
        minZoom: Number(form.minZoom),
        maxZoom: Number(form.maxZoom),
        clusteringEnabled: form.clusteringEnabled,
        showVehicleLabels: form.showVehicleLabels,
        refreshIntervalSeconds: Number(form.refreshIntervalSeconds),
        googleMapsApiKey: form.googleMapsApiKey,
      }),
    onSuccess: async () => {
      toast.success('Map settings saved')
      await qc.invalidateQueries({ queryKey: ['admin-map-settings'] })
    },
    onError: (err: unknown) => {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : null
      toast.error(msg ?? 'Could not save map settings')
    },
  })

  const reset = useMutation({
    mutationFn: () => mapSettingsApi.reset(),
    onSuccess: async (data) => {
      toast.success('Map settings reset to defaults')
      setConfirmReset(false)
      setForm(toForm((data ?? {}) as Record<string, unknown>))
      await qc.invalidateQueries({ queryKey: ['admin-map-settings'] })
    },
    onError: () => toast.error('Could not reset map settings'),
  })

  if (settings.isLoading) return <LoadingBlock label="Loading map settings…" />
  if (settings.isError) {
    return <ErrorBlock message="Could not load map settings." onRetry={() => void settings.refetch()} />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Map Settings"
        description="Default center, zoom, tiles, and clustering for live tracking maps."
        breadcrumbs={[{ label: 'System Configuration' }, { label: 'Map Settings' }]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setConfirmReset(true)}>
              Reset defaults
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save settings'}
            </Button>
          </div>
        }
      />

      {note ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{note}</p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Provider</CardTitle>
            <CardDescription>Default map type is Google Normal (also available via Layers on live maps).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Provider</Label>
              <Select value={form.provider} onValueChange={(v) => setForm((f) => ({ ...f, provider: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="google">Google Maps</SelectItem>
                  <SelectItem value="osm">OpenStreetMap</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Map style</Label>
              <Select value={form.mapStyle} onValueChange={(v) => setForm((f) => ({ ...f, mapStyle: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Google Normal (default)</SelectItem>
                  <SelectItem value="streets">Streets</SelectItem>
                  <SelectItem value="hybrid">Google Hybrid</SelectItem>
                  <SelectItem value="satellite">Satellite</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Google Maps API key</Label>
              <Input
                type="password"
                value={form.googleMapsApiKey}
                onChange={(e) => setForm((f) => ({ ...f, googleMapsApiKey: e.target.value }))}
                placeholder="Enter key to replace masked value"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Default viewport</CardTitle>
            <CardDescription>Initial map center when opening live tracking.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Latitude</Label>
              <Input value={form.defaultLat} onChange={(e) => setForm((f) => ({ ...f, defaultLat: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Longitude</Label>
              <Input value={form.defaultLng} onChange={(e) => setForm((f) => ({ ...f, defaultLng: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Default zoom</Label>
              <Input
                value={form.defaultZoom}
                onChange={(e) => setForm((f) => ({ ...f, defaultZoom: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Min zoom</Label>
              <Input value={form.minZoom} onChange={(e) => setForm((f) => ({ ...f, minZoom: e.target.value }))} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Max zoom</Label>
              <Input value={form.maxZoom} onChange={(e) => setForm((f) => ({ ...f, maxZoom: e.target.value }))} />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Live map behavior</CardTitle>
            <CardDescription>Clustering, labels, and refresh cadence.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2">
              <Label>Clustering enabled</Label>
              <Switch
                checked={form.clusteringEnabled}
                onCheckedChange={(v) => setForm((f) => ({ ...f, clusteringEnabled: v }))}
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2">
              <Label>Show vehicle labels</Label>
              <Switch
                checked={form.showVehicleLabels}
                onCheckedChange={(v) => setForm((f) => ({ ...f, showVehicleLabels: v }))}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Refresh interval (seconds)</Label>
              <Input
                type="number"
                value={form.refreshIntervalSeconds}
                onChange={(e) => setForm((f) => ({ ...f, refreshIntervalSeconds: e.target.value }))}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset map settings?"
        description="Restore default provider, viewport, and live map options."
        confirmLabel="Reset"
        destructive
        loading={reset.isPending}
        onConfirm={() => reset.mutate()}
      />
    </div>
  )
}