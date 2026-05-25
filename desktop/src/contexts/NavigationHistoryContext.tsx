import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react'

import {
  canGoBackInTicketsStack,
  canGoForwardInTicketsStack,
  createNavigationStack,
  goBackInStack,
  goForwardInStack,
  pushNavigationEntry,
  replaceNavigationEntry,
  type NavigationStack
} from '@/shared/lib/navigation-history'
import {
  mergeSnapshot,
  snapshotsEqual,
  type NavigationSnapshot
} from '@/shared/lib/navigation-snapshot'
import type { Tab } from '@/shared/lib/tabs'

type SnapshotGetter = () => Partial<NavigationSnapshot>
type SnapshotApplier = (snapshot: NavigationSnapshot) => void | Promise<void>
type BeforeLeaveHook = (leaving: NavigationSnapshot) => void | Promise<void>

type TabHandlers = {
  getSnapshot?: SnapshotGetter
  applySnapshot?: SnapshotApplier
  beforeLeave?: BeforeLeaveHook
}

type NavigateOptions = {
  replace?: boolean
}

type NavigationHistoryContextValue = {
  showTitleBarHistory: boolean
  canGoBack: boolean
  canGoForward: boolean
  navigate: (partial: Partial<NavigationSnapshot>, options?: NavigateOptions) => void
  goBack: () => Promise<void>
  goForward: () => Promise<void>
  register: (tab: Tab, handlers: TabHandlers) => void
  unregister: (tab: Tab) => void
}

const NavigationHistoryContext = createContext<NavigationHistoryContextValue | null>(null)

