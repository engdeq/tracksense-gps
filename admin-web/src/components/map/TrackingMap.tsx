import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { LiveTrackingItem, MotionStatus, Vehicle } from '@/types/api'
import { MapLayersControl } from '@/components/map/MapLayersControl'
import { getMapTileById, readStoredMapTypeId, storeMapTypeId } from '@/lib/mapTiles'
import { MOTION_MARKER_COLOR, MOTION_STATUS_LABEL } from '@/lib/status'
import { resolveMediaUrl } from '@/lib/media'
import { cn, formatDate, formatNumber } from '@/lib/utils'

function vehicleIconUrl(vehicle: Vehicle): string {
  const icon = vehicle.iconId
  if (icon && typeof icon === 'object' && icon.imageUrl) {
    return resolveMediaUrl(icon.imageUrl)
  }
  return ''
}

function colorDotIcon(color: string) {
  const svg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="11" fill="${color}" stroke="white" stroke-width="3"/></svg>`,
  )
  return L.icon({
    iconUrl: `data:image/svg+xml,${svg}`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -10],
  })
}

/** Vehicle image marker with motion-status ring */
function vehicleImageIcon(imageUrl: string, color: string, selected: boolean) {
  const size = selected ? 52 : 44
  const ring = selected ? 4 : 3
  return L.divIcon({
    className: 'ts-vehicle-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:9999px;
      border:${ring}px solid ${color};background:#fff;
      box-shadow:0 2px 8px rgba(15,23,42,.28);
      display:flex;align-items:center;justify-content:center;
      overflow:hidden;box-sizing:border-box;
    "><img src="${imageUrl.replace(/"/g, '&quot;')}" alt="" style="width:78%;height:78%;object-fit:contain;" /></div>`,
  })
}

function markerIconFor(item: LiveTrackingItem, selected: boolean) {
  const status = (item.vehicle.motionStatus ?? 'offline') as MotionStatus
  const color = MOTION_MARKER_COLOR[status] ?? '#5577E8'
  const url = vehicleIconUrl(item.vehicle)
  if (url) return vehicleImageIcon(url, color, selected)
  return colorDotIcon(color)
}

function FitBounds({
  items,
  focusQuery,
}: {
  items: LiveTrackingItem[]
  focusQuery?: string | null
}) {
  const map = useMap()
  const points = useMemo(
    () =>
      items
        .filter((i) => i.position?.latitude != null && i.position?.longitude != null)
        .map((i) => [i.position!.latitude, i.position!.longitude] as [number, number]),
    [items],
  )

  useEffect(() => {
    if (points.length === 1) {
      map.setView(points[0], 14)
      return
    }
    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 15 })
      return
    }

    const q = focusQuery?.trim()
    if (!q || q.length < 2) return
    let cancelled = false
    const t = window.setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`
        const res = await fetch(url, {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'TrackSenseAdmin/1.0 (live-tracking)',
          },
        })
        const data = (await res.json()) as Array<{ lat: string; lon: string }>
        if (cancelled || !data[0]) return
        map.setView([Number(data[0].lat), Number(data[0].lon)], 11)
      } catch {
        /* ignore geocode failures */
      }
    }, 200)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [map, points, focusQuery])

  return null
}

export function TrackingMap({
  items,
  height = 420,
  selectedId,
  onSelect,
  center = [24.7136, 46.6753],
  zoom = 6,
  className,
  focusQuery,
}: {
  items: LiveTrackingItem[]
  height?: number | string
  selectedId?: string | null
  onSelect?: (id: string) => void
  center?: [number, number]
  zoom?: number
  className?: string
  /** When no GPS markers, fly the map to this place (e.g. "Ethiopia" / "Jigjiga, Ethiopia") */
  focusQuery?: string | null
}) {
  const markers = items.filter((i) => i.position?.latitude != null && i.position?.longitude != null)
  const [mapTypeId, setMapTypeId] = useState(readStoredMapTypeId)
  const tile = getMapTileById(mapTypeId)

  return (
    <div className={cn('relative', className)} style={{ height } as CSSProperties}>
      <MapLayersControl
        value={mapTypeId}
        onChange={(id) => {
          setMapTypeId(id)
          storeMapTypeId(id)
        }}
      />
      <MapContainer center={center} zoom={zoom} className="h-full w-full rounded-2xl" scrollWheelZoom>
        <TileLayer
          key={tile.id}
          attribution={tile.attribution}
          url={tile.url}
          maxZoom={tile.maxZoom}
          {...(tile.subdomains ? { subdomains: tile.subdomains } : {})}
        />
        <FitBounds items={markers} focusQuery={focusQuery} />
        {markers.map((item) => {
          const status = (item.vehicle.motionStatus ?? 'offline') as MotionStatus
          const pos = item.position!
          const isSelected = selectedId === item.vehicle._id
          return (
            <Marker
              key={item.vehicle._id}
              position={[pos.latitude, pos.longitude]}
              icon={markerIconFor(item, isSelected)}
              eventHandlers={onSelect ? { click: () => onSelect(item.vehicle._id) } : undefined}
            >
              <Popup>
                <div className="min-w-[180px] space-y-1 text-sm">
                  <p className="font-semibold">{item.vehicle.name}</p>
                  <p className="text-xs text-gray-600">{item.vehicle.plateNumber}</p>
                  <p>
                    {MOTION_STATUS_LABEL[status]} · {formatNumber(pos.speedKmh ?? 0, 0)} km/h
                  </p>
                  <p className="text-xs text-gray-500">{formatDate(pos.recordedAt)}</p>
                  {pos.source ? <p className="text-xs text-amber-700">Source: {pos.source}</p> : null}
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}
