import type { LucideIcon } from 'lucide-react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn, formatNumber } from '@/lib/utils'

const toneMap = {
  blue: {
    icon: 'bg-[#5577E8]/12 text-[#5577E8]',
    wave: 'from-[#5577E8]/15 to-transparent',
  },
  deep: {
    icon: 'bg-[#4165D9]/12 text-[#4165D9]',
    wave: 'from-[#4165D9]/15 to-transparent',
  },
  success: {
    icon: 'bg-[#16A34A]/12 text-[#16A34A]',
    wave: 'from-[#16A34A]/15 to-transparent',
  },
  warning: {
    icon: 'bg-[#F59E0B]/12 text-[#F59E0B]',
    wave: 'from-[#F59E0B]/15 to-transparent',
  },
  danger: {
    icon: 'bg-[#E11D48]/12 text-[#E11D48]',
    wave: 'from-[#E11D48]/15 to-transparent',
  },
  info: {
    icon: 'bg-[#2563EB]/12 text-[#2563EB]',
    wave: 'from-[#2563EB]/15 to-transparent',
  },
} as const

export function MetricCard({
  label,
  value,
  icon: Icon,
  tone = 'blue',
  trend,
  className,
}: {
  label: string
  value: number | string
  icon: LucideIcon
  tone?: keyof typeof toneMap
  trend?: { value: number; label?: string }
  className?: string
}) {
  const palette = toneMap[tone]
  const numeric = typeof value === 'number' ? formatNumber(value) : value
  const trendUp = trend != null && trend.value >= 0

  return (
    <Card className={cn('relative overflow-hidden', className)}>
      <CardContent className="relative z-[1] flex items-start justify-between p-5">
        <div className="min-w-0">
          <p className="text-sm text-[var(--muted)]">{label}</p>
          <p className="mt-2 font-display text-3xl font-bold tracking-tight text-[var(--foreground)]">
            {numeric}
          </p>
          {trend ? (
            <p
              className={cn(
                'mt-2 inline-flex items-center gap-1 text-xs font-medium',
                trendUp ? 'text-[var(--success)]' : 'text-[var(--danger)]',
              )}
            >
              {trendUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {trendUp ? '+' : ''}
              {trend.value.toFixed(1)}%
              {trend.label ? <span className="text-[var(--muted)]">{trend.label}</span> : null}
            </p>
          ) : null}
        </div>
        <div className={cn('rounded-xl p-3', palette.icon)}>
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
      </CardContent>
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t',
          palette.wave,
        )}
        aria-hidden
      />
    </Card>
  )
}
