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

import { togglableRepaymentColumnIds, type RepaymentColumnId } from '../lib/repayment-table-columns'

interface Props {
  activeColumnIds: RepaymentColumnId[]
  columnVisibility: Record<string, boolean>
  onToggleColumn: (columnId: RepaymentColumnId, visible: boolean) => void
  triggerClassName?: string
}

export function RepaymentColumnVisibilityMenu({
  activeColumnIds,
  columnVisibility,
  onToggleColumn,
  triggerClassName
}: Props) {
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
          <DropdownMenuLabel>Colonnes du tableau</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {togglableRepaymentColumnIds(activeColumnIds).map((columnId) => (
            <DropdownMenuCheckboxItem
              key={columnId}
              checked={columnVisibility[columnId] !== false}
              onCheckedChange={(checked) => onToggleColumn(columnId, checked)}
            >
              {columnId}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
