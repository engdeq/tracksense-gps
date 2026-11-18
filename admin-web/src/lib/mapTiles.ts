export type MapTileType = {
  id: string
  label: string
  url: string
  attribution: string
  maxZoom?: number
  subdomains?: string
}

const mapTilerKey = (import.meta.env.VITE_MAPTILER_KEY as string | undefined)?.trim()

export const DEFAULT_MAP_TYPE_ID = 'google-normal'

/** Live map base layers — Google Normal is the default selection. */
export const MAP_TILE_TYPES: MapTileType[] = [
  {
    id: 'google-normal',
    label: 'Google Normal',
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attribution: '&copy; Google',
    maxZoom: 21,
  },
  {
    id: 'streets',
    label: 'Streets',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    maxZoom: 19,
    subdomains: 'abc',
  },
  {
    id: 'esri-streets',
    label: 'Esri Streets',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
    maxZoom: 19,
  },
  {
    id: 'satellite',
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri',
    maxZoom: 19,
  },
  {
    id: 'google-hybrid',
    label: 'Google Hybrid',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; Google',
    maxZoom: 21,
  },
  {
    id: 'google-satellite',
    label: 'Google Satellite',
    url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    attribution: '&copy; Google',
    maxZoom: 21,
  },
  {
    id: 'maptiler-satellite',
    label: 'MapTiler Satellite',
    url: mapTilerKey
      ? `https://api.maptiler.com/maps/satellite/{z}/{x}/{y}.jpg?key=${mapTilerKey}`
      : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: mapTilerKey ? '&copy; MapTiler' : '&copy; Esri',
    maxZoom: 20,
  },
  {
    id: 'maptiler-streets',
    label: 'MapTiler Streets',
    url: mapTilerKey
      ? `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${mapTilerKey}`
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: mapTilerKey
      ? '&copy; MapTiler'
      : '&copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 20,
    subdomains: mapTilerKey ? undefined : 'abcd',
  },
]

const STORAGE_KEY = 'tracksense.mapType'

export function getMapTileById(id?: string | null): MapTileType {
  return MAP_TILE_TYPES.find((t) => t.id === id) ?? MAP_TILE_TYPES[0]
}

export function readStoredMapTypeId(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && MAP_TILE_TYPES.some((t) => t.id === stored)) return stored
  } catch {
    /* ignore */
  }
  return DEFAULT_MAP_TYPE_ID
}

export function storeMapTypeId(id: string) {
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    /* ignore */
  }
}
