import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

import type { ReaderTarget } from '@/features/activity/lib/reader-target'
import type { ActivityTarget } from '@/shared/lib/navigation-snapshot'

export type ActivityRailTab = 'notifications' | 'activities'
export type TasksRailTab = 'mine' | 'delegated'

interface ActivityRailContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  railTab: ActivityRailTab
  setRailTab: (tab: ActivityRailTab) => void
  openRail: (tab: ActivityRailTab) => void
  tasksOpen: boolean
  setTasksOpen: (open: boolean) => void
  tasksTab: TasksRailTab
  setTasksTab: (tab: TasksRailTab) => void
  openTasksRail: (tab: TasksRailTab) => void
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
  const [open, setOpenState] = useState(false)
  const [railTab, setRailTab] = useState<ActivityRailTab>('notifications')
  const [tasksOpen, setTasksOpenState] = useState(false)
  const [tasksTab, setTasksTab] = useState<TasksRailTab>('mine')
  const [contextTarget, setContextTarget] = useState<ActivityTarget | null>(null)
  const [contextOpenToken, setContextOpenToken] = useState(0)
  const [readerTarget, setReaderTarget] = useState<ReaderTarget | null>(null)

  const setOpen = useCallback((next: boolean) => {
    setOpenState(next)
    if (next) setTasksOpenState(false)
  }, [])

  const setTasksOpen = useCallback((next: boolean) => {
    setTasksOpenState(next)
    if (next) setOpenState(false)
  }, [])

  const openRail = useCallback((tab: ActivityRailTab) => {
    setRailTab(tab)
    setOpenState(true)
    setTasksOpenState(false)
  }, [])

  const openTasksRail = useCallback((tab: TasksRailTab) => {
    setTasksTab(tab)
    setTasksOpenState(true)
    setOpenState(false)
  }, [])

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

  const value = useMemo(
    () => ({
      open,
      setOpen,
      railTab,
      setRailTab,
      openRail,
      tasksOpen,
      setTasksOpen,
      tasksTab,
      setTasksTab,
      openTasksRail,
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
      setOpen,
      railTab,
      openRail,
      tasksOpen,
      setTasksOpen,
      tasksTab,
      openTasksRail,
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
      railTab: 'notifications',
      setRailTab: () => {},
      openRail: () => {},
      tasksOpen: false,
      setTasksOpen: () => {},
      tasksTab: 'mine',
      setTasksTab: () => {},
      openTasksRail: () => {},
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
