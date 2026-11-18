import { ChevronsLeft, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SidebarTooltip } from '@/components/layout/sidebar/SidebarTooltip'
import { cn } from '@/lib/utils'

export function SidebarHeader({
  collapsed,
  onToggleCollapse,
}: {
  collapsed: boolean
  onToggleCollapse?: () => void
}) {
  return (
    <div className="shrink-0 border-b border-white/[0.08] px-3.5 py-4">
      <div className={cn('flex items-center gap-3', collapsed ? 'justify-center' : 'justify-between')}>
        <div className={cn('flex min-w-0 items-center gap-3', collapsed && 'justify-center')}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#5577E8] to-[#4165D9] shadow-[0_8px_20px_rgba(85,119,232,0.35)]">
            <MapPin className="h-5 w-5 text-white" strokeWidth={2.25} aria-hidden />
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="font-display text-[15px] font-bold tracking-tight text-white">TrackSense</p>
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-[#94A3C4]">
                Admin Portal
              </p>
            </div>
          ) : (
            <span className="sr-only">TrackSense Admin Portal</span>
          )}
        </div>

        {!collapsed && onToggleCollapse ? (
          <SidebarTooltip label="Collapse sidebar" enabled>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="hidden h-8 w-8 shrink-0 rounded-lg text-[#94A3C4] hover:bg-white/[0.07] hover:text-white lg:inline-flex"
              onClick={onToggleCollapse}
              aria-label="Collapse sidebar"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
          </SidebarTooltip>
        ) : null}
      </div>
    </div>
  )
}
