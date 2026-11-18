import { api, unwrap } from '@/api/client'
import type {
  AdminDashboard,
  Alert,
  AppUser,
  AuthUser,
  City,
  Country,
  Customer,
  Device,
  LoginResult,
  Paginated,
  SettingsPayload,
  Trip,
  Vehicle,
} from '@/types/api'

export const authApi = {
  login: (username: string, password: string) =>
    unwrap(api.post<import('@/types/api').ApiResponse<LoginResult>>('/auth/login', { username, password })),
  me: () => unwrap(api.get<import('@/types/api').ApiResponse<AuthUser>>('/auth/me')),
  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),
  forgotPassword: (email: string) =>
    unwrap(
      api.post<import('@/types/api').ApiResponse<{ message: string; resetToken?: string }>>(
        '/auth/forgot-password',
        { email },
      ),
    ),
  resetPassword: (token: string, password: string) =>
    unwrap(
      api.post<import('@/types/api').ApiResponse<{ message: string }>>('/auth/reset-password', {
        token,
        password,
      }),
    ),
}

export const dashboardApi = {
  admin: () => unwrap(api.get<import('@/types/api').ApiResponse<AdminDashboard>>('/dashboard/admin')),
}

export const lookupApi = {
  countries: () => unwrap(api.get<import('@/types/api').ApiResponse<Country[]>>('/countries')),
  cities: (countryId?: string) =>
    unwrap(
      api.get<import('@/types/api').ApiResponse<City[]>>('/cities', {
        params: countryId ? { countryId } : undefined,
      }),
    ),
  vehicleTypes: () => unwrap(api.get('/vehicle-types')),
  vehicleIcons: () => unwrap(api.get('/vehicle-icons')),
  deviceModels: () => unwrap(api.get('/device-models')),
  deviceProtocols: () => unwrap(api.get('/device-protocols')),
  settings: () => unwrap(api.get<import('@/types/api').ApiResponse<SettingsPayload>>('/settings')),
}

export const customersApi = {
  list: (params?: Record<string, string | number>) =>
    unwrap(api.get<import('@/types/api').ApiResponse<Paginated<Customer>>>('/customers', { params })),
  get: async (id: string) => {
    const payload = await unwrap(
      api.get<
        import('@/types/api').ApiResponse<
          Customer | { customer: Customer; vehicles?: unknown[]; devices?: unknown[]; users?: unknown[] }
        >
      >(`/customers/${id}`),
    )
    if (payload && typeof payload === 'object' && 'customer' in payload) {
      return (payload as { customer: Customer }).customer
    }
    return payload as Customer
  },
  create: (body: Partial<Customer>) => unwrap(api.post('/customers', body)),
  update: (id: string, body: Partial<Customer>) => unwrap(api.put(`/customers/${id}`, body)),
  remove: (id: string) => unwrap(api.delete(`/customers/${id}`)),
}

export const vehiclesApi = {
  list: (params?: Record<string, string | number>) =>
    unwrap(api.get<import('@/types/api').ApiResponse<Paginated<Vehicle>>>('/vehicles', { params })),
  get: async (id: string) => {
    const payload = await unwrap(
      api.get<
        import('@/types/api').ApiResponse<
          | Vehicle
          | {
              vehicle: Vehicle
              lastPosition?: unknown
              recentTrips?: unknown[]
              distanceStats?: unknown
            }
        >
      >(`/vehicles/${id}`),
    )
    if (payload && typeof payload === 'object' && 'vehicle' in payload) {
      return payload as {
        vehicle: Vehicle
        lastPosition?: unknown
        recentTrips?: unknown[]
        distanceStats?: unknown
      }
    }
    return { vehicle: payload as Vehicle }
  },
  create: (body: Record<string, unknown>) => unwrap(api.post('/vehicles', body)),
  update: (id: string, body: Record<string, unknown>) => unwrap(api.put(`/vehicles/${id}`, body)),
  remove: (id: string) => unwrap(api.delete(`/vehicles/${id}`)),
}

