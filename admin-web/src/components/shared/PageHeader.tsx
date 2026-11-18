import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Home, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export type BreadcrumbItem = { label: string; href?: string }

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  icon: Icon,
  className,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
  breadcrumbs?: BreadcrumbItem[]
  icon?: LucideIcon
  className?: string
}) {
  const crumbs = breadcrumbs?.length
    ? breadcrumbs
    : [{ label: title }]

  return (
    <div className={cn('mb-6 flex flex-col gap-3', className)}>
      <nav className="flex flex-wrap items-center gap-1 text-sm text-[var(--muted)]" aria-label="Breadcrumb">
        <Link
          to="/"
          className="inline-flex items-center gap-1 rounded-md hover:text-[var(--primary)]"
          aria-label="Home"
        >
          <Home className="h-3.5 w-3.5" />
        </Link>
        {crumbs.map((crumb, i) => (
          <Fragment key={`${crumb.label}-${i}`}>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
            {crumb.href ? (
              <Link to={crumb.href} className="hover:text-[var(--primary)]">
                {crumb.label}
              </Link>
            ) : (
              <span className={i === crumbs.length - 1 ? 'font-medium text-[var(--foreground)]' : ''}>
                {crumb.label}
              </span>
            )}
          </Fragment>
        ))}
      </nav>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {Icon ? (
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <Icon className="h-5 w-5" strokeWidth={1.75} />
            </div>
          ) : null}
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--foreground)]">
              {title}
            </h1>
            {description ? <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">{description}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  )
}
