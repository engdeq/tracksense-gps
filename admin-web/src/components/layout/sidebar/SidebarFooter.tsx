import { ChevronLeft, ChevronRight, Info } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SidebarTooltip } from '@/components/layout/sidebar/SidebarTooltip'
import { APP_VERSION } from '@/lib/app-meta'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'

export function SidebarFooter({
  collapsed,
  onToggleCollapse,
}: {
  collapsed: boolean
  onToggleCollapse: () => void
}) {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const initials =
    user?.fullName
      ?.split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ??
    user?.username?.slice(0, 2).toUpperCase() ??
    'TS'

  const roleLabel = (user?.role || 'user').replace(/_/g, ' ')

  return (
    <div className="shrink-0 border-t border-white/[0.08] bg-[#132048]/55 p-3">
      {user ? (
        <div className={cn('mb-2', collapsed ? 'flex justify-center' : '')}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  'flex w-full items-center gap-3 rounded-2xl bg-white/[0.05] text-left transition hover:bg-white/[0.08]',
                  collapsed ? 'h-11 w-11 justify-center p-0' : 'px-3 py-2.5',
                )}
                aria-label="User menu"
              >
                <div className="relative shrink-0">
                  <Avatar className="h-9 w-9 border border-white/10">
                    <AvatarImage src={user.avatarUrl} alt={user.username} />
                    <AvatarFallback className="bg-[#5577E8]/25 text-xs font-semibold text-[#C7D4FF]">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span
                    className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#132048] bg-[#16A34A]"
                    title="Online"
                    aria-hidden
                  />
                </div>
                {!collapsed ? (
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">
                      {user.fullName || user.username}
                    </p>
                    <p className="truncate text-xs capitalize text-[#94A3C4]">{roleLabel}</p>
                  </div>
                ) : (
                  <span className="sr-only">{user.fullName || user.username}</span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side={collapsed ? 'right' : 'top'} align="start" className="w-56">
              <div className="px-2 py-1.5">
                <p className="truncate text-sm font-semibold">{user.fullName || user.username}</p>
                <p className="truncate text-xs capitalize text-[var(--muted)]">{roleLabel}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/settings">My Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings">Account Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-[var(--danger)] focus:text-[var(--danger)]"
                onClick={() => void logout()}
              >
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}

      <div className={cn('flex items-center gap-2', collapsed && 'flex-col')}>
        <SidebarTooltip label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} enabled={collapsed}>
          <Button
            type="button"
            variant="ghost"
            size={collapsed ? 'icon' : 'sm'}
            className={cn(
              'text-[#94A3C4] hover:bg-white/[0.07] hover:text-white',
              !collapsed && 'flex-1 justify-start gap-2',
            )}
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            {!collapsed ? 'Collapse' : null}
          </Button>
        </SidebarTooltip>
      </div>

      {!collapsed ? (
        <div className="mt-2 flex items-center gap-1.5 px-1 text-[11px] text-[#6B7AA3]">
          <Info className="h-3 w-3 shrink-0" aria-hidden />
          <span>TrackSense v{APP_VERSION}</span>
        </div>
      ) : (
        <SidebarTooltip label={`TrackSense v${APP_VERSION}`} enabled>
          <p className="mt-2 text-center text-[10px] font-semibold text-[#6B7AA3]">v{APP_VERSION}</p>
        </SidebarTooltip>
      )}
    </div>
  )
}
