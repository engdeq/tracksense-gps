import { Link, useLocation } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import type { MenuNode } from '@/api/endpoints'
import { SidebarTooltip } from '@/components/layout/sidebar/SidebarTooltip'
import { resolveMenuIcon } from '@/lib/menu-icons'
import { cn } from '@/lib/utils'
import { pathMatches } from '@/components/layout/sidebar/sidebar-utils'

export function SidebarMenuItem({
  node,
  depth,
  collapsed,
  expanded,
  isInActiveTrail,
  onToggle,
  onNavigate,
  badge,
}: {
  node: MenuNode
  depth: number
  collapsed: boolean
  expanded: boolean
  isInActiveTrail: boolean
  onToggle: (id: string) => void
  onNavigate?: () => void
  badge?: number
}) {
  const { pathname, search } = useLocation()
  const Icon = resolveMenuIcon(node.icon)
  const hasChildren = Boolean(node.children?.length)
  // Leaf highlight must match path + query (e.g. /reports?type=trips), not every /reports sibling
  const isLeafActive = !hasChildren && pathMatches(pathname, node.path, search)
  const isParentActive = hasChildren && isInActiveTrail
  const isChildActive = isLeafActive

  const paddingLeft = collapsed ? undefined : depth === 0 ? 12 : 10 + Math.min(depth, 4) * 2

  const className = cn(
    'sidebar-item px-3',
    collapsed && 'justify-center px-0',
    isParentActive && 'sidebar-item-parent-active',
    isChildActive && 'sidebar-item-child-active',
  )

  const icon = (
    <Icon
      className={cn(
        'h-5 w-5 shrink-0',
        isParentActive || isChildActive ? 'text-white' : 'text-[#94A3C4]',
      )}
      strokeWidth={1.75}
      aria-hidden
    />
  )

  const badgeEl =
    badge && badge > 0 ? (
      <span
        className={cn(
          'ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#E11D48] px-1 text-[10px] font-bold leading-none text-white',
          collapsed && 'absolute right-1 top-1 h-4 min-w-4',
        )}
      >
        {badge > 99 ? '99+' : badge}
      </span>
    ) : null

  if (hasChildren) {
    const button = (
      <button
        type="button"
        className={cn(className, collapsed && 'relative')}
        style={paddingLeft !== undefined ? { paddingLeft } : undefined}
        aria-expanded={expanded}
        onClick={() => onToggle(node._id)}
      >
        {icon}
        {!collapsed ? (
          <>
            <span className="min-w-0 flex-1 truncate">{node.label}</span>
            {badgeEl}
            <ChevronDown
              className={cn(
                'h-4 w-4 shrink-0 text-[#94A3C4] transition-transform duration-200',
                expanded && 'rotate-180 text-white',
              )}
              aria-hidden
            />
          </>
        ) : (
          <>
            <span className="sr-only">{node.label}</span>
            {badgeEl}
          </>
        )}
      </button>
    )

    return (
      <SidebarTooltip label={node.label} enabled={collapsed}>
        {button}
      </SidebarTooltip>
    )
  }

  if (!node.path) return null

  const link = (
    <Link
      to={node.path}
      className={cn(className, collapsed && 'relative')}
      style={paddingLeft !== undefined ? { paddingLeft } : undefined}
      aria-current={isLeafActive ? 'page' : undefined}
      onClick={onNavigate}
    >
      {icon}
      {!collapsed ? (
        <>
          <span className="min-w-0 flex-1 truncate">{node.label}</span>
          {badgeEl}
        </>
      ) : (
        <>
          <span className="sr-only">{node.label}</span>
          {badgeEl}
        </>
      )}
    </Link>
  )

  return (
    <SidebarTooltip label={node.label} enabled={collapsed}>
      {link}
    </SidebarTooltip>
  )
}
