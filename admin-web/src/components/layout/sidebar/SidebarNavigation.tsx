import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useQuery } from '@tanstack/react-query'
import type { MenuNode } from '@/api/endpoints'
import { alertsApi } from '@/api/endpoints'
import { SidebarMenuItem } from '@/components/layout/sidebar/SidebarMenuItem'
import { SidebarSubmenu } from '@/components/layout/sidebar/SidebarSubmenu'
import { hasVisibleChildren } from '@/components/layout/sidebar/sidebar-utils'
import { SIDEBAR_COLLAPSED_W } from '@/components/layout/sidebar/constants'

/** Admin section roots — derived from menu keys, not hardcoded routes. */
const ADMIN_SECTION_KEYS = new Set(['administration', 'system', 'settings', 'config'])

function isAdminSectionNode(node: MenuNode) {
  const key = (node.key || '').toLowerCase()
  const group = (node.group || '').toLowerCase()
  return ADMIN_SECTION_KEYS.has(key) || ADMIN_SECTION_KEYS.has(group)
}

function CollapsedFlyout({
  label,
  anchorEl,
  children,
  onClose,
}: {
  label: string
  anchorEl: HTMLElement | null
  children: React.ReactNode
  onClose: () => void
}) {
  const [pos, setPos] = useState({ top: 0 })

  useLayoutEffect(() => {
    if (!anchorEl) return
    const rect = anchorEl.getBoundingClientRect()
    const approxHeight = 280
    const top = Math.min(Math.max(8, rect.top), window.innerHeight - approxHeight)
    setPos({ top })
  }, [anchorEl])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    function onDown(e: MouseEvent) {
      const target = e.target as Node
      if (anchorEl?.contains(target)) return
      const flyout = document.getElementById('sidebar-collapsed-flyout')
      if (flyout?.contains(target)) return
      onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [anchorEl, onClose])

  return createPortal(
    <div
      id="sidebar-collapsed-flyout"
      role="menu"
      className="sidebar-flyout fixed z-[70]"
      style={{ top: pos.top, left: SIDEBAR_COLLAPSED_W + 8 }}
    >
      <p className="mb-1 truncate px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#94A3C4]">
        {label}
      </p>
      {children}
    </div>,
    document.body,
  )
}

export function SidebarNavigation({
  tree,
  loading,
  collapsed,
  expandedIds,
  activeIds,
  onToggle,
  onNavigate,
}: {
  tree: MenuNode[]
  loading?: boolean
  collapsed: boolean
  expandedIds: Set<string>
  activeIds: Set<string>
  onToggle: (id: string) => void
  onNavigate?: () => void
}) {
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [flyoutId, setFlyoutId] = useState<string | null>(null)

  const alerts = useQuery({
    queryKey: ['alerts-sidebar-badge'],
    queryFn: () => alertsApi.list({ limit: 1, page: 1, isRead: 'false' }),
    refetchInterval: 60_000,
  })
  const unread = alerts.data?.unread ?? alerts.data?.items?.filter((a) => !a.isRead).length ?? 0

  const sections = useMemo(() => {
    const visible = tree.filter((n) => n.isVisible !== false && n.isActive !== false)
    const workspace: MenuNode[] = []
    const administration: MenuNode[] = []
    for (const node of visible) {
      if (isAdminSectionNode(node)) administration.push(node)
      else workspace.push(node)
    }
    return { workspace, administration }
  }, [tree])

  useEffect(() => {
    if (!collapsed) setFlyoutId(null)
  }, [collapsed])

  function handleToggle(id: string) {
    onToggle(id)
    if (!collapsed) return
    const node = tree.find((n) => n._id === id)
    if (!node || !hasVisibleChildren(node)) {
      setFlyoutId(null)
      return
    }
    setFlyoutId((prev) => (prev === id ? null : id))
  }

  function renderNode(node: MenuNode) {
    const kids = node.children?.filter((c) => c.isVisible !== false && c.isActive !== false) ?? []
    const expanded = expandedIds.has(node._id)
    const showInlineChildren = !collapsed && expanded && hasVisibleChildren(node)
    const badge =
      node.path === '/alerts' || node.key === 'alerts' || kids.some((c) => c.path === '/alerts')
        ? unread
        : undefined

    return (
      <div
        key={node._id}
        ref={(el) => {
          rowRefs.current[node._id] = el
        }}
        className="relative flex flex-col"
      >
        <SidebarMenuItem
          node={{ ...node, children: kids }}
          depth={0}
          collapsed={collapsed}
          expanded={expanded || flyoutId === node._id}
          isInActiveTrail={activeIds.has(node._id)}
          onToggle={handleToggle}
          onNavigate={onNavigate}
          badge={badge}
        />

        {showInlineChildren ? (
          <SidebarSubmenu
            nodes={kids}
            depth={1}
            collapsed={false}
            expandedIds={expandedIds}
            activeIds={activeIds}
            onToggle={handleToggle}
            onNavigate={onNavigate}
          />
        ) : null}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-2 px-2 py-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-xl bg-white/5" />
        ))}
      </div>
    )
  }

  if (!tree.length) {
    return <p className="px-3 py-4 text-xs text-[#94A3C4]">No menus available for your role.</p>
  }

  const flyoutNode = flyoutId ? tree.find((n) => n._id === flyoutId) : null

  return (
    <nav className="flex flex-col gap-0.5 px-2 py-2" aria-label="Main">
      {sections.workspace.length ? (
        <>
          {!collapsed ? <p className="sidebar-section-label">Workspace</p> : null}
          {sections.workspace.map(renderNode)}
        </>
      ) : null}

      {sections.administration.length ? (
        <>
          {!collapsed ? <p className="sidebar-section-label">Administration</p> : (
            <div className="my-2 mx-auto h-px w-8 bg-white/10" aria-hidden />
          )}
          {sections.administration.map(renderNode)}
        </>
      ) : null}

      {collapsed && flyoutNode && hasVisibleChildren(flyoutNode) ? (
        <CollapsedFlyout
          label={flyoutNode.label}
          anchorEl={rowRefs.current[flyoutNode._id]}
          onClose={() => setFlyoutId(null)}
        >
          <SidebarSubmenu
            nodes={flyoutNode.children ?? []}
            depth={1}
            collapsed={false}
            expandedIds={expandedIds}
            activeIds={activeIds}
            onToggle={handleToggle}
            onNavigate={() => {
              setFlyoutId(null)
              onNavigate?.()
            }}
            flyout
          />
        </CollapsedFlyout>
      ) : null}
    </nav>
  )
}
