import {
  Activity,
  Bell,
  Car,
  Circle,
  Cpu,
  FileBarChart,
  LayoutDashboard,
  MapPinned,
  Route,
  Settings,
  Users,
  Building2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

/** Icon fallback when dynamic lucide name from API is missing or invalid */
export const NAV_ICON_FALLBACK: Record<string, LucideIcon> = {
  LayoutDashboard,
  MapPinned,
  Route,
  Building2,
  Car,
  Cpu,
  FileBarChart,
  Bell,
  Users,
  Settings,
  Activity,
  Circle,
}

export { Activity }