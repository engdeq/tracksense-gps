import { PageHeader } from '@/components/shared/PageHeader'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function PlaceholderPage({
  title,
  description,
  breadcrumbs,
}: {
  title: string
  description: string
  breadcrumbs?: { label: string; href?: string }[]
}) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} breadcrumbs={breadcrumbs} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Module ready for configuration</CardTitle>
          <CardDescription>
            Navigation and routing are live. Connect remaining domain workflows here without changing the shell.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-[var(--muted)]">
          This screen is intentionally available so database-driven menus resolve without broken routes.
        </CardContent>
      </Card>
    </div>
  )
}
