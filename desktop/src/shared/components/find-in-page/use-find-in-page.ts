import { useEffect, useEffectEvent, useRef, useState } from 'react'

export type FindInPageMatch = {
  active: number
  total: number
}

export function useFindInPage() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [match, setMatch] = useState<FindInPageMatch | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const openRef = useRef(open)
  useEffect(() => {
    openRef.current = open
  })

  const focusInput = useEffectEvent(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  })

  function close() {
    setOpen(false)
    setMatch(null)
    void window.api.stopFindInPage('clearSelection')
  }

  function search(text: string, options?: { forward?: boolean; findNext?: boolean }) {
    if (!text) {
      setMatch(null)
      void window.api.stopFindInPage('clearSelection')
      return
    }
    // New session: omit findNext (Chromium default). Next/prev: findNext true.
    void window.api.findInPage(text, options)
  }

  function findNext(forward: boolean) {
    if (!query) return
    search(query, { findNext: true, forward })
  }

  // Effect-only: Escape must see the latest close without re-binding the listener.
  const onEscapeClose = useEffectEvent(() => {
    close()
  })

  useEffect(() => {
    return window.api.onFoundInPage((result) => {
      if (!openRef.current) return
      if (result.finalUpdate) {
        setMatch({ active: result.activeMatchOrdinal, total: result.matches })
        // findInPage steals focus to the match; restore the find field.
        requestAnimationFrame(() => inputRef.current?.focus())
      }
    })
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && openRef.current) {
        e.preventDefault()
        onEscapeClose()
        return
      }
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'f') return
      e.preventDefault()
      if (openRef.current) {
        focusInput()
        return
      }
      setOpen(true)
      queueMicrotask(() => focusInput())
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!open) return
    if (!query) {
      void window.api.stopFindInPage('clearSelection')
      return
    }
    void window.api.findInPage(query)
  }, [open, query])

  return {
    open,
    query,
    setQuery,
    match,
    inputRef,
    close,
    findNext
  }
}
