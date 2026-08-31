import { Columns3 } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/shared/components/ui/dropdown-menu'
import { resolveTicketColumnLabel, type UiSettings } from '@/shared/lib/ui-settings/schema'
import type { TicketsColumnMeta } from '@/shared/types'

interface Props {
  columns: TicketsColumnMeta[]
  settings: UiSettings
  hiddenColumns: string[]
  onHiddenChange: (hiddenColumns: string[]) => void
  triggerClassName?: string
}

export function TicketsColumnVisibilityMenu({
  columns,
  settings,
  hiddenColumns,
  onHiddenChange,
  triggerClassName
}: Props) {
  const hiddenSet = new Set(hiddenColumns)

  const toggleColumn = (name: string, visible: boolean) => {
    const nextHidden = new Set(hiddenSet)
    if (visible) nextHidden.delete(name)
    else nextHidden.add(name)
    onHiddenChange(Array.from(nextHidden))
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        render={<Button type="button" variant="outline" size="sm" className={triggerClassName} />}
      >
        <Columns3 data-icon="inline-start" />
        Colonnes
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Colonnes</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {columns.map(({ name }) => (
            <DropdownMenuCheckboxItem
              key={name}
              checked={!hiddenSet.has(name)}
              onCheckedChange={(checked) => toggleColumn(name, checked)}
            >
              {resolveTicketColumnLabel(name, settings)}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
