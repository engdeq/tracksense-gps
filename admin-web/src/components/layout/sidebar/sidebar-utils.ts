import type { MenuNode } from '@/api/endpoints'

/** Score how specifically a menu path matches the current location. Higher = better. */
export function pathMatchScore(pathname: string, search: string, path?: string): number {
  if (!path) return 0

  const [cleanPath, query = ''] = path.split('?')
  if (!cleanPath) return 0

  if (cleanPath === '/') {
    return pathname === '/' ? 100 : 0
  }

  const pathOk = pathname === cleanPath || pathname.startsWith(`${cleanPath}/`)
  if (!pathOk) return 0

  if (!query) {
    // Bare path (e.g. /reports) — only treat as active when no conflicting query siblings
    // are required. Base score is lower than query-specific matches.
    return pathname === cleanPath ? 50 : 40
  }

  const current = new URLSearchParams(search.startsWith('?') ? search : `?${search}`)
  const required = new URLSearchParams(query)
  for (const [key, value] of required.entries()) {
    if (current.get(key) !== value) return 0
  }
  // Query-specific match beats bare path
  return 100 + required.size
}

export function pathMatches(pathname: string, path?: string, search = '') {
  return pathMatchScore(pathname, search, path) > 0
}

/**
 * Walk the menu tree and return the active trail for the best-matching leaf.
 * Prefers query-specific paths (e.g. /reports?type=trips) over bare /reports.
 */
export function collectActiveKeys(
  nodes: MenuNode[],
  pathname: string,
  search = '',
  trail: string[] = [],
): string[] {
  let bestTrail: string[] = []
  let bestScore = 0

  function walk(list: MenuNode[], currentTrail: string[]) {
    for (const node of list) {
      const next = [...currentTrail, node._id]
      const score = pathMatchScore(pathname, search, node.path)
      if (score > bestScore) {
        bestScore = score
        bestTrail = next
      }
      if (node.children?.length) {
        walk(node.children, next)
      }
    }
  }

  walk(nodes, trail)
  return bestTrail
}

/** Deduplicate by _id while preserving first occurrence / tree order. */
export function dedupeMenuTree(nodes: MenuNode[]): MenuNode[] {
  const seen = new Set<string>()

  function walk(list: MenuNode[]): MenuNode[] {
    const out: MenuNode[] = []
    for (const node of list) {
      if (seen.has(node._id)) continue
      seen.add(node._id)
      out.push({
        ...node,
        children: node.children?.length ? walk(node.children) : [],
      })
    }
    return out
  }

  return walk(nodes)
}

export function hasVisibleChildren(node: MenuNode) {
  return Boolean(node.children?.some((child) => child.isVisible !== false && child.isActive !== false))
}
