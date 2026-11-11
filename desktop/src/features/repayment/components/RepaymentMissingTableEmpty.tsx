import { PiggyBank } from 'lucide-react'

import { Button } from '@/shared/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/shared/components/ui/empty'
import { Kbd } from '@/shared/components/ui/kbd'
import { cn } from '@/shared/lib/utils'

interface Props {
  className?: string
  onCreateCaseFile: () => void
}

export function RepaymentMissingTableEmpty({ className, onCreateCaseFile }: Props) {
  return (
    <Empty className={cn('min-h-40 flex-1', className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <PiggyBank />
        </EmptyMedia>
        <EmptyTitle size="sm">
          <Kbd>core.comptes_locataires.csv</Kbd> n’est pas disponible.
        </EmptyTitle>
        <EmptyDescription>
          Les écritures comptables ne sont pas disponibles. Les dossiers peuvent tout de même être
          créés et suivis ici.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button type="button" variant="outline" onClick={onCreateCaseFile}>
          Créer un dossier
        </Button>
      </EmptyContent>
    </Empty>
  )
}
