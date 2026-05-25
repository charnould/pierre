import { useCallback, useEffect, useState } from 'react'

import { fetchUpdateMarkdown, fetchUpdatesIndex } from '@/features/updates/lib/github-updates'
import type { UpdateEntry } from '@/features/updates/types'

type LoadState = 'idle' | 'loading' | 'ready' | 'error'

interface UseUpdatesResult {
  entries: UpdateEntry[]
  selectedSlug: string | null
  selectedEntry: UpdateEntry | null
  markdown: string | null
  indexState: LoadState
  markdownState: LoadState
  error: string | null
  selectSlug: (slug: string) => void
  retry: () => void
}

export function useUpdates(hidden: boolean): UseUpdatesResult {
  const [entries, setEntries] = useState<UpdateEntry[]>([])
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null)
  const [markdown, setMarkdown] = useState<string | null>(null)
  const [indexState, setIndexState] = useState<LoadState>('idle')
  const [markdownState, setMarkdownState] = useState<LoadState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const loadIndex = useCallback(async (force = false) => {
    setIndexState('loading')
    setError(null)
    try {
      const nextEntries = await fetchUpdatesIndex({ force })
      setEntries(nextEntries)
      setSelectedSlug((current) => {
        if (current && nextEntries.some((entry) => entry.slug === current)) return current
        return null
      })
      setIndexState('ready')
    } catch {
      setEntries([])
      setSelectedSlug(null)
      setIndexState('error')
      setError('Impossible de charger les mises à jour.')
    }
  }, [])

  useEffect(() => {
    if (hidden) return
    void loadIndex(reloadToken > 0)
  }, [hidden, loadIndex, reloadToken])

  useEffect(() => {
    if (hidden || !selectedSlug) {
      setMarkdown(null)
      setMarkdownState('idle')
      return
    }

    let cancelled = false
    setMarkdownState('loading')
    setMarkdown(null)
    setError(null)

    void fetchUpdateMarkdown(selectedSlug)
      .then((body) => {
        if (cancelled) return
        setMarkdown(body)
        setMarkdownState('ready')
      })
      .catch(() => {
        if (cancelled) return
        setMarkdown(null)
        setMarkdownState('error')
        setError("Impossible de charger l'article.")
      })

    return () => {
      cancelled = true
    }
  }, [hidden, selectedSlug])

  const selectedEntry = entries.find((entry) => entry.slug === selectedSlug) ?? null

  const retry = useCallback(() => {
    setReloadToken((token) => token + 1)
  }, [])

  return {
    entries,
    selectedSlug,
    selectedEntry,
    markdown,
    indexState,
    markdownState,
    error,
    selectSlug: setSelectedSlug,
    retry
  }
}
