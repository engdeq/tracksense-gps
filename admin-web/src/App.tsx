import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AppShell } from '@/components/layout/AppShell'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { LoginPage } from '@/pages/auth/LoginPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { LiveTrackingPage } from '@/pages/LiveTrackingPage'
import { TripsPage } from '@/pages/trips/TripsPage'
import { TripDetailPage } from '@/pages/trips/TripDetailPage'
import { CustomersPage } from '@/pages/customers/CustomersPage'
import { CustomerDetailPage } from '@/pages/customers/CustomerDetailPage'
import { CustomerFormPage } from '@/pages/customers/CustomerFormPage'
import { VehiclesPage } from '@/pages/vehicles/VehiclesPage'
import { VehicleDetailPage } from '@/pages/vehicles/VehicleDetailPage'
import { VehicleFormPage } from '@/pages/vehicles/VehicleFormPage'
import { DevicesPage } from '@/pages/devices/DevicesPage'
import { DeviceDetailPage } from '@/pages/devices/DeviceDetailPage'
import { DeviceFormPage } from '@/pages/devices/DeviceFormPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { AlertsPage } from '@/pages/AlertsPage'
import { UsersPage } from '@/pages/UsersPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { CountriesPage } from '@/pages/system/CountriesPage'
import { CitiesPage } from '@/pages/system/CitiesPage'
import { MenusPage } from '@/pages/system/MenusPage'
import { GeofencesPage } from '@/pages/system/GeofencesPage'
import { RolesPage } from '@/pages/system/RolesPage'
import { AuditLogsPage } from '@/pages/system/AuditLogsPage'
import { AccessControlPage } from '@/pages/system/AccessControlPage'
import { VehicleTypesPage } from '@/pages/system/VehicleTypesPage'
import { VehicleIconsPage } from '@/pages/system/VehicleIconsPage'
import { DeviceModelsPage } from '@/pages/system/DeviceModelsPage'
import { DeviceProtocolsPage } from '@/pages/system/DeviceProtocolsPage'
import { MapSettingsPage } from '@/pages/system/MapSettingsPage'
import { AlertSettingsPage } from '@/pages/system/AlertSettingsPage'
import { Toaster } from '@/components/ui/sonner'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function ThemeBoot({ children }: { children: React.ReactNode }) {
  const apply = useThemeStore((s) => s.apply)
  const resolved = useThemeStore((s) => s.resolved)
  useEffect(() => {
    apply()
  }, [apply, resolved])
  return children
}

function AuthBoot({ children }: { children: React.ReactNode }) {
  const hydrate = useAuthStore((s) => s.hydrate)
  const logout = useAuthStore((s) => s.logout)

  useEffect(() => {
    void hydrate()
    const onLogout = () => void logout()
    window.addEventListener('tracksense:logout', onLogout)
    return () => window.removeEventListener('tracksense:logout', onLogout)
  }, [hydrate, logout])

  return children
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster richColors position="top-right" />
      <ThemeBoot>
        <AuthBoot>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route
                element={
                  <ProtectedRoute>
                    <AppShell />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route path="live-tracking" element={<LiveTrackingPage />} />
                <Route path="trips" element={<TripsPage />} />
                <Route path="trips/:id" element={<TripDetailPage />} />
                <Route path="customers" element={<CustomersPage />} />
                <Route path="customers/new" element={<CustomerFormPage />} />
                <Route path="customers/:id" element={<CustomerDetailPage />} />
                <Route path="customers/:id/edit" element={<CustomerFormPage />} />
                <Route path="vehicles" element={<VehiclesPage />} />
                <Route path="vehicles/new" element={<VehicleFormPage />} />
                <Route path="vehicles/:id" element={<VehicleDetailPage />} />
                <Route path="vehicles/:id/edit" element={<VehicleFormPage />} />
                <Route path="devices" element={<DevicesPage />} />
                <Route path="devices/new" element={<DeviceFormPage />} />
                <Route path="devices/:id" element={<DeviceDetailPage />} />
                <Route path="devices/:id/edit" element={<DeviceFormPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="alerts" element={<AlertsPage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="countries" element={<CountriesPage />} />
                <Route path="cities" element={<CitiesPage />} />
                <Route path="menus" element={<MenusPage />} />
                <Route path="geofences" element={<GeofencesPage />} />
                <Route path="roles" element={<RolesPage />} />
                <Route path="audit-logs" element={<AuditLogsPage />} />
                <Route path="access-control" element={<AccessControlPage />} />
                <Route path="vehicle-types" element={<VehicleTypesPage />} />
                <Route path="vehicle-icons" element={<VehicleIconsPage />} />
                <Route path="device-models" element={<DeviceModelsPage />} />
                <Route path="device-protocols" element={<DeviceProtocolsPage />} />
                <Route path="map-settings" element={<MapSettingsPage />} />
                <Route path="alerts/settings" element={<AlertSettingsPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthBoot>
      </ThemeBoot>
    </QueryClientProvider>
  )
}