export const devicesApi = {
  list: (params?: Record<string, string | number>) =>
    unwrap(api.get<import('@/types/api').ApiResponse<Paginated<Device>>>('/devices', { params })),
  get: (id: string) => unwrap(api.get<import('@/types/api').ApiResponse<Device>>(`/devices/${id}`)),
  create: (body: Record<string, unknown>) => unwrap(api.post('/devices', body)),
  update: (id: string, body: Record<string, unknown>) => unwrap(api.put(`/devices/${id}`, body)),
  remove: (id: string) => unwrap(api.delete(`/devices/${id}`)),
}

export const gpsApi = {
  positions: (params?: Record<string, string>) =>
    unwrap(
      api.get<
        import('@/types/api').ApiResponse<{ items: LiveTrackingItem[]; note?: string }>
      >('/gps/positions', { params }),
    ),
  deviceStatus: () => unwrap(api.get('/gps/device-status')),
  history: (params: Record<string, string>) => unwrap(api.get('/gps/history', { params })),
}

export const tripsApi = {
  list: (params?: Record<string, string | number>) =>
    unwrap(api.get<import('@/types/api').ApiResponse<Paginated<Trip>>>('/trips', { params })),
  get: (id: string) => unwrap(api.get<import('@/types/api').ApiResponse<Trip & { route?: unknown[] }>>(`/trips/${id}`)),
  playback: (id: string) => unwrap(api.get(`/trips/${id}/playback`)),
}

export const reportsApi = {
  distance: (params?: Record<string, string>) => unwrap(api.get('/reports/distance', { params })),
  trips: (params?: Record<string, string>) => unwrap(api.get('/reports/trips', { params })),
  speed: (params?: Record<string, string>) => unwrap(api.get('/reports/speed', { params })),
  vehicles: (params?: Record<string, string>) => unwrap(api.get('/reports/vehicles', { params })),
}

export const alertsApi = {
  list: (params?: Record<string, string | number>) =>
    unwrap(
      api.get<
        import('@/types/api').ApiResponse<Paginated<Alert> & { unread?: number }>
      >('/alerts', { params }),
    ),
  get: (id: string) => unwrap(api.get<import('@/types/api').ApiResponse<Alert>>(`/alerts/${id}`)),
  markRead: (id: string) => unwrap(api.patch(`/alerts/${id}/read`)),
  markAllRead: () => unwrap(api.post('/alerts/read-all')),
}

export const usersApi = {
  list: async (params?: Record<string, string | number>) => {
    const data = await unwrap(api.get<import('@/types/api').ApiResponse<AppUser[]>>('/users', { params }))
    return Array.isArray(data) ? data : []
  },
  create: (body: Record<string, unknown>) => unwrap(api.post('/users', body)),
  updateProfile: (body: Record<string, unknown>) => unwrap(api.put('/profile', body)),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    unwrap(api.post('/profile/change-password', body)),
}

export type MenuNode = {
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
  children?: MenuNode[]
}

export type CountryAdmin = Country & {
  isoAlpha2?: string
  isoAlpha3?: string
  currencyName?: string
  currencyCode?: string
  currencySymbol?: string
  flagUrl?: string
  isActive?: boolean
  totalCities?: number
  rowNumber?: number
  createdAt?: string
}

export type CityAdmin = City & {
  cityCode?: string
  region?: string
  timezone?: string
  description?: string
  isActive?: boolean
  totalCustomers?: number
  rowNumber?: number
  createdAt?: string
  countryId?: Country | string
}

export const menusApi = {
  tree: () =>
    unwrap(api.get<import('@/types/api').ApiResponse<{ items: MenuNode[]; tree: MenuNode[] }>>('/menus')),
  adminList: () => unwrap(api.get<import('@/types/api').ApiResponse<MenuNode[]>>('/admin/menus')),
  get: (id: string) => unwrap(api.get<import('@/types/api').ApiResponse<MenuNode>>(`/admin/menus/${id}`)),
  create: (body: Record<string, unknown>) => unwrap(api.post('/admin/menus', body)),
  update: (id: string, body: Record<string, unknown>) => unwrap(api.put(`/admin/menus/${id}`, body)),
  remove: (id: string) => unwrap(api.delete(`/admin/menus/${id}`)),
}

