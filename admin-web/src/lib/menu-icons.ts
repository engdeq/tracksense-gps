import * as Icons from 'lucide-react'
import { Circle, type LucideIcon } from 'lucide-react'
import { NAV_ICON_FALLBACK } from '@/components/layout/nav-config'

export function resolveMenuIcon(name?: string): LucideIcon {
  if (!name) return Circle
  const fromLib = (Icons as unknown as Record<string, LucideIcon | undefined>)[name]
  if (fromLib) return fromLib
  return NAV_ICON_FALLBACK[name] ?? Circle
}