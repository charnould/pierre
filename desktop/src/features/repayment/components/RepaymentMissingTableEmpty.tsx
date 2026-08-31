import { CartoonErrorObject } from '@/shared/components/icons/koboyo-empty'
import { Button } from '@/shared/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/shared/components/ui/empty'
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
          <CartoonErrorObject />
        </EmptyMedia>
        <EmptyTitle className="text-sm leading-5 font-medium">
          comptes_locataires n’est pas défini
        </EmptyTitle>
        <EmptyDescription>
          La table SQLite comptes_locataires est absente du datastore. Les soldes locataires ne
          peuvent pas être calculés.
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
