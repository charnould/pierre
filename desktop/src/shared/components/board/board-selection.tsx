import { createContext, type ReactNode, use } from 'react'

import { Checkbox } from '@/shared/components/ui/checkbox'

type BoardSelection = {
  checkedIds: ReadonlySet<string>
  disabled: boolean
  onCheckedChange: (id: string, checked: boolean) => void
}

const BoardSelectionContext = createContext<BoardSelection | null>(null)

export function BoardSelectionProvider({
  value,
  children
}: {
  value: BoardSelection
  children: ReactNode
}) {
  return <BoardSelectionContext.Provider value={value}>{children}</BoardSelectionContext.Provider>
}

export function useBoardSelection(): BoardSelection | null {
  return use(BoardSelectionContext)
}

export function BoardSelectionCell({ id, label }: { id: string; label: string }) {
  const selection = use(BoardSelectionContext)
  if (!selection) return null
  return (
    <div
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <Checkbox
        checked={selection.checkedIds.has(id)}
        disabled={selection.disabled}
        aria-label={label}
        onCheckedChange={(checked) => selection.onCheckedChange(id, checked === true)}
      />
    </div>
  )
}
