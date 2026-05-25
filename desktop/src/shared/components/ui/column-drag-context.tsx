import { createContext, useContext, useMemo, type ReactNode } from 'react'

export type ColumnDragSortableData = {
  title: string
}

type ColumnDragContextValue = {
  isDragging: boolean
  activeColumnId: string | null
  overColumnId: string | null
  canDropOn: (overId: string) => boolean
  getInsertEdge: (overId: string) => 'left' | 'right' | null
}

const ColumnDragContext = createContext<ColumnDragContextValue | null>(null)

export function useColumnDragContext(): ColumnDragContextValue | null {
  return useContext(ColumnDragContext)
}

type ProviderProps = {
  children: ReactNode
  pinnedLeft: string[]
  visibleColumnIds: string[]
  activeColumnId: string | null
  overColumnId: string | null
}

export function ColumnDragProvider({
  children,
  pinnedLeft,
  visibleColumnIds,
  activeColumnId,
  overColumnId
}: ProviderProps) {
  const value = useMemo<ColumnDragContextValue>(() => {
    const pinnedSet = new Set(pinnedLeft)
    const isDragging = activeColumnId !== null

    const canDropOn = (overId: string): boolean => {
      if (!activeColumnId || activeColumnId === overId) return false
      const activePinned = pinnedSet.has(activeColumnId)
      const overPinned = pinnedSet.has(overId)
      return activePinned === overPinned
    }

    const getInsertEdge = (overId: string): 'left' | 'right' | null => {
      if (!activeColumnId || !overColumnId || overId !== overColumnId || !canDropOn(overId)) {
        return null
      }
      const activeIdx = visibleColumnIds.indexOf(activeColumnId)
      const overIdx = visibleColumnIds.indexOf(overId)
      if (activeIdx === -1 || overIdx === -1 || activeIdx === overIdx) return null
      return activeIdx < overIdx ? 'right' : 'left'
    }

    return {
      isDragging,
      activeColumnId,
      overColumnId,
      canDropOn,
      getInsertEdge
    }
  }, [pinnedLeft, visibleColumnIds, activeColumnId, overColumnId])

  return <ColumnDragContext.Provider value={value}>{children}</ColumnDragContext.Provider>
}
