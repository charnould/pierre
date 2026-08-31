import { useCallback, useEffect, useMemo, useState } from 'react'

import { useUpdateArticle } from '@/features/activity/hooks/useUpdateArticle'
import { useActivityRail } from '@/features/activity/lib/ActivityRailContext'
import type { ReaderTarget } from '@/features/activity/lib/reader-target'
import { UpdateArticleBody } from '@/features/updates/components/UpdateArticleBody'
import { UpdateReaderActions } from '@/features/updates/components/UpdateReaderActions'
import { UpdatesEntryMeta } from '@/features/updates/components/UpdatesEntryMeta'
import { updateGitHubWebUrl } from '@/features/updates/lib/updates-urls'
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

  const [copiedFor, setCopiedFor] = useState<string | null>(null)
  const plainText = markdown?.trim() ?? ''
  const copyKey = `${target.kind}:${'slug' in target ? target.slug : ''}:${plainText}`
  const copied = copiedFor === copyKey

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopiedFor(null), 2000)
    return () => window.clearTimeout(timer)
  }, [copied])

  const handleCopy = useCallback(async () => {
    if (!plainText) return
    try {
      await navigator.clipboard.writeText(plainText)
      setCopiedFor(copyKey)
    } catch {
      setCopiedFor(null)
    }
  }, [copyKey, plainText])

  const handleOpenGitHub = useCallback(() => {
    if (target.kind !== 'update') return
    void window.api.openExternal(updateGitHubWebUrl(target.slug))
  }, [target])

  const readerActions = useMemo(
    () => (
      <UpdateReaderActions
        copied={copied}
        copyDisabled={!plainText || loading || !!error}
        onCopy={() => void handleCopy()}
        onClose={closeReader}
        onOpenGitHub={target.kind === 'update' ? handleOpenGitHub : undefined}
      />
    ),
    [closeReader, copied, error, handleCopy, handleOpenGitHub, loading, plainText, target.kind]
  )

  if (target.kind !== 'update') return null

  return (
    <div
      data-tab-panel
      className="bg-background relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
    >
      <div className="flex min-h-0 flex-1 flex-col pt-2">
        <article className="border-border mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col overflow-hidden rounded-t-xl border border-b-0 text-pretty">
          <header className="border-border shrink-0 border-b">
            <div className="relative z-1 flex flex-col gap-2 px-4 pt-0 pb-4">
              <div className="flex items-start justify-between gap-4">
                <UpdatesEntryMeta date={target.date} />
                {readerActions}
              </div>
              <h1 className="pierre-display m-0 text-balance">{target.title}</h1>
            </div>
          </header>

          {loading ? (
            <div className="flex min-h-0 flex-1 scroll-pb-4 scrollbar-none flex-col overflow-x-hidden overflow-y-auto overscroll-contain py-4">
              <div className="text-muted-foreground flex items-center gap-2 px-4 text-sm">
                <Spinner className="size-4" />
                Chargement…
              </div>
            </div>
          ) : error ? (
            <div className="flex min-h-0 flex-1 scroll-pb-4 scrollbar-none flex-col overflow-x-hidden overflow-y-auto overscroll-contain py-4">
              <p className="text-destructive px-4 text-sm">{error}</p>
            </div>
          ) : markdown ? (
            <div className="flex min-h-0 flex-1 scroll-pb-4 scrollbar-none flex-col overflow-x-hidden overflow-y-auto overscroll-contain py-4">
              <div className="relative z-1 flex flex-col px-4 py-4">
                <UpdateArticleBody markdown={markdown} />
              </div>
            </div>
          ) : null}
        </article>
      </div>
    </div>
  )
}
