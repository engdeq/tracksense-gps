import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UiState {
  sidebarCollapsed: boolean
  mobileNavOpen: boolean
  countryId: string | null
  globalSearch: string
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setMobileNavOpen: (open: boolean) => void
  toggleMobileNav: () => void
  setCountryId: (id: string | null) => void
  setGlobalSearch: (q: string) => void
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      mobileNavOpen: false,
      countryId: null,
      globalSearch: '',
      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
      toggleMobileNav: () => set({ mobileNavOpen: !get().mobileNavOpen }),
      setCountryId: (countryId) => set({ countryId }),
      setGlobalSearch: (globalSearch) => set({ globalSearch }),
    }),
    {
      name: 'tracksense-ui',
      partialize: (s) => ({ countryId: s.countryId, sidebarCollapsed: s.sidebarCollapsed }),
    },
  ),
)
