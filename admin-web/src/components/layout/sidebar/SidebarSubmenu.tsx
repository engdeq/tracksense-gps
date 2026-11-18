import type { MenuNode } from '@/api/endpoints'
import { SidebarMenuItem } from '@/components/layout/sidebar/SidebarMenuItem'
import { hasVisibleChildren } from '@/components/layout/sidebar/sidebar-utils'
import { cn } from '@/lib/utils'

export function SidebarSubmenu({
  nodes,
  depth,
  collapsed,
  expandedIds,
  activeIds,
  onToggle,
  onNavigate,
  flyout = false,
}: {
  nodes: MenuNode[]
  depth: number
  collapsed: boolean
  expandedIds: Set<string>
  activeIds: Set<string>
  onToggle: (id: string) => void
  onNavigate?: () => void
  flyout?: boolean
}) {
  if (!nodes.length) return null

  return (
    <div
      className={cn(
        flyout ? 'flex flex-col gap-0.5' : 'sidebar-submenu sidebar-submenu-enter',
        !flyout && depth > 1 && 'ml-2',
      )}
      role="group"
    >
      {nodes.map((node) => {
        if (node.isVisible === false || node.isActive === false) return null
        const kids = node.children?.filter((c) => c.isVisible !== false && c.isActive !== false) ?? []
        const expanded = expandedIds.has(node._id)
        const showChildren = !collapsed && expanded && hasVisibleChildren(node)

        return (
          <div key={node._id} className="relative flex flex-col">
            <SidebarMenuItem
              node={{ ...node, children: kids }}
              depth={depth}
              collapsed={collapsed && !flyout}
              expanded={expanded}
              isInActiveTrail={activeIds.has(node._id)}
              onToggle={onToggle}
              onNavigate={onNavigate}
            />
            {showChildren ? (
              <SidebarSubmenu
                nodes={kids}
                depth={depth + 1}
                collapsed={false}
                expandedIds={expandedIds}
                activeIds={activeIds}
                onToggle={onToggle}
                onNavigate={onNavigate}
              />
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
