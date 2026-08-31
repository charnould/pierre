import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

import type { ReaderTarget } from '@/features/activity/lib/reader-target'
import type { ActivityTarget } from '@/shared/lib/navigation-snapshot'

interface ActivityRailContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  contextTarget: ActivityTarget | null
  contextOpenToken: number
  openContextTarget: (target: ActivityTarget) => void
  closeContextTarget: () => void
  readerTarget: ReaderTarget | null
  openReader: (target: ReaderTarget) => void
  closeReader: () => void
}

const ActivityRailContext = createContext<ActivityRailContextValue | null>(null)

export function ActivityRailProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [contextTarget, setContextTarget] = useState<ActivityTarget | null>(null)
  const [contextOpenToken, setContextOpenToken] = useState(0)
  const [readerTarget, setReaderTarget] = useState<ReaderTarget | null>(null)

  const openContextTarget = useCallback((target: ActivityTarget) => {
    setContextTarget(target)
    setContextOpenToken((token) => token + 1)
  }, [])

  const closeContextTarget = useCallback(() => {
    setContextTarget(null)
  }, [])

  const openReader = useCallback((target: ReaderTarget) => {
    setReaderTarget(target)
  }, [])

  const closeReader = useCallback(() => {
    setReaderTarget(null)
  }, [])

  if (!open && contextTarget != null) {
    setContextTarget(null)
  }

  const value = useMemo(
    () => ({
      open,
      setOpen,
      contextTarget,
      contextOpenToken,
      openContextTarget,
      closeContextTarget,
      readerTarget,
      openReader,
      closeReader
    }),
    [
      open,
      contextTarget,
      contextOpenToken,
      openContextTarget,
      closeContextTarget,
      readerTarget,
      openReader,
      closeReader
    ]
  )

  return <ActivityRailContext.Provider value={value}>{children}</ActivityRailContext.Provider>
}

export function useActivityRail(): ActivityRailContextValue {
  const ctx = useContext(ActivityRailContext)
  if (!ctx) {
    return {
      open: false,
      setOpen: () => {},
      contextTarget: null,
      contextOpenToken: 0,
      openContextTarget: () => {},
      closeContextTarget: () => {},
      readerTarget: null,
      openReader: () => {},
      closeReader: () => {}
    }
  }
  return ctx
}
