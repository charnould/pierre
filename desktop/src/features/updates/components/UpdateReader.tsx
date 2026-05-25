import { MousePointerClick } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { UpdateArticleBody } from '@/features/updates/components/UpdateArticleBody'
import { UpdateReaderActions } from '@/features/updates/components/UpdateReaderActions'
import { audienceBadgeVariant, audienceLabel } from '@/features/updates/lib/audience-display'
import { updateGitHubWebUrl } from '@/features/updates/lib/updates-urls'
import type { UpdateEntry } from '@/features/updates/types'
import { Badge } from '@/shared/components/ui/badge'
import { Card, CardBody } from '@/shared/components/ui/card'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/shared/components/ui/empty'
import { Spinner } from '@/shared/components/ui/spinner'

const READER_EMPTY = {
  title: 'Aucun article sélectionné',
  description: 'Sélectionnez un article dans la liste pour le lire.'
} as const

function formatReaderDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

interface UpdateReaderProps {
  entry: UpdateEntry | null
  markdown: string | null
  loading: boolean
  error: string | null
}

export function UpdateReader({ entry, markdown, loading, error }: UpdateReaderProps) {
  const [copied, setCopied] = useState(false)
  const plainText = markdown?.trim() ?? ''

  useEffect(() => {
    setCopied(false)
  }, [entry?.slug, markdown])

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(timer)
  }, [copied])

  const handleCopy = useCallback(async () => {
    if (!plainText) return
    try {
      await navigator.clipboard.writeText(plainText)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }, [plainText])

  const handleOpenGitHub = useCallback(() => {
    if (!entry) return
    void window.api.openExternal(updateGitHubWebUrl(entry.slug))
  }, [entry])

  return (
    <div className="desk-output-panel">
      <Card variant="report">
        <CardBody inset="report">
          {!entry ? (
            <Empty className="desk-output-empty">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <MousePointerClick />
                </EmptyMedia>
                <EmptyTitle>{READER_EMPTY.title}</EmptyTitle>
                <EmptyDescription>{READER_EMPTY.description}</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <article className="workflow-output-column workflow-output-artifact workflow-output-artifact--reponse min-h-0 flex-1">
              <div className="workflow-output-artifact-body">
                <div className="workflow-output-column__response">
                  <div className="workflow-artifact-editor-root">
                    <div className="workflow-artifact-editor">
                      <div className="workflow-artifact-editor-scroll workflow-artifact-body-scroll">
                        <header className="border-border-soft mb-6 shrink-0 border-b pb-4">
                          <div className="flex items-center gap-x-2 gap-y-1">
                            <div className="text-muted-foreground flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-snug">
                              <time dateTime={entry.date}>{formatReaderDate(entry.date)}</time>
                              <Badge
                                variant={audienceBadgeVariant(entry.audience)}
                                className="shrink-0"
                              >
                                {audienceLabel(entry.audience)}
                              </Badge>
                            </div>
                            <UpdateReaderActions
                              copied={copied}
                              copyDisabled={!plainText || loading || !!error}
                              onCopy={() => void handleCopy()}
                              onOpenGitHub={handleOpenGitHub}
                              className="ml-auto"
                            />
                          </div>
                          <h1 className="text-foreground mt-2 text-xl leading-tight font-semibold tracking-tight text-balance">
                            {entry.title}
                          </h1>
                        </header>

                        {loading ? (
                          <div className="text-muted-foreground flex items-center gap-2 text-sm">
                            <Spinner className="size-4" />
                            Chargement…
                          </div>
                        ) : error ? (
                          <p className="text-destructive text-sm">{error}</p>
                        ) : markdown ? (
                          <UpdateArticleBody markdown={markdown} />
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
