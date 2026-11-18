import type { ReactNode } from 'react'
import { Download, FileSpreadsheet, MoreHorizontal, RefreshCw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { EmptyBlock, LoadingBlock } from '@/components/shared/page-states'

export type DataTableColumn<T> = {
  key: string
  header: string
  className?: string
  cell: (row: T) => ReactNode
}

export type DataTableAction<T> = {
  label: string
  onClick: (row: T) => void
  destructive?: boolean
}

export function DataTable<T extends { _id?: string; id?: string }>({
  title,
  description,
  columns,
  rows,
  loading,
  error,
  onRetry,
  search,
  onSearchChange,
  onRefresh,
  onAdd,
  addLabel = 'Add New',
  onExportExcel,
  onExportPdf,
  actions,
  page,
  limit,
  total,
  onPageChange,
  onLimitChange,
  emptyTitle = 'No records found',
  emptyDescription = 'Create a new record to get started.',
  toolbarExtra,
}: {
  title?: string
  description?: string
  columns: DataTableColumn<T>[]
  rows: T[]
  loading?: boolean
  error?: boolean
  onRetry?: () => void
  search?: string
  onSearchChange?: (value: string) => void
  onRefresh?: () => void
  onAdd?: () => void
  addLabel?: string
  onExportExcel?: () => void
  onExportPdf?: () => void
  actions?: DataTableAction<T>[]
  page?: number
  limit?: number
  total?: number
  onPageChange?: (page: number) => void
  onLimitChange?: (limit: number) => void
  emptyTitle?: string
  emptyDescription?: string
  toolbarExtra?: ReactNode
}) {
  const totalPages = Math.max(1, Math.ceil((total ?? rows.length) / (limit ?? 20)))

  return (
    <Card className="overflow-hidden border-[var(--border)] shadow-[var(--shadow-card)]">
      <CardHeader className="space-y-4 border-b border-[var(--border)] bg-gradient-to-r from-[var(--card)] to-[var(--primary-soft)]/40 p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            {title ? <h2 className="font-display text-base font-semibold text-[var(--foreground)]">{title}</h2> : null}
            {description ? <p className="text-sm text-[var(--muted)]">{description}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onSearchChange ? (
              <div className="relative min-w-[220px] flex-1 sm:flex-none">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                <Input
                  value={search ?? ''}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search…"
                  className="h-10 rounded-full border-transparent bg-[var(--card)] pl-9"
                />
              </div>
            ) : null}
            {toolbarExtra}
            {onRefresh ? (
              <Button variant="outline" size="icon" onClick={onRefresh} title="Refresh">
                <RefreshCw className="h-4 w-4" />
              </Button>
            ) : null}
            {onExportExcel ? (
              <Button variant="outline" size="sm" onClick={onExportExcel}>
                <FileSpreadsheet className="h-4 w-4" />
                Excel
              </Button>
            ) : null}
            {onExportPdf ? (
              <Button variant="outline" size="sm" onClick={onExportPdf}>
                <Download className="h-4 w-4" />
                PDF
              </Button>
            ) : null}
            {onAdd ? <Button onClick={onAdd}>{addLabel}</Button> : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-6">
            <LoadingBlock label="Loading records…" />
          </div>
        ) : error ? (
          <div className="p-6 text-sm text-[var(--color-danger)]">
            Failed to load data.{' '}
            {onRetry ? (
              <button className="underline" onClick={onRetry}>
                Retry
              </button>
            ) : null}
          </div>
        ) : rows.length === 0 ? (
          <div className="space-y-4 p-8">
            <EmptyBlock title={emptyTitle} description={emptyDescription} />
            {onAdd ? (
              <div className="flex justify-center">
                <Button onClick={onAdd}>{addLabel}</Button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="sticky top-0 z-[1] bg-[#F8FAFF] text-[var(--muted)] dark:bg-[var(--background)]">
                <tr className="border-b border-[var(--border)]">
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={cn(
                        'px-4 py-3.5 text-[11px] font-semibold uppercase tracking-[0.06em]',
                        col.className,
                      )}
                    >
                      {col.header}
                    </th>
                  ))}
                  {actions?.length ? (
                    <th className="px-4 py-3.5 text-right text-[11px] font-semibold uppercase tracking-[0.06em]">
                      Actions
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const key = String(row._id ?? row.id ?? index)
                  return (
                    <tr
                      key={key}
                      className="border-b border-[var(--border)]/70 transition hover:bg-[var(--primary-soft)]/50"
                    >
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className={cn('px-4 py-3.5 align-middle text-[var(--foreground)]', col.className)}
                        >
                          {col.cell(row)}
                        </td>
                      ))}
                      {actions?.length ? (
                        <td className="px-4 py-3.5 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="rounded-full">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {actions.map((action) => (
                                <DropdownMenuItem
                                  key={action.label}
                                  className={action.destructive ? 'text-[var(--color-danger)]' : undefined}
                                  onClick={() => action.onClick(row)}
                                >
                                  {action.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      ) : null}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {typeof total === 'number' && onPageChange ? (
          <div className="flex flex-col gap-3 border-t border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
            <p>
              Showing page {page ?? 1} of {totalPages} · {total} total
            </p>
            <div className="flex items-center gap-2">
              {onLimitChange ? (
                <select
                  className="h-9 rounded-lg border border-[var(--border)] bg-[var(--input-bg)] px-2"
                  value={limit ?? 20}
                  onChange={(e) => onLimitChange(Number(e.target.value))}
                >
                  {[10, 20, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n} / page
                    </option>
                  ))}
                </select>
              ) : null}
              <Button variant="outline" size="sm" disabled={(page ?? 1) <= 1} onClick={() => onPageChange((page ?? 1) - 1)}>
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={(page ?? 1) >= totalPages}
                onClick={() => onPageChange((page ?? 1) + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
