import { ArrowLeft } from 'lucide-react'
import { type ReactNode, useEffect } from 'react'

import {
  IntakeExportZipButton,
  IntakeReaderBody
} from '@/features/activity/components/IntakeReaderView'
import { useActivityRail } from '@/features/activity/lib/ActivityRailContext'
import type { ReaderTarget } from '@/features/activity/lib/reader-target'
import { UpdateArticleBody } from '@/features/updates/components/UpdateArticleBody'
import { UpdatesEntryMeta } from '@/features/updates/components/UpdatesEntryMeta'
import { useUpdateArticle } from '@/features/updates/hooks/useUpdateArticle'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Spinner } from '@/shared/components/ui/spinner'

interface Props {
  target: ReaderTarget
  url?: string
}

function ReaderShell({
  title,
  onBack,
  action,
  children
}: {
  title: string
  onBack: () => void
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <main data-tab-panel className="bg-background min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-8">
      <div className="max-w-document mx-auto flex w-full flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Retour"
            onClick={onBack}
          >
            <ArrowLeft />
          </Button>
          {action}
        </div>
        <h1 className="font-serif text-4xl leading-tight font-normal">{title}</h1>
        <Card>
          <CardContent>
            <div className="flex flex-col gap-4">{children}</div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

export function ActivityReaderView({ target, url }: Props) {
  const { closeReader } = useActivityRail()

  useEffect(() => {
    if (target.kind !== 'automation') return
    const html = target.content?.trim()
    if (html) void window.api?.openAutomationReport({ html })
    closeReader()
  }, [target, closeReader])

  const { markdown, loading, error } = useUpdateArticle(
    target.kind === 'update' ? target.slug : null
  )

  if (target.kind === 'intake') {
    const resetKey = `${target.intakeId}:${target.content.submissionId ?? target.date}`
    return (
      <ReaderShell
        title={target.title}
        onBack={closeReader}
        action={
          url ? (
            <IntakeExportZipButton key={target.intakeId} intakeId={target.intakeId} url={url} />
          ) : null
        }
      >
        <IntakeReaderBody key={resetKey} target={target} url={url} />
      </ReaderShell>
    )
  }

  if (target.kind !== 'update') return null

  return (
    <ReaderShell title={target.title} onBack={closeReader}>
      <UpdatesEntryMeta date={target.date} />
      {loading ? (
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <Spinner className="size-4" />
          Chargement…
        </p>
      ) : error ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : markdown ? (
        <UpdateArticleBody markdown={markdown} />
      ) : null}
    </ReaderShell>
  )
}
