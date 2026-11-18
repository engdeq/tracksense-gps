import type { ReactNode } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

/** Tooltip only for collapsed sidebar — never covers expanded labels. */
export function SidebarTooltip({
  label,
  enabled,
  children,
}: {
  label: string
  enabled: boolean
  children: ReactNode
}) {
  if (!enabled) return <>{children}</>

  return (
    <Tooltip delayDuration={280}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side="right"
        sideOffset={12}
        collisionPadding={12}
        className="z-[80] border-white/10 bg-[#0f1b3a] px-3 py-1.5 text-xs font-medium text-white shadow-xl"
      >
        {label}
      </TooltipContent>
    </Tooltip>
  )
}