export const countriesAdminApi = {
  list: (params?: Record<string, string | number>) =>
    unwrap(api.get<import('@/types/api').ApiResponse<Paginated<CountryAdmin>>>('/admin/countries', { params })),
  get: (id: string) => unwrap(api.get<import('@/types/api').ApiResponse<CountryAdmin>>(`/admin/countries/${id}`)),
  create: (body: Record<string, unknown>) => unwrap(api.post('/admin/countries', body)),
  update: (id: string, body: Record<string, unknown>) => unwrap(api.put(`/admin/countries/${id}`, body)),
  remove: (id: string) => unwrap(api.delete(`/admin/countries/${id}`)),
}

export const citiesAdminApi = {
  list: (params?: Record<string, string | number>) =>
    unwrap(api.get<import('@/types/api').ApiResponse<Paginated<CityAdmin>>>('/admin/cities', { params })),
  get: (id: string) => unwrap(api.get<import('@/types/api').ApiResponse<CityAdmin>>(`/admin/cities/${id}`)),
  create: (body: Record<string, unknown>) => unwrap(api.post('/admin/cities', body)),
  update: (id: string, body: Record<string, unknown>) => unwrap(api.put(`/admin/cities/${id}`, body)),
  remove: (id: string) => unwrap(api.delete(`/admin/cities/${id}`)),
}

export type SystemConfigRow = {
  _id: string
  name?: string
  code?: string
  key?: string
  description?: string
  isActive?: boolean
  createdAt?: string
  rowNumber?: number
  [key: string]: unknown
}

function adminCrud(base: string) {
  return {
    list: (params?: Record<string, string | number>) =>
      unwrap(api.get<import('@/types/api').ApiResponse<Paginated<SystemConfigRow>>>(base, { params })),
    get: (id: string) => unwrap(api.get<import('@/types/api').ApiResponse<SystemConfigRow>>(`${base}/${id}`)),
    create: (body: Record<string, unknown> | FormData) =>
      unwrap(
        api.post(base, body, body instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined),
      ),
    update: (id: string, body: Record<string, unknown> | FormData) =>
      unwrap(
        api.put(
          `${base}/${id}`,
          body,
          body instanceof FormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined,
        ),
      ),
    remove: (id: string) => unwrap(api.delete(`${base}/${id}`)),
  }
}

export const vehicleTypesAdminApi = adminCrud('/admin/vehicle-types')
export const vehicleIconsAdminApi = adminCrud('/admin/vehicle-icons')
export const deviceModelsAdminApi = adminCrud('/admin/device-models')
export const deviceProtocolsAdminApi = adminCrud('/admin/device-protocols')

export const mapSettingsApi = {
  get: () => unwrap(api.get('/admin/map-settings')),
  update: (body: Record<string, unknown>) => unwrap(api.put('/admin/map-settings', body)),
  reset: () => unwrap(api.post('/admin/map-settings/reset')),
}

export const appSettingsApi = {
  get: () => unwrap(api.get('/admin/app-settings')),
  update: (body: Record<string, unknown>) => unwrap(api.put('/admin/app-settings', body)),
}

export const rolesApi = {
  list: (params?: Record<string, string | number>) => unwrap(api.get('/roles', { params })),
  get: (id: string) => unwrap(api.get(`/roles/${id}`)),
  create: (body: Record<string, unknown>) => unwrap(api.post('/roles', body)),
  update: (id: string, body: Record<string, unknown>) => unwrap(api.put(`/roles/${id}`, body)),
  remove: (id: string) => unwrap(api.delete(`/roles/${id}`)),
  setPermissions: (id: string, permissionKeys: string[]) =>
    unwrap(api.put(`/roles/${id}/permissions`, { permissionKeys })),
}

export const permissionsApi = {
  list: () => unwrap(api.get('/permissions')),
}

