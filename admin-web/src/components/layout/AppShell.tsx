import { Outlet } from 'react-router-dom'
import { AppFooter } from '@/components/layout/AppFooter'
import { AppHeader } from '@/components/layout/AppHeader'
import { AppSidebar, SIDEBAR_COLLAPSED_W, SIDEBAR_EXPANDED_W } from '@/components/layout/AppSidebar'
import { useUiStore } from '@/stores/uiStore'

export function AppShell() {
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed)
  const contentOffset = sidebarCollapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_EXPANDED_W

  return (
    <div className="min-h-full bg-[var(--background)]">
      <AppSidebar />
      <div
        className="flex min-h-screen flex-col transition-[margin] duration-300 max-lg:!ml-0"
        style={{ marginLeft: contentOffset }}
      >
        <AppHeader />
        <main className="mx-auto w-full max-w-[1600px] flex-1 animate-fade-in px-5 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
        <AppFooter />
      </div>
    </div>
  )
}
