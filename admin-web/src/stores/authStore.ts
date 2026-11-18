import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '@/types/api'
import { authApi } from '@/api/endpoints'
import { clearStoredTokens, getStoredTokens, setStoredTokens } from '@/api/client'

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  hydrate: () => Promise<void>
  setUser: (user: AuthUser | null) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      setUser: (user) => set({ user, isAuthenticated: Boolean(user) }),
      login: async (username, password) => {
        set({ isLoading: true })
        try {
          const result = await authApi.login(username, password)
          setStoredTokens(result.accessToken, result.refreshToken)
          set({ user: result.user, isAuthenticated: true })
        } finally {
          set({ isLoading: false })
        }
      },
      logout: async () => {
        const { refreshToken } = getStoredTokens()
        try {
          if (refreshToken) await authApi.logout(refreshToken)
        } catch {
          /* ignore */
        }
        clearStoredTokens()
        set({ user: null, isAuthenticated: false })
      },
      hydrate: async () => {
        const { accessToken } = getStoredTokens()
        if (!accessToken) {
          set({ user: null, isAuthenticated: false })
          return
        }
        set({ isLoading: true })
        try {
          const user = await authApi.me()
          set({ user, isAuthenticated: true })
        } catch {
          clearStoredTokens()
          set({ user: null, isAuthenticated: false })
        } finally {
          set({ isLoading: false })
        }
      },
    }),
    {
      name: 'tracksense-auth',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    },
  ),
)