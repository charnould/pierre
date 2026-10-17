import { BlockprintPiggyBank } from '@/shared/components/icons/koboyo-empty'
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
  onCreatePlan: () => void
}

export function RepaymentMissingTableEmpty({ className, onCreatePlan }: Props) {
  return (
    <Empty className={cn('min-h-40 flex-1', className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <BlockprintPiggyBank />
        </EmptyMedia>
        <EmptyTitle size="sm">
          <Kbd>core.comptes_locataires.csv</Kbd> n’est pas disponible.
        </EmptyTitle>
        <EmptyDescription>
          En conséquence, le suivi des dossiers d’impayés, des situations locatives et des
          procédures de recouvrement n’est pas disponible.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button type="button" variant="outline" onClick={onCreatePlan}>
          Créer un plan d&apos;apurement
        </Button>
      </EmptyContent>
    </Empty>
  )
}
