import { useCallback, useEffect, useState } from 'react'

import { fetchUpdateMarkdown } from '@/features/updates/lib/github-updates'

interface UseUpdateArticleResult {
  markdown: string | null
  loading: boolean
  error: string | null
  retry: () => void
}

type ArticleSnapshot = {
  slug: string
  markdown: string | null
  error: string | null
}

export function useUpdateArticle(slug: string | null): UseUpdateArticleResult {
  const [snapshot, setSnapshot] = useState<ArticleSnapshot | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    if (!slug) return

    let cancelled = false
    void fetchUpdateMarkdown(slug)
      .then((body) => {
        if (cancelled) return
        setSnapshot({ slug, markdown: body, error: null })
      })
      .catch(() => {
        if (cancelled) return
        setSnapshot({
          slug,
          markdown: null,
          error: "Impossible de charger l'article."
        })
      })

    return () => {
      cancelled = true
    }
  }, [slug, reloadToken])

  const retry = useCallback(() => {
    setReloadToken((token) => token + 1)
  }, [])

  if (!slug) {
    return { markdown: null, loading: false, error: null, retry }
  }

  const current = snapshot?.slug === slug ? snapshot : null
  return {
    markdown: current?.markdown ?? null,
    loading: current == null,
    error: current?.error ?? null,
    retry
  }
}
