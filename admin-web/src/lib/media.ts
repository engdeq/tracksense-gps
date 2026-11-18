const API_ORIGIN = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api').replace(/\/api\/?$/, '')

/**
 * Resolve icon / upload URLs for <img src>.
 * - Absolute http(s) / data / blob → unchanged
 * - /uploads/... → backend origin (cross-origin uploads)
 * - /icons/... → same-origin public assets
 */
export function resolveMediaUrl(url?: string | null): string {
  if (!url) return ''
  if (/^(https?:|data:|blob:)/i.test(url)) return url
  if (url.startsWith('/uploads')) return `${API_ORIGIN}${url}`
  if (url.startsWith('/icons')) return url
  if (url.startsWith('uploads/')) return `${API_ORIGIN}/${url}`
  return url
}
