import { useEffect, useMemo, useRef, useState } from 'react'
import { Circle, MapContainer, Marker, Polygon, Rectangle, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { MapLayersControl } from '@/components/map/MapLayersControl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getMapTileById, readStoredMapTypeId, storeMapTypeId } from '@/lib/mapTiles'
import { cn } from '@/lib/utils'

export type DrawMode = 'circle' | 'polygon' | 'rectangle' | 'view'
export type GeofenceGeometryValue = {
  type: 'circle' | 'polygon' | 'rectangle'
  center: { lat: number; lng: number } | null
  radiusMeters: number | null
  /** GeoJSON [lng, lat] ring */
  coordinates: number[][]
}

const pinIcon = L.divIcon({
  className: '',
  html: `<div style="width:14px;height:14px;border-radius:999px;background:#5577E8;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.35)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

function InvalidateSize({ open }: { open?: boolean }) {
  const map = useMap()
  useEffect(() => {
    const t = window.setTimeout(() => map.invalidateSize(), 120)
    return () => window.clearTimeout(t)
  }, [map, open])
  return null
}

function FitToGeometry({ value }: { value: GeofenceGeometryValue }) {
  const map = useMap()
  useEffect(() => {
    if (value.type === 'circle' && value.center && value.radiusMeters) {
      const bounds = L.latLng(value.center.lat, value.center.lng).toBounds(value.radiusMeters * 2.2)
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 })
      return
    }
    if (value.coordinates?.length) {
      const latlngs = value.coordinates.map((c) => L.latLng(c[1], c[0]))
      map.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40], maxZoom: 16 })
    }
  }, [map, value.type, value.center?.lat, value.center?.lng, value.radiusMeters, value.coordinates])
  return null
}

type GeoHit = { lat: number; lng: number }

const geocodeCache = new Map<string, GeoHit | null>()

async function geocodePlace(query: string): Promise<GeoHit | null> {
  const q = query.trim()
  if (q.length < 2) return null
  const key = q.toLowerCase()
  if (geocodeCache.has(key)) return geocodeCache.get(key) ?? null
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'TrackSenseAdmin/1.0 (geofence-editor)',
      },
    })
    const data = (await res.json()) as Array<{ lat: string; lon: string }>
    const hit = data[0]
      ? { lat: Number(data[0].lat), lng: Number(data[0].lon) }
      : null
    if (hit && (!Number.isFinite(hit.lat) || !Number.isFinite(hit.lng))) {
      geocodeCache.set(key, null)
      return null
    }
    geocodeCache.set(key, hit)
    return hit
  } catch {
    geocodeCache.set(key, null)
    return null
  }
}

function SearchFlyTo({ query }: { query: string }) {
  const map = useMap()
  useEffect(() => {
    const q = query.trim()
    if (q.length < 3) return
    const handle = window.setTimeout(async () => {
      const hit = await geocodePlace(q)
      if (hit) map.setView([hit.lat, hit.lng], 14)
    }, 500)
    return () => window.clearTimeout(handle)
  }, [map, query])
  return null
}

/** Fly map when country/city selection changes; optionally re-center circle. */
function LocationFlyTo({
  query,
  zoom = 12,
  relocateCircle,
  value,
  onChange,
}: {
  query?: string | null
  zoom?: number
  relocateCircle?: boolean
  value: GeofenceGeometryValue
  onChange?: (next: GeofenceGeometryValue) => void
}) {
  const map = useMap()
  const lastQuery = useRef<string>('')

  useEffect(() => {
    const q = (query || '').trim()
    if (q.length < 2 || q === lastQuery.current) return
    let cancelled = false
    const handle = window.setTimeout(async () => {
      const hit = await geocodePlace(q)
      if (cancelled || !hit) return
      lastQuery.current = q
      map.setView([hit.lat, hit.lng], zoom)
      if (relocateCircle && onChange) {
        const radius = value.radiusMeters && value.radiusMeters > 0 ? value.radiusMeters : 500
        if (value.type === 'circle' || !value.coordinates?.length) {
          onChange({
            type: 'circle',
            center: { lat: hit.lat, lng: hit.lng },
            radiusMeters: radius,
            coordinates: [],
          })
        }
      }
    }, 250)
    return () => {
      cancelled = true
      window.clearTimeout(handle)
    }
  }, [map, query, zoom, relocateCircle, onChange, value.type, value.radiusMeters, value.coordinates?.length])

  return null
}

function DrawHandlers({
  mode,
  value,
  onChange,
  radiusMeters,
}: {
  mode: DrawMode
  value: GeofenceGeometryValue
  onChange: (next: GeofenceGeometryValue) => void
  radiusMeters: number
}) {
  const rectStart = useRef<L.LatLng | null>(null)

  useMapEvents({
    click(e) {
      if (mode === 'view') return
      if (mode === 'circle') {
        onChange({
          type: 'circle',
          center: { lat: e.latlng.lat, lng: e.latlng.lng },
          radiusMeters,
          coordinates: [],
        })
        return
      }
      if (mode === 'polygon') {
        const nextPts = [...(value.type === 'polygon' ? value.coordinates : []), [e.latlng.lng, e.latlng.lat]]
        onChange({
          type: 'polygon',
          center: null,
          radiusMeters: null,
          coordinates: nextPts,
        })
        return
      }
      if (mode === 'rectangle') {
        if (!rectStart.current) {
          rectStart.current = e.latlng
          return
        }
        const a = rectStart.current
        const b = e.latlng
        const west = Math.min(a.lng, b.lng)
        const east = Math.max(a.lng, b.lng)
        const south = Math.min(a.lat, b.lat)
        const north = Math.max(a.lat, b.lat)
        const ring = [
          [west, south],
          [east, south],
          [east, north],
          [west, north],
          [west, south],
        ]
        rectStart.current = null
        onChange({
          type: 'rectangle',
          center: null,
          radiusMeters: null,
          coordinates: ring,
        })
      }
    },
  })

  return null
}

function areaLabel(value: GeofenceGeometryValue) {
  if (value.type === 'circle' && value.radiusMeters != null) {
    return value.radiusMeters >= 1000
      ? `${(value.radiusMeters / 1000).toFixed(2)} km radius`
      : `${Math.round(value.radiusMeters)} m radius`
  }
  if (!value.coordinates?.length) return 'No shape'
  return `${value.coordinates.length} vertices`
}

export function GeofenceDrawMap({
  value,
  onChange,
  color = '#5577E8',
  height = 420,
  interactive = true,
  open,
  vehicleMarkers = [],
  locationQuery,
  locationZoom = 12,
  relocateOnLocationChange = false,
}: {
  value: GeofenceGeometryValue
  onChange?: (next: GeofenceGeometryValue) => void
  color?: string
  height?: number | string
  interactive?: boolean
  open?: boolean
  vehicleMarkers?: Array<{ id: string; name: string; lat: number; lng: number }>
  /** e.g. "Jigjiga, Ethiopia" — map flies here when country/city changes */
  locationQuery?: string | null
  locationZoom?: number
  /** When true, move circle center to the new city/country */
  relocateOnLocationChange?: boolean
}) {
  const [mode, setMode] = useState<DrawMode>(interactive ? value.type : 'view')
  const [mapTypeId, setMapTypeId] = useState(readStoredMapTypeId)
  const tile = getMapTileById(mapTypeId)
  const [search, setSearch] = useState('')
  const [radiusInput, setRadiusInput] = useState(String(value.radiusMeters ?? 500))
  const [radiusUnit, setRadiusUnit] = useState<'m' | 'km'>('m')

  useEffect(() => {
    if (!interactive) setMode('view')
  }, [interactive])

  useEffect(() => {
    if (value.radiusMeters != null) {
      setRadiusInput(radiusUnit === 'km' ? String(value.radiusMeters / 1000) : String(value.radiusMeters))
    }
  }, [value.radiusMeters, radiusUnit])

  const radiusMeters = useMemo(() => {
    const n = Number(radiusInput)
    if (!Number.isFinite(n) || n <= 0) return value.radiusMeters ?? 500
    return radiusUnit === 'km' ? n * 1000 : n
  }, [radiusInput, radiusUnit, value.radiusMeters])

  const polygonLatLngs = useMemo(
    () => (value.coordinates || []).map((c) => [c[1], c[0]] as [number, number]),
    [value.coordinates],
  )

  const rectBounds = useMemo(() => {
    if (value.type !== 'rectangle' || !value.coordinates?.length) return null
    const lats = value.coordinates.map((c) => c[1])
    const lngs = value.coordinates.map((c) => c[0])
    return [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
    ] as [[number, number], [number, number]]
  }, [value])

  function applyRadius() {
    if (!onChange || !value.center) return
    onChange({ ...value, type: 'circle', radiusMeters })
  }

  function clearShape() {
    onChange?.({
      type: mode === 'view' ? value.type : (mode as GeofenceGeometryValue['type']),
      center: null,
      radiusMeters: null,
      coordinates: [],
    })
  }

  function closePolygon() {
    if (!onChange || value.coordinates.length < 3) return
    const first = value.coordinates[0]
    const last = value.coordinates[value.coordinates.length - 1]
    const closed =
      first[0] === last[0] && first[1] === last[1]
        ? value.coordinates
        : [...value.coordinates, [first[0], first[1]]]
    onChange({ ...value, type: 'polygon', coordinates: closed })
  }

  function removeLastVertex() {
    if (!onChange || !value.coordinates.length) return
    onChange({ ...value, coordinates: value.coordinates.slice(0, -1) })
  }

  return (
    <div className="space-y-3">
      {interactive ? (
        <div className="flex flex-wrap items-center gap-2">
          {(['circle', 'polygon', 'rectangle'] as const).map((m) => (
            <Button
              key={m}
              type="button"
              size="sm"
              variant={mode === m ? 'default' : 'outline'}
              onClick={() => {
                setMode(m)
                onChange?.({
                  type: m,
                  center: m === 'circle' ? value.center : null,
                  radiusMeters: m === 'circle' ? radiusMeters : null,
                  coordinates: m === 'circle' ? [] : value.type === m ? value.coordinates : [],
                })
              }}
            >
              {m === 'circle' ? 'Circle' : m === 'polygon' ? 'Polygon' : 'Rectangle'}
            </Button>
          ))}
          <Button type="button" size="sm" variant="outline" onClick={clearShape}>
            Clear
          </Button>
          {mode === 'polygon' ? (
            <>
              <Button type="button" size="sm" variant="outline" onClick={removeLastVertex}>
                Undo point
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={closePolygon}>
                Close polygon
              </Button>
            </>
          ) : null}
          <div className="ml-auto flex min-w-[220px] flex-1 items-center gap-2">
            <Input
              placeholder="Search location…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9"
            />
          </div>
        </div>
      ) : null}

      {interactive && mode === 'circle' ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <p className="text-xs text-[var(--muted)]">Radius</p>
            <Input
              className="h-9 w-28"
              value={radiusInput}
              onChange={(e) => setRadiusInput(e.target.value)}
              onBlur={applyRadius}
            />
          </div>
          <div className="flex gap-1">
            <Button
              type="button"
              size="sm"
              variant={radiusUnit === 'm' ? 'default' : 'outline'}
              onClick={() => setRadiusUnit('m')}
            >
              m
            </Button>
            <Button
              type="button"
              size="sm"
              variant={radiusUnit === 'km' ? 'default' : 'outline'}
              onClick={() => setRadiusUnit('km')}
            >
              km
            </Button>
          </div>
          <Button type="button" size="sm" variant="outline" onClick={applyRadius}>
            Apply radius
          </Button>
          <p className="text-xs text-[var(--muted)]">Click the map to set the circle center.</p>
        </div>
      ) : null}

      {interactive && mode === 'polygon' ? (
        <p className="text-xs text-[var(--muted)]">Click to add vertices. Use Close polygon when finished.</p>
      ) : null}
      {interactive && mode === 'rectangle' ? (
        <p className="text-xs text-[var(--muted)]">Click two opposite corners to draw the rectangle.</p>
      ) : null}

      <div
        className={cn('relative overflow-hidden rounded-2xl border border-[var(--border)]')}
        style={{ height }}
      >
        <MapLayersControl
          value={mapTypeId}
          onChange={(id) => {
            setMapTypeId(id)
            storeMapTypeId(id)
          }}
        />
        <MapContainer
          center={
            value.center
              ? [value.center.lat, value.center.lng]
              : polygonLatLngs[0] || ([24.7136, 46.6753] as [number, number])
          }
          zoom={12}
          className="h-full w-full"
          scrollWheelZoom
        >
          <TileLayer
            key={tile.id}
            attribution={tile.attribution}
            url={tile.url}
            maxZoom={tile.maxZoom}
            {...(tile.subdomains ? { subdomains: tile.subdomains } : {})}
          />
          <InvalidateSize open={open} />
          <FitToGeometry value={value} />
          {interactive ? <SearchFlyTo query={search} /> : null}
          {locationQuery ? (
            <LocationFlyTo
              query={locationQuery}
              zoom={locationZoom}
              relocateCircle={Boolean(interactive && relocateOnLocationChange && onChange)}
              value={value}
              onChange={onChange}
            />
          ) : null}
          {interactive && onChange ? (
            <DrawHandlers mode={mode} value={value} onChange={onChange} radiusMeters={radiusMeters} />
          ) : null}

          {value.type === 'circle' && value.center && value.radiusMeters ? (
            <>
              <Circle
                center={[value.center.lat, value.center.lng]}
                radius={value.radiusMeters}
                pathOptions={{ color, fillColor: color, fillOpacity: 0.2, weight: 2 }}
              />
              <Marker position={[value.center.lat, value.center.lng]} icon={pinIcon} />
            </>
          ) : null}

          {value.type === 'polygon' && polygonLatLngs.length >= 2 ? (
            <Polygon
              positions={polygonLatLngs}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.2, weight: 2 }}
            />
          ) : null}

          {value.type === 'rectangle' && rectBounds ? (
            <Rectangle
              bounds={rectBounds}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.2, weight: 2 }}
            />
          ) : null}

          {vehicleMarkers.map((v) => (
            <Marker key={v.id} position={[v.lat, v.lng]} icon={pinIcon}>
              {/* Popup via title attribute on icon is limited; keep markers lightweight */}
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-[var(--muted)]">
        <span>Area: {areaLabel(value)}</span>
        {value.center ? (
          <span>
            Center: {value.center.lat.toFixed(5)}, {value.center.lng.toFixed(5)}
          </span>
        ) : null}
        {value.coordinates?.length ? <span>Points: {value.coordinates.length}</span> : null}
      </div>
    </div>
  )
}
