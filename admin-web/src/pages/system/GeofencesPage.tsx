import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  CircleDot,
  LogIn,
  LogOut,
  MapPinned,
  ShieldOff,
  ShieldCheck,
  Truck,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  customersApi,
  geofencesApi,
  gpsApi,
  lookupApi,
  vehiclesApi,
  type GeofenceEventRow,
  type GeofenceRow,
} from '@/api/endpoints'
import { DataTable } from '@/components/shared/DataTable'
import { FormDialog } from '@/components/shared/FormDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { PageHeader } from '@/components/shared/PageHeader'
import { GeofenceDrawMap, type GeofenceGeometryValue } from '@/components/map/GeofenceDrawMap'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { formatDate, formatNumber } from '@/lib/utils'
import type { Customer, Vehicle } from '@/types/api'

type AlertMode = 'both' | 'entry' | 'exit' | 'off'

type FormState = {
  name: string
  description: string
  customerId: string
  countryId: string
  cityId: string
  color: string
  isActive: boolean
  alertMode: AlertMode
  assignedVehicleIds: string[]
  geometry: GeofenceGeometryValue
}

const emptyGeometry: GeofenceGeometryValue = {
  type: 'circle',
  center: null,
  radiusMeters: 500,
  coordinates: [],
}

const emptyForm: FormState = {
  name: '',
  description: '',
  customerId: '',
  countryId: '',
  cityId: '',
  color: '#5577E8',
  isActive: true,
  alertMode: 'both',
  assignedVehicleIds: [],
  geometry: emptyGeometry,
}

function refId(value: unknown): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object' && value && '_id' in value) return String((value as { _id: string })._id)
  return ''
}

function refName(value: unknown, fallback = '—'): string {
  if (!value) return fallback
  if (typeof value === 'string') return value
  if (typeof value === 'object' && value) {
    const o = value as Record<string, unknown>
    return String(o.companyName || o.name || o.plateNumber || fallback)
  }
  return fallback
}

function alertModeFromSettings(s?: { enabled?: boolean; onEntry?: boolean; onExit?: boolean }): AlertMode {
  if (!s || s.enabled === false) return 'off'
  if (s.onEntry !== false && s.onExit !== false) return 'both'
  if (s.onEntry !== false) return 'entry'
  if (s.onExit !== false) return 'exit'
  return 'off'
}

function alertSettingsFromMode(mode: AlertMode) {
  if (mode === 'off') return { enabled: false, onEntry: false, onExit: false }
  if (mode === 'entry') return { enabled: true, onEntry: true, onExit: false }
  if (mode === 'exit') return { enabled: true, onEntry: false, onExit: true }
  return { enabled: true, onEntry: true, onExit: true }
}

