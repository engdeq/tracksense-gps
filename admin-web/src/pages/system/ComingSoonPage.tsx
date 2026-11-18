import { Link } from 'react-router-dom'
import { Construction } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function ComingSoonPage({
  title,
  description,
  breadcrumbs,
  settingsHref,
}: {
  title: string
  description?: string
  breadcrumbs?: { label: string; href?: string }[]
  settingsHref?: string
}) {
  return (
    <div>
      <PageHeader title={title} description={description} breadcrumbs={breadcrumbs} />
      <Card>
        <CardContent className="flex min-h-[240px] flex-col items-center justify-center gap-4 p-10 text-center">
          <Construction className="h-12 w-12 text-[var(--primary)]" />
          <ComingSoonCopy />
          {settingsHref ? (
            <Button variant="outline" asChild>
              <Link to={settingsHref}>Open related settings</Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

function ComingSoonCopy() {
  return (
    <>
      <p className="font-display text-lg font-semibold">Coming soon</p>
      <p className="max-w-md text-sm text-[var(--muted)]">
        This module is on the roadmap. Core fleet features remain available from the sidebar.
      </p>
    </>
  )
}