export const auditLogsApi = {
  list: (params?: Record<string, string | number>) => unwrap(api.get('/audit-logs', { params })),
  get: (id: string) => unwrap(api.get(`/audit-logs/${id}`)),
  summary: () => unwrap(api.get('/audit-logs/summary')),
  exportCsv: async (params?: Record<string, string>) => {
    const { data } = await api.get('/audit-logs/export', { params: { ...params, format: 'csv' }, responseType: 'blob' })
    return data as Blob
  },
}

export type GeofenceRow = {
  _id: string
  name: string
  description?: string
  type: 'circle' | 'polygon' | 'rectangle'
  color?: string
  center?: { lat: number; lng: number } | null
  radiusMeters?: number | null
  coordinates?: number[][]
  customerId?: Customer | string
  countryId?: Country | string | null
  cityId?: City | string | null
  assignedVehicleIds?: Array<Vehicle | string>
  assignedVehicleCount?: number
  alertSettings?: { enabled?: boolean; onEntry?: boolean; onExit?: boolean }
  alertRules?: string
  areaLabel?: string
  isActive?: boolean
  status?: string
  createdAt?: string
  updatedAt?: string
  rowNumber?: number
  recentEvents?: GeofenceEventRow[]
  recentEntries?: GeofenceEventRow[]
  recentExits?: GeofenceEventRow[]
}

export type GeofenceEventRow = {
  _id: string
  rowNumber?: number
  eventType: 'entry' | 'exit'
  latitude: number
  longitude: number
  speedKmh?: number
  recordedAt: string
  positionSource?: string
  vehicleId?: Vehicle | string
  geofenceId?: GeofenceRow | string
  customerId?: Customer | string
}

export type GeofenceStats = {
  totalGeofences: number
  activeGeofences: number
  inactiveGeofences: number
  vehiclesAssigned: number
  entryAlertsToday: number
  exitAlertsToday: number
}

export const geofencesApi = {
  stats: (params?: Record<string, string | number>) =>
    unwrap(api.get<import('@/types/api').ApiResponse<GeofenceStats>>('/geofences/statistics', { params })),
  list: (params?: Record<string, string | number>) =>
    unwrap(api.get<import('@/types/api').ApiResponse<Paginated<GeofenceRow>>>('/geofences', { params })),
  get: (id: string) => unwrap(api.get<import('@/types/api').ApiResponse<GeofenceRow>>(`/geofences/${id}`)),
  create: (body: Record<string, unknown>) => unwrap(api.post('/geofences', body)),
  update: (id: string, body: Record<string, unknown>) => unwrap(api.put(`/geofences/${id}`, body)),
  remove: (id: string) => unwrap(api.delete(`/geofences/${id}`)),
  setStatus: (id: string, isActive: boolean) => unwrap(api.post(`/geofences/${id}/status`, { isActive })),
  assignVehicles: (id: string, vehicleIds: string[]) =>
    unwrap(api.post(`/geofences/${id}/assign-vehicles`, { vehicleIds })),
  events: (params?: Record<string, string | number>) =>
    unwrap(api.get<import('@/types/api').ApiResponse<Paginated<GeofenceEventRow>>>('/geofences/events', { params })),
}

export const accessControlApi = {
  summary: () => unwrap(api.get('/access-control/summary')),
  listRules: (params?: Record<string, string | number>) => unwrap(api.get('/access-control/rules', { params })),
  getRule: (id: string) => unwrap(api.get(`/access-control/rules/${id}`)),
  createRule: (body: Record<string, unknown>) => unwrap(api.post('/access-control/rules', body)),
  updateRule: (id: string, body: Record<string, unknown>) => unwrap(api.put(`/access-control/rules/${id}`, body)),
  removeRule: (id: string) => unwrap(api.delete(`/access-control/rules/${id}`)),
  listUsers: (params?: Record<string, string | number>) => unwrap(api.get('/access-control/users', { params })),
  setUserStatus: (id: string, action: 'activate' | 'suspend' | 'unlock') =>
    unwrap(api.post(`/access-control/users/${id}/status`, { action })),
  revokeSessions: (id: string) => unwrap(api.post(`/access-control/users/${id}/revoke-sessions`)),
}