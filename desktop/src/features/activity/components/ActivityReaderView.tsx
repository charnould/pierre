import { ArrowLeft } from 'lucide-react'
import { useEffect } from 'react'

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
}

export function ActivityReaderView({ target }: Props) {
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

  if (target.kind !== 'update') return null

  return (
    <main data-tab-panel className="bg-background min-h-0 min-w-0 flex-1 overflow-y-auto px-4 py-8">
      <div className="max-w-document mx-auto flex w-full flex-col gap-4">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Retour"
          onClick={closeReader}
        >
          <ArrowLeft />
        </Button>
        <h1 className="font-serif text-4xl leading-tight font-normal">{target.title}</h1>
        <Card>
          <CardContent>
            <div className="flex flex-col gap-4">
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
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
