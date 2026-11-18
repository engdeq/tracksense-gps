export type MotionStatus = 'moving' | 'stopped' | 'offline' | 'speeding' | 'engine'

export type UserRole = 'super_admin' | 'admin' | 'operator' | 'customer'

export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}

export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  limit: number
}

export interface AuthUser {
  id: string
  username: string
  email: string
  fullName?: string
  phone?: string
  avatarUrl?: string
  role: UserRole
  customerId?: string
  permissions: string[]
  countryId?: string
  cityId?: string
}

export interface LoginResult {
  user: AuthUser
  accessToken: string
  refreshToken: string
}

export interface Customer {
  _id: string
  companyName: string
  contactName: string
  email: string
  phone?: string
  countryId?: { _id: string; name: string; code?: string } | string
  cityId?: { _id: string; name: string } | string
  address?: string
  status: 'active' | 'inactive' | 'suspended'
  notes?: string
  createdAt?: string
}

export interface Vehicle {
  _id: string
  name: string
  plateNumber: string
  brand?: string
  model?: string
  year?: number | null
  color?: string
  vin?: string
  customerId?: Customer | string
  vehicleTypeId?: { _id: string; name: string; iconKey?: string } | string
  iconId?: { _id: string; name: string; key?: string; imageUrl?: string } | string
  deviceId?: { _id: string; imei: string; name?: string; connectionStatus?: string; lastCommunicationAt?: string } | string | null
  status: 'active' | 'inactive' | 'maintenance'
  motionStatus?: MotionStatus
  speedLimitKmh?: number
  notes?: string
  updatedAt?: string
}

export interface Device {
  _id: string
  imei: string
  name?: string
  serialNumber?: string
  customerId?: Customer | string
  vehicleId?: Vehicle | string | null
  modelId?: { _id: string; name: string } | string
  protocolId?: { _id: string; name: string } | string
  simNumber?: string
  connectionStatus: 'online' | 'offline'
  lastCommunicationAt?: string
  firmwareVersion?: string
  status?: string
  notes?: string
}

export interface GpsPosition {
  latitude: number
  longitude: number
  speedKmh?: number
  heading?: number
  ignition?: boolean
  recordedAt?: string
  address?: string
  source?: string
}

export interface LiveTrackingItem {
  vehicle: Vehicle
  position: GpsPosition | null
}

export interface Trip {
  _id: string
  vehicleId?: Vehicle | string
  customerId?: string
  startTime: string
  endTime?: string | null
  distanceKm?: number
  maxSpeedKmh?: number
  avgSpeedKmh?: number
  startAddress?: string
  endAddress?: string
  status?: string
}

export interface Alert {
  _id: string
  type: string
  severity?: string
  title?: string
  message: string
  vehicleId?: Vehicle | string
  isRead?: boolean
  createdAt: string
}

export interface AuditActivity {
  _id: string
  action: string
  entityType?: string
  entityId?: string
  details?: string
  createdAt: string
  userId?: { username?: string; fullName?: string }
}

export interface AdminDashboard {
  kpis: {
    totalCustomers: number
    totalVehicles: number
    totalDevices: number
    onlineDevices: number
    offlineDevices: number
    totalTrips: number
  }
  vehicleStatus: { status: MotionStatus; count: number }[]
  tripsDistance: { _id: string; trips: number; distanceKm: number }[]
  recentAlerts: Alert[]
  recentActivities: AuditActivity[]
}

export interface Country {
  _id: string
  name: string
  code: string
  isoAlpha2?: string
  isoAlpha3?: string
  phoneCode?: string
  flagUrl?: string
}

export interface City {
  _id: string
  name: string
  countryId: string | Country
}

export interface AdminCountry {
  _id: string
  name: string
  code: string
  isoAlpha2: string
  isoAlpha3: string
  phoneCode?: string
  currencyName?: string
  currencyCode?: string
  currencySymbol?: string
  flagUrl?: string
  isActive: boolean
  totalCities?: number
  rowNumber?: number
}

export interface AdminCity {
  _id: string
  name: string
  countryId: Country | string
  cityCode?: string
  region?: string
  timezone?: string
  description?: string
  isActive: boolean
  totalCustomers?: number
  rowNumber?: number
}

export interface MenuItem {
  _id: string
  key: string
  label: string
  icon?: string
  path?: string
  parentId?: string | null
  group?: string
  order?: number
  permission?: string
  roles?: string[]
  isActive?: boolean
  isVisible?: boolean
  children?: MenuItem[]
}

export interface MenusTreeResponse {
  items: MenuItem[]
  tree: MenuItem[]
}

export interface AppUser {
  _id: string
  id?: string
  role?: string
  username: string
  email: string
  fullName?: string
  phone?: string
  roleKey: UserRole
  isActive: boolean
  customerId?: string
  lastLoginAt?: string
  createdAt?: string
}

export interface SettingsPayload {
  app: { key: string; value: unknown; label?: string; description?: string }[]
  map: {
    defaultLat?: number
    defaultLng?: number
    defaultZoom?: number
    tileUrl?: string
    clusteringEnabled?: boolean
  } | null
}