interface ProviderProps {
  children: ReactNode
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

export function NavigationHistoryProvider({ children, activeTab, onTabChange }: ProviderProps) {
  const [stack, setStack] = useState<NavigationStack>(() =>
    createNavigationStack({ tab: activeTab })
  )
  const isRestoringRef = useRef(false)
  const activeTabRef = useRef(activeTab)
  const handlersRef = useRef<Partial<Record<Tab, TabHandlers>>>({})

  activeTabRef.current = activeTab

  const readTabSnapshot = useCallback((tab: Tab): Partial<NavigationSnapshot> => {
    const getter = handlersRef.current[tab]?.getSnapshot
    return getter ? getter() : {}
  }, [])

  const buildCurrentSnapshot = useCallback((): NavigationSnapshot => {
    const tab = activeTabRef.current
    return mergeSnapshot({ tab }, readTabSnapshot(tab))
  }, [readTabSnapshot])

  const buildNavigateSnapshot = useCallback(
    (partial: Partial<NavigationSnapshot>): NavigationSnapshot => {
      const currentTab = activeTabRef.current
      const targetTab = partial.tab ?? currentTab

      if (targetTab !== currentTab) {
        const targetBase: NavigationSnapshot = { tab: targetTab }
        return mergeSnapshot(mergeSnapshot(targetBase, readTabSnapshot(targetTab)), partial)
      }

      return mergeSnapshot(buildCurrentSnapshot(), partial)
    },
    [buildCurrentSnapshot, readTabSnapshot]
  )

  const runBeforeLeave = useCallback(async (leaving: NavigationSnapshot) => {
    const hook = handlersRef.current[leaving.tab]?.beforeLeave
    if (hook) await hook(leaving)
  }, [])

  const applySnapshot = useCallback(
    async (snapshot: NavigationSnapshot) => {
      isRestoringRef.current = true
      try {
        if (snapshot.tab !== activeTabRef.current) {
          onTabChange(snapshot.tab)
        }
        const applier = handlersRef.current[snapshot.tab]?.applySnapshot
        if (applier) await applier(snapshot)
      } finally {
        isRestoringRef.current = false
      }
    },
    [onTabChange]
  )

  const navigate = useCallback(
    (partial: Partial<NavigationSnapshot>, options?: NavigateOptions) => {
      if (isRestoringRef.current) return

      const next = buildNavigateSnapshot(partial)
      const isTabChange = next.tab !== activeTabRef.current

      void (async () => {
        if (isTabChange) {
          await runBeforeLeave(buildCurrentSnapshot())
        }

        let snapshotToApply: NavigationSnapshot | undefined

        if (options?.replace) {
          setStack((prev) => {
            const replaced = replaceNavigationEntry(prev, next)
            snapshotToApply = replaced.entries[replaced.index]!
            return replaced
          })
        } else {
          setStack((prev) => {
            const currentLive = buildCurrentSnapshot()
            const entries = [...prev.entries]
            if (entries[prev.index] && !snapshotsEqual(entries[prev.index]!, currentLive)) {
              entries[prev.index] = currentLive
            }

            const stackWithSyncedCurrent = { entries, index: prev.index }
            const pushed = pushNavigationEntry(stackWithSyncedCurrent, next)
            snapshotToApply = pushed.entries[pushed.index]!
            return pushed
          })
        }

        if (snapshotToApply) await applySnapshot(snapshotToApply)
      })()
    },
    [applySnapshot, buildCurrentSnapshot, buildNavigateSnapshot, runBeforeLeave]
  )

  const goBack = useCallback(async () => {
    let leaving: NavigationSnapshot | undefined
    let target: NavigationSnapshot | undefined

    setStack((prev) => {
      leaving = prev.entries[prev.index]
      if (prev.index <= 0) return prev
      const nextStack = goBackInStack(prev)
      if (!nextStack) return prev
      target = nextStack.entries[nextStack.index]
      return nextStack
    })

    if (!leaving || !target) return

    await runBeforeLeave(leaving)
    await applySnapshot(target)
  }, [applySnapshot, runBeforeLeave])

  const goForward = useCallback(async () => {
    let target: NavigationSnapshot | undefined

    setStack((prev) => {
      const nextStack = goForwardInStack(prev)
      if (!nextStack) return prev
      target = nextStack.entries[nextStack.index]
      return nextStack
    })

    if (!target) return

    await applySnapshot(target)
  }, [applySnapshot])

  const register = useCallback((tab: Tab, handlers: TabHandlers) => {
    handlersRef.current[tab] = handlers

    const getter = handlers.getSnapshot
    if (!getter) return

    setStack((prev) => {
      const current = prev.entries[prev.index]
      if (!current || current.tab !== tab) return prev

      const enriched = mergeSnapshot({ tab }, getter())
      if (snapshotsEqual(current, enriched)) return prev

      const entries = [...prev.entries]
      entries[prev.index] = enriched
      return { ...prev, entries }
    })
  }, [])

  const unregister = useCallback((tab: Tab) => {
    delete handlersRef.current[tab]
  }, [])

  const value = useMemo<NavigationHistoryContextValue>(() => {
    const current = stack.entries[stack.index]
    const onTickets = current?.tab === 'tickets'
    const canBack = canGoBackInTicketsStack(stack)
    const canForward = canGoForwardInTicketsStack(stack)

    return {
      showTitleBarHistory: onTickets && (canBack || canForward),
      canGoBack: canBack,
      canGoForward: canForward,
      navigate,
      goBack,
      goForward,
      register,
      unregister
    }
  }, [goBack, goForward, navigate, register, stack, unregister])

  return (
    <NavigationHistoryContext.Provider value={value}>{children}</NavigationHistoryContext.Provider>
  )
}

export function useNavigationHistory() {
  const ctx = useContext(NavigationHistoryContext)
  if (!ctx) throw new Error('useNavigationHistory must be used within NavigationHistoryProvider')
  return ctx
}

export function useRegisterNavigationHandlers(
  tab: Tab,
  handlers: {
    getSnapshot?: () => Partial<NavigationSnapshot>
    applySnapshot?: (snapshot: NavigationSnapshot) => void | Promise<void>
    beforeLeave?: (leaving: NavigationSnapshot) => void | Promise<void>
  }
) {
  const { register, unregister } = useNavigationHistory()
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    register(tab, {
      getSnapshot: () => handlersRef.current.getSnapshot?.() ?? {},
      applySnapshot: (snapshot) => handlersRef.current.applySnapshot?.(snapshot),
      beforeLeave: (leaving) => handlersRef.current.beforeLeave?.(leaving)
    })
    return () => unregister(tab)
  }, [register, tab, unregister])
}
