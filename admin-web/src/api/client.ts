import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { ApiResponse, LoginResult } from '@/types/api'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

const STORAGE_ACCESS = 'tracksense_access_token'
const STORAGE_REFRESH = 'tracksense_refresh_token'

export function getStoredTokens() {
  return {
    accessToken: localStorage.getItem(STORAGE_ACCESS),
    refreshToken: localStorage.getItem(STORAGE_REFRESH),
  }
}

export function setStoredTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(STORAGE_ACCESS, accessToken)
  localStorage.setItem(STORAGE_REFRESH, refreshToken)
}

export function clearStoredTokens() {
  localStorage.removeItem(STORAGE_ACCESS)
  localStorage.removeItem(STORAGE_REFRESH)
}

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const { accessToken } = getStoredTokens()
  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken } = getStoredTokens()
  if (!refreshToken) return null
  try {
    const { data } = await axios.post<ApiResponse<LoginResult>>(`${API_BASE}/auth/refresh`, {
      refreshToken,
    })
    setStoredTokens(data.data.accessToken, data.data.refreshToken)
    return data.data.accessToken
  } catch {
    clearStoredTokens()
    return null
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true
      refreshPromise = refreshPromise ?? refreshAccessToken()
      const token = await refreshPromise
      refreshPromise = null
      if (token) {
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      }
      window.dispatchEvent(new CustomEvent('tracksense:logout'))
    }
    return Promise.reject(error)
  },
)

export async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const { data } = await promise
  return data.data
}