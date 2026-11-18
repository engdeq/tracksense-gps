import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { menusApi } from '@/api/endpoints'
import { SidebarFooter } from '@/components/layout/sidebar/SidebarFooter'
import { SidebarHeader } from '@/components/layout/sidebar/SidebarHeader'
import { SidebarNavigation } from '@/components/layout/sidebar/SidebarNavigation'
import { collectActiveKeys, dedupeMenuTree } from '@/components/layout/sidebar/sidebar-utils'
import { Button } from '@/components/ui/button'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { SIDEBAR_COLLAPSED_W, SIDEBAR_EXPANDED_W } from '@/components/layout/sidebar/constants'
import { useUiStore } from '@/stores/uiStore'

export function AppSidebar() {
  const { pathname, search } = useLocation()
  const {
    sidebarCollapsed,
    toggleSidebar,
    mobileNavOpen,
    setMobileNavOpen,
  } = useUiStore()

  const menus = useQuery({ queryKey: ['menus-tree'], queryFn: menusApi.tree })
  const tree = useMemo(() => dedupeMenuTree(menus.data?.tree ?? []), [menus.data?.tree])

  const activeTrail = useMemo(
    () => collectActiveKeys(tree, pathname, search),
    [tree, pathname, search],
  )
  const activeIds = useMemo(() => new Set(activeTrail), [activeTrail])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  // Auto-expand active trail; preserve other manually expanded parents.
  useEffect(() => {
    setExpanded((prev) => {
      const next = new Set(prev)
      activeTrail.forEach((id) => next.add(id))
      return next
    })
  }, [activeTrail])

  // Close mobile drawer on route change.
  useEffect(() => {
    setMobileNavOpen(false)
  }, [pathname, setMobileNavOpen])

  // Close collapsed flyouts when leaving a parent that is not in the active trail.
  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        // In collapsed mode, accordion parents so only one flyout shows.
        if (sidebarCollapsed) {
          const roots = new Set(tree.map((n) => n._id))
          if (roots.has(id)) {
            roots.forEach((rootId) => {
              if (!activeIds.has(rootId)) next.delete(rootId)
            })
          }
        }
        next.add(id)
      }
      return next
    })
  }

  function handleNavigate() {
    setMobileNavOpen(false)
  }

  const isCompact = sidebarCollapsed && !mobileNavOpen
  const width = isCompact ? SIDEBAR_COLLAPSED_W : SIDEBAR_EXPANDED_W

  return (
    <TooltipProvider delayDuration={280} disableHoverableContent>
      {/* Mobile overlay */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-[#0B1224]/55 backdrop-blur-[2px] transition-opacity lg:hidden',
          mobileNavOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={() => setMobileNavOpen(false)}
        aria-hidden={!mobileNavOpen}
      />

      <aside
        id="app-sidebar"
        style={{ ['--sidebar-w' as string]: `${width}px`, width }}
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[var(--sidebar-w)] flex-col overflow-visible bg-[var(--sidebar)] text-[var(--sidebar-foreground)] transition-[transform,width] duration-300 lg:z-40 lg:translate-x-0',
          'border-r border-white/[0.08]',
          // Mobile drawer always uses expanded width for readable labels
          'max-lg:!w-[272px]',
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
        aria-label="TrackSense navigation"
      >
        <div className="flex items-start justify-between gap-2 lg:block">
          <div className="min-w-0 flex-1">
            <SidebarHeader
              collapsed={isCompact}
              onToggleCollapse={() => {
                if (mobileNavOpen) {
                  setMobileNavOpen(false)
                  return
                }
                toggleSidebar()
              }}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="mr-2 mt-3 text-[#94A3C4] hover:bg-white/[0.07] hover:text-white lg:hidden"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
          <SidebarNavigation
            tree={tree}
            loading={menus.isLoading}
            collapsed={isCompact}
            expandedIds={expanded}
            activeIds={activeIds}
            onToggle={toggle}
            onNavigate={handleNavigate}
          />
        </div>

        <SidebarFooter
          collapsed={isCompact}
          onToggleCollapse={() => {
            if (mobileNavOpen) {
              setMobileNavOpen(false)
              return
            }
            toggleSidebar()
          }}
        />
      </aside>
    </TooltipProvider>
  )
}

export { SIDEBAR_COLLAPSED_W, SIDEBAR_EXPANDED_W } from '@/components/layout/sidebar/constants'