function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function apiError(err: unknown, fallback: string) {
  if (err && typeof err === 'object' && 'response' in err) {
    return (
      (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? fallback
    )
  }
  return fallback
}

export function GeofencesPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('geofences')
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [customerFilter, setCustomerFilter] = useState('all')
  const [countryFilter, setCountryFilter] = useState('all')
  const [cityFilter, setCityFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<GeofenceRow | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [vehicleSearch, setVehicleSearch] = useState('')
  const [deleting, setDeleting] = useState<GeofenceRow | null>(null)
  const [viewing, setViewing] = useState<GeofenceRow | null>(null)

  const [eventPage, setEventPage] = useState(1)
  const [eventVehicle, setEventVehicle] = useState('all')
  const [eventGeofence, setEventGeofence] = useState('all')
  const [eventType, setEventType] = useState('all')
  const [eventFrom, setEventFrom] = useState('')
  const [eventTo, setEventTo] = useState('')
  const [eventCustomer, setEventCustomer] = useState('all')

  const stats = useQuery({
    queryKey: ['geofence-stats', customerFilter],
    queryFn: () =>
      geofencesApi.stats(
        customerFilter !== 'all' ? { customerId: customerFilter } : undefined,
      ) as Promise<import('@/api/endpoints').GeofenceStats>,
  })

  const list = useQuery({
    queryKey: [
      'geofences',
      q,
      page,
      limit,
      customerFilter,
      countryFilter,
      cityFilter,
      typeFilter,
      statusFilter,
    ],
    queryFn: () =>
      geofencesApi.list({
        q,
        page,
        limit,
        ...(customerFilter !== 'all' ? { customerId: customerFilter } : {}),
        ...(countryFilter !== 'all' ? { countryId: countryFilter } : {}),
        ...(cityFilter !== 'all' ? { cityId: cityFilter } : {}),
        ...(typeFilter !== 'all' ? { type: typeFilter } : {}),
        ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      }),
  })

  const events = useQuery({
    queryKey: [
      'geofence-events',
      eventPage,
      eventVehicle,
      eventGeofence,
      eventType,
      eventFrom,
      eventTo,
      eventCustomer,
    ],
    queryFn: () =>
      geofencesApi.events({
        page: eventPage,
        limit: 20,
        ...(eventVehicle !== 'all' ? { vehicleId: eventVehicle } : {}),
        ...(eventGeofence !== 'all' ? { geofenceId: eventGeofence } : {}),
        ...(eventType !== 'all' ? { eventType } : {}),
        ...(eventFrom ? { from: eventFrom } : {}),
        ...(eventTo ? { to: eventTo } : {}),
        ...(eventCustomer !== 'all' ? { customerId: eventCustomer } : {}),
      }),
    enabled: tab === 'events',
  })

  const detail = useQuery({
    queryKey: ['geofence', viewing?._id],
    queryFn: () => geofencesApi.get(viewing!._id),
    enabled: Boolean(viewing?._id),
  })

  const customers = useQuery({
    queryKey: ['customers-lookup'],
    queryFn: () => customersApi.list({ limit: 200 }),
  })

  const countries = useQuery({
    queryKey: ['countries-lookup'],
    queryFn: () => lookupApi.countries(),
  })

  const cities = useQuery({
    queryKey: ['cities-lookup', form.countryId || countryFilter],
    queryFn: () =>
      lookupApi.cities(
        form.countryId || (countryFilter !== 'all' ? countryFilter : undefined),
      ),
  })

  const vehicles = useQuery({
    queryKey: ['vehicles-for-geofence', form.customerId],
    queryFn: () => vehiclesApi.list({ customerId: form.customerId, limit: 200 }),
    enabled: Boolean(form.customerId),
  })

  const livePositions = useQuery({
    queryKey: ['gps-positions-geofence', form.customerId],
    queryFn: () => gpsApi.positions({ customerId: form.customerId }),
    enabled: Boolean(form.customerId) && open,
  })

  const allVehicles = useQuery({
    queryKey: ['vehicles-all-geofence'],
    queryFn: () => vehiclesApi.list({ limit: 200 }),
  })

  const save = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error('Name is required')
      if (!form.customerId) throw new Error('Customer is required')
      const g = form.geometry
      if (g.type === 'circle' && (!g.center || !g.radiusMeters)) {
        throw new Error('Draw a circle center and set radius')
      }
      if (g.type !== 'circle' && (g.coordinates?.length || 0) < 3) {
        throw new Error('Draw a complete zone boundary')
      }
      const body = {
        name: form.name.trim(),
        description: form.description,
        customerId: form.customerId,
        countryId: form.countryId || null,
        cityId: form.cityId || null,
        type: g.type,
        color: form.color,
        center: g.type === 'circle' ? g.center : null,
        radiusMeters: g.type === 'circle' ? g.radiusMeters : null,
        coordinates: g.type === 'circle' ? [] : g.coordinates,
        assignedVehicleIds: form.assignedVehicleIds,
        alertSettings: alertSettingsFromMode(form.alertMode),
        isActive: form.isActive,
      }
      if (editing?._id) return geofencesApi.update(editing._id, body)
      return geofencesApi.create(body)
    },
    onSuccess: async () => {
      toast.success(editing ? 'Geofence updated' : 'Geofence created')
      setOpen(false)
      setEditing(null)
      setForm(emptyForm)
      await qc.invalidateQueries({ queryKey: ['geofences'] })
      await qc.invalidateQueries({ queryKey: ['geofence-stats'] })
    },
    onError: (err: unknown) => toast.error(apiError(err, err instanceof Error ? err.message : 'Save failed')),
  })

  const remove = useMutation({
    mutationFn: async () => geofencesApi.remove(deleting!._id),
    onSuccess: async () => {
      toast.success('Geofence deleted')
      setDeleting(null)
      await qc.invalidateQueries({ queryKey: ['geofences'] })
      await qc.invalidateQueries({ queryKey: ['geofence-stats'] })
    },
    onError: (err: unknown) => toast.error(apiError(err, 'Delete failed')),
  })

  const toggleStatus = useMutation({
    mutationFn: async (row: GeofenceRow) => geofencesApi.setStatus(row._id, row.isActive === false),
    onSuccess: async () => {
      toast.success('Status updated')
      await qc.invalidateQueries({ queryKey: ['geofences'] })
      await qc.invalidateQueries({ queryKey: ['geofence-stats'] })
    },
    onError: (err: unknown) => toast.error(apiError(err, 'Could not update status')),
  })

  const customerOptions = (customers.data?.items ?? []) as Customer[]
  const countryOptions = (Array.isArray(countries.data) ? countries.data : []) as Array<{
    _id: string
    name: string
  }>
  const cityOptions = (Array.isArray(cities.data) ? cities.data : []) as Array<{
    _id: string
    name: string
    countryId?: string
  }>
  const vehicleOptions = (vehicles.data?.items ?? []) as Vehicle[]
  const filteredVehicles = vehicleOptions.filter((v) => {
    const s = vehicleSearch.trim().toLowerCase()
    if (!s) return true
    return v.name.toLowerCase().includes(s) || v.plateNumber.toLowerCase().includes(s)
  })

  const vehicleMarkers = useMemo(() => {
    const items = livePositions.data?.items ?? []
    const assigned = new Set(form.assignedVehicleIds)
    return items
      .filter((i) => assigned.has(i.vehicle._id) && i.position)
      .map((i) => ({
        id: i.vehicle._id,
        name: i.vehicle.name,
        lat: i.position!.latitude,
        lng: i.position!.longitude,
      }))
  }, [livePositions.data, form.assignedVehicleIds])

  const selectedCountryName = countryOptions.find((c) => c._id === form.countryId)?.name ?? ''
  const selectedCityName = cityOptions.find((c) => c._id === form.cityId)?.name ?? ''
  const mapLocationQuery = useMemo(() => {
    if (selectedCityName && selectedCountryName) return `${selectedCityName}, ${selectedCountryName}`
    if (selectedCityName) return selectedCityName
    if (selectedCountryName) return selectedCountryName
    return null
  }, [selectedCityName, selectedCountryName])
  const mapLocationZoom = selectedCityName ? 13 : selectedCountryName ? 6 : 12

  const columns = useMemo(
    () => [
      { key: '#', header: '#', cell: (r: GeofenceRow) => r.rowNumber ?? '—' },
      {
        key: 'name',
        header: 'Geofence Name',
        cell: (r: GeofenceRow) => (
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color || '#5577E8' }} />
            <span className="font-medium">{r.name}</span>
          </div>
        ),
      },
      {
        key: 'type',
        header: 'Zone Type',
        cell: (r: GeofenceRow) => <Badge variant="secondary">{r.type}</Badge>,
      },
      { key: 'customer', header: 'Customer', cell: (r: GeofenceRow) => refName(r.customerId) },
      { key: 'country', header: 'Country', cell: (r: GeofenceRow) => refName(r.countryId) },
      { key: 'city', header: 'City', cell: (r: GeofenceRow) => refName(r.cityId) },
      {
        key: 'vehicles',
        header: 'Assigned Vehicles',
        cell: (r: GeofenceRow) => r.assignedVehicleCount ?? (r.assignedVehicleIds?.length || 0),
      },
      { key: 'alerts', header: 'Alert Rules', cell: (r: GeofenceRow) => r.alertRules || '—' },
      { key: 'area', header: 'Area / Radius', cell: (r: GeofenceRow) => r.areaLabel || '—' },
      {
        key: 'status',
        header: 'Status',
        cell: (r: GeofenceRow) => (
          <Badge variant={r.isActive === false ? 'danger' : 'success'}>
            {r.isActive === false ? 'Inactive' : 'Active'}
          </Badge>
        ),
      },
      { key: 'created', header: 'Created Date', cell: (r: GeofenceRow) => formatDate(r.createdAt) },
    ],
    [],
  )

  const eventColumns = useMemo(
    () => [
      { key: '#', header: '#', cell: (r: GeofenceEventRow) => r.rowNumber ?? '—' },
      { key: 'vehicle', header: 'Vehicle', cell: (r: GeofenceEventRow) => refName(r.vehicleId) },
      { key: 'geofence', header: 'Geofence', cell: (r: GeofenceEventRow) => refName(r.geofenceId) },
      {
        key: 'type',
        header: 'Event Type',
        cell: (r: GeofenceEventRow) => (
          <Badge variant={r.eventType === 'entry' ? 'success' : 'warning'}>
            {r.eventType === 'entry' ? 'Entry' : 'Exit'}
          </Badge>
        ),
      },
      { key: 'date', header: 'Event Date', cell: (r: GeofenceEventRow) => formatDate(r.recordedAt) },
      {
        key: 'speed',
        header: 'Speed',
        cell: (r: GeofenceEventRow) => `${formatNumber(r.speedKmh ?? 0, 0)} km/h`,
      },
      {
        key: 'lat',
        header: 'Latitude',
        cell: (r: GeofenceEventRow) => r.latitude?.toFixed(5) ?? '—',
      },
      {
        key: 'lng',
        header: 'Longitude',
        cell: (r: GeofenceEventRow) => r.longitude?.toFixed(5) ?? '—',
      },
    ],
    [],
  )

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setVehicleSearch('')
    setOpen(true)
  }

  function openEdit(row: GeofenceRow) {
    setEditing(row)
    setForm({
      name: row.name,
      description: row.description || '',
      customerId: refId(row.customerId),
      countryId: refId(row.countryId),
      cityId: refId(row.cityId),
      color: row.color || '#5577E8',
      isActive: row.isActive !== false,
      alertMode: alertModeFromSettings(row.alertSettings),
      assignedVehicleIds: (row.assignedVehicleIds || []).map((v) => refId(v)).filter(Boolean),
      geometry: {
        type: row.type,
        center: row.center || null,
        radiusMeters: row.radiusMeters ?? 500,
        coordinates: row.coordinates || [],
      },
    })
    setVehicleSearch('')
    setOpen(true)
  }

  function exportRows(format: 'csv' | 'pdf') {
    const rows = list.data?.items ?? []
    const header = [
      '#',
      'Name',
      'Type',
      'Customer',
      'Country',
      'City',
      'Vehicles',
      'Alerts',
      'Area',
      'Status',
      'Created',
    ]
    const lines = rows.map((r) =>
      [
        r.rowNumber,
        r.name,
        r.type,
        refName(r.customerId),
        refName(r.countryId),
        refName(r.cityId),
        r.assignedVehicleCount ?? 0,
        r.alertRules,
        r.areaLabel,
        r.isActive === false ? 'Inactive' : 'Active',
        r.createdAt || '',
      ]
        .map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`)
        .join(','),
    )
    const csv = [header.join(','), ...lines].join('\n')
    if (format === 'csv') {
      downloadText(`geofences-${Date.now()}.csv`, csv, 'text/csv;charset=utf-8')
      return
    }
    downloadText(
      `geofences-${Date.now()}.pdf.txt`,
      `TrackSense Geofences Export\n\n${csv}`,
      'application/pdf',
    )
    toast.message('PDF export saved as text report (printable)')
  }

  const kpis = [
    { label: 'Total Geofences', value: stats.data?.totalGeofences ?? 0, icon: MapPinned },
    { label: 'Active Geofences', value: stats.data?.activeGeofences ?? 0, icon: ShieldCheck },
    { label: 'Inactive Geofences', value: stats.data?.inactiveGeofences ?? 0, icon: ShieldOff },
    { label: 'Vehicles Assigned', value: stats.data?.vehiclesAssigned ?? 0, icon: Truck },
    { label: 'Entry Alerts Today', value: stats.data?.entryAlertsToday ?? 0, icon: LogIn },
    { label: 'Exit Alerts Today', value: stats.data?.exitAlertsToday ?? 0, icon: LogOut },
  ]

  const detailData = (detail.data || viewing) as GeofenceRow | null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Geofences"
        description="Create and monitor geographic zones to control vehicle entry and exit activities."
        breadcrumbs={[{ label: 'Tracking' }, { label: 'Geofences' }]}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="border-[var(--border)]">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs text-[var(--muted)]">{label}</p>
                <p className="mt-1 font-display text-2xl font-bold text-[#5577E8]">{formatNumber(value)}</p>
              </div>
              <Icon className="h-6 w-6 text-[#5577E8]/40" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="geofences">Geofences</TabsTrigger>
          <TabsTrigger value="events">Event History</TabsTrigger>
        </TabsList>

        <TabsContent value="geofences" className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Select
              value={customerFilter}
              onValueChange={(v) => {
                setCustomerFilter(v)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Customer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All customers</SelectItem>
                {customerOptions.map((c) => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.companyName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={countryFilter}
              onValueChange={(v) => {
                setCountryFilter(v)
                setCityFilter('all')
                setPage(1)
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All countries</SelectItem>
                {countryOptions.map((c) => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={cityFilter}
              onValueChange={(v) => {
                setCityFilter(v)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="City" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All cities</SelectItem>
                {cityOptions.map((c) => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={typeFilter}
              onValueChange={(v) => {
                setTypeFilter(v)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Zone type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="circle">Circle</SelectItem>
                <SelectItem value="polygon">Polygon</SelectItem>
                <SelectItem value="rectangle">Rectangle</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DataTable
            columns={columns}
            rows={list.data?.items ?? []}
            loading={list.isLoading}
            error={list.isError}
            onRetry={() => void list.refetch()}
            search={q}
            onSearchChange={(v) => {
              setQ(v)
              setPage(1)
            }}
            onRefresh={() => void list.refetch()}
            onAdd={openCreate}
            addLabel="Create Geofence"
            onExportExcel={() => exportRows('csv')}
            onExportPdf={() => exportRows('pdf')}
            page={page}
            limit={limit}
            total={list.data?.total ?? 0}
            onPageChange={setPage}
            onLimitChange={(n) => {
              setLimit(n)
              setPage(1)
            }}
            emptyTitle="No geofences yet"
            emptyDescription="Create a geographic zone to start monitoring entry and exit."
            actions={[
              { label: 'View', onClick: (r) => setViewing(r) },
              { label: 'Edit', onClick: openEdit },
              {
                label: 'Activate',
                onClick: (r) => {
                  if (r.isActive !== false) return
                  void toggleStatus.mutateAsync(r)
                },
              },
              {
                label: 'Deactivate',
                onClick: (r) => {
                  if (r.isActive === false) return
                  void toggleStatus.mutateAsync(r)
                },
              },
              { label: 'Delete', onClick: (r) => setDeleting(r), destructive: true },
            ]}
          />
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Input
              type="date"
              className="w-[160px]"
              value={eventFrom}
              onChange={(e) => {
                setEventFrom(e.target.value)
                setEventPage(1)
              }}
            />
            <Input
              type="date"
              className="w-[160px]"
              value={eventTo}
              onChange={(e) => {
                setEventTo(e.target.value)
                setEventPage(1)
              }}
            />
            <Select value={eventCustomer} onValueChange={(v) => { setEventCustomer(v); setEventPage(1) }}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Customer" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All customers</SelectItem>
                {customerOptions.map((c) => (
                  <SelectItem key={c._id} value={c._id}>{c.companyName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={eventGeofence} onValueChange={(v) => { setEventGeofence(v); setEventPage(1) }}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Geofence" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All geofences</SelectItem>
                {(list.data?.items ?? []).map((g) => (
                  <SelectItem key={g._id} value={g._id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={eventVehicle} onValueChange={(v) => { setEventVehicle(v); setEventPage(1) }}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Vehicle" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All vehicles</SelectItem>
                {((allVehicles.data?.items ?? []) as Vehicle[]).map((v) => (
                  <SelectItem key={v._id} value={v._id}>{v.name} ({v.plateNumber})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={eventType} onValueChange={(v) => { setEventType(v); setEventPage(1) }}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Entry/Exit" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All events</SelectItem>
                <SelectItem value="entry">Entry</SelectItem>
                <SelectItem value="exit">Exit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DataTable
            columns={eventColumns}
            rows={events.data?.items ?? []}
            loading={events.isLoading}
            error={events.isError}
            onRetry={() => void events.refetch()}
            onRefresh={() => void events.refetch()}
            page={eventPage}
            limit={20}
            total={events.data?.total ?? 0}
            onPageChange={setEventPage}
            emptyTitle="No geofence events"
            emptyDescription="Entry and exit events appear when assigned vehicles cross zone boundaries."
          />
        </TabsContent>
      </Tabs>

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={editing ? 'Edit Geofence' : 'Create Geofence'}
        description="Draw a zone on the map and configure alert rules for assigned vehicles."
        size="full"
        loading={save.isPending}
        submitLabel={editing ? 'Save changes' : 'Create geofence'}
        onSubmit={async () => {
          await save.mutateAsync()
        }}
      >
        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Geofence Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Warehouse perimeter"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select
                value={form.customerId || undefined}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, customerId: v, assignedVehicleIds: [] }))
                }
              >
                <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                <SelectContent>
                  {customerOptions.map((c) => (
                    <SelectItem key={c._id} value={c._id}>{c.companyName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Country</Label>
                <Select
                  value={form.countryId || undefined}
                  onValueChange={(v) => setForm((f) => ({ ...f, countryId: v, cityId: '' }))}
                >
                  <SelectTrigger><SelectValue placeholder="Country" /></SelectTrigger>
                  <SelectContent>
                    {countryOptions.map((c) => (
                      <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Select
                  value={form.cityId || undefined}
                  onValueChange={(v) => setForm((f) => ({ ...f, cityId: v }))}
                >
                  <SelectTrigger><SelectValue placeholder="City" /></SelectTrigger>
                  <SelectContent>
                    {cityOptions.map((c) => (
                      <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {mapLocationQuery ? (
              <p className="text-xs text-[var(--muted)]">
                Map will jump to <span className="font-medium text-[var(--foreground)]">{mapLocationQuery}</span>
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Color</Label>
                <Input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                  className="h-11 p-1"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex h-11 items-center gap-2 rounded-xl border border-[var(--border)] px-3">
                  <Switch
                    checked={form.isActive}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                  />
                  <span className="text-sm">{form.isActive ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Alert Rules</Label>
              <Select
                value={form.alertMode}
                onValueChange={(v) => setForm((f) => ({ ...f, alertMode: v as AlertMode }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Entry & Exit</SelectItem>
                  <SelectItem value="entry">Entry only</SelectItem>
                  <SelectItem value="exit">Exit only</SelectItem>
                  <SelectItem value="off">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Assigned Vehicles</Label>
                <span className="text-xs text-[var(--muted)]">{form.assignedVehicleIds.length} selected</span>
              </div>
              {!form.customerId ? (
                <p className="text-xs text-[var(--muted)]">Select a customer to load vehicles.</p>
              ) : (
                <>
                  <Input
                    placeholder="Search vehicles…"
                    value={vehicleSearch}
                    onChange={(e) => setVehicleSearch(e.target.value)}
                  />
                  <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-[var(--border)] p-2">
                    {filteredVehicles.length === 0 ? (
                      <p className="p-2 text-xs text-[var(--muted)]">No vehicles for this customer.</p>
                    ) : (
                      filteredVehicles.map((v) => {
                        const checked = form.assignedVehicleIds.includes(v._id)
                        return (
                          <label key={v._id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--primary-soft)]/40">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(c) =>
                                setForm((f) => ({
                                  ...f,
                                  assignedVehicleIds: c
                                    ? [...f.assignedVehicleIds, v._id]
                                    : f.assignedVehicleIds.filter((id) => id !== v._id),
                                }))
                              }
                            />
                            <span className="text-sm">
                              {v.name} <span className="text-[var(--muted)]">({v.plateNumber})</span>
                            </span>
                          </label>
                        )
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
              <CircleDot className="h-4 w-4 text-[#5577E8]" />
              Zone drawing workspace
            </div>
            <GeofenceDrawMap
              open={open}
              value={form.geometry}
              color={form.color}
              height={520}
              vehicleMarkers={vehicleMarkers}
              locationQuery={mapLocationQuery}
              locationZoom={mapLocationZoom}
              relocateOnLocationChange={!editing}
              onChange={(geometry) => setForm((f) => ({ ...f, geometry }))}
            />
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(v) => !v && setDeleting(null)}
        title="Delete geofence?"
        description={deleting ? `Permanently delete "${deleting.name}" and its event history.` : undefined}
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
        onConfirm={async () => {
          await remove.mutateAsync()
        }}
      />

      <FormDialog
        open={Boolean(viewing)}
        onOpenChange={(v) => {
          if (!v) setViewing(null)
        }}
        title={detailData?.name || 'Geofence details'}
        description="Zone preview, assignments, and recent entry/exit activity."
        size="full"
        submitLabel="Close"
        loading={false}
        onSubmit={() => setViewing(null)}
      >
        {detail.isLoading ? (
          <p className="text-sm text-[var(--muted)]">Loading…</p>
        ) : detailData ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <GeofenceDrawMap
              open={Boolean(viewing)}
              interactive={false}
              height={420}
              color={detailData.color || '#5577E8'}
              value={{
                type: detailData.type,
                center: detailData.center || null,
                radiusMeters: detailData.radiusMeters ?? null,
                coordinates: detailData.coordinates || [],
              }}
            />
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-[var(--muted)]">Zone type</p>
                  <p className="font-medium capitalize">{detailData.type}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted)]">Status</p>
                  <Badge variant={detailData.isActive === false ? 'danger' : 'success'}>
                    {detailData.isActive === false ? 'Inactive' : 'Active'}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted)]">Customer</p>
                  <p className="font-medium">{refName(detailData.customerId)}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted)]">Area / Radius</p>
                  <p className="font-medium">{detailData.areaLabel || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted)]">Alerts</p>
                  <p className="font-medium">
                    {detailData.alertRules ||
                      alertModeFromSettings(detailData.alertSettings)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted)]">Created</p>
                  <p className="font-medium">{formatDate(detailData.createdAt)}</p>
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs text-[var(--muted)]">Assigned vehicles</p>
                <div className="space-y-1">
                  {(detailData.assignedVehicleIds || []).length === 0 ? (
                    <p className="text-[var(--muted)]">None</p>
                  ) : (
                    (detailData.assignedVehicleIds || []).map((v) => (
                      <p key={refId(v)} className="rounded-lg bg-[var(--primary-soft)]/40 px-2 py-1">
                        {refName(v)}
                      </p>
                    ))
                  )}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs text-[var(--muted)]">Boundary coordinates</p>
                <pre className="max-h-28 overflow-auto rounded-xl bg-[var(--background)] p-2 text-[11px]">
                  {detailData.type === 'circle'
                    ? JSON.stringify(detailData.center, null, 2)
                    : JSON.stringify(detailData.coordinates, null, 2)}
                </pre>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="mb-1 text-xs font-medium text-[var(--muted)]">Recent entries</p>
                  {(detailData.recentEntries || []).slice(0, 5).map((e) => (
                    <p key={e._id} className="text-xs">
                      {refName(e.vehicleId)} · {formatDate(e.recordedAt)}
                    </p>
                  ))}
                  {(detailData.recentEntries || []).length === 0 ? (
                    <p className="text-xs text-[var(--muted)]">None</p>
                  ) : null}
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-[var(--muted)]">Recent exits</p>
                  {(detailData.recentExits || []).slice(0, 5).map((e) => (
                    <p key={e._id} className="text-xs">
                      {refName(e.vehicleId)} · {formatDate(e.recordedAt)}
                    </p>
                  ))}
                  {(detailData.recentExits || []).length === 0 ? (
                    <p className="text-xs text-[var(--muted)]">None</p>
                  ) : null}
                </div>
              </div>
              <Button variant="outline" onClick={() => openEdit(detailData)}>
                Edit geofence
              </Button>
            </div>
          </div>
        ) : null}
      </FormDialog>
    </div>
  )
}
