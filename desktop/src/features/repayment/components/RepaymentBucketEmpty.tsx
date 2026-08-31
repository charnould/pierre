import { EmptyFolder } from '@/shared/components/icons/koboyo-empty'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/shared/components/ui/empty'
import { cn } from '@/shared/lib/utils'

type Variant = 'phase-empty' | 'filters'

const COPY: Record<Variant, { title: string; description: string }> = {
  'phase-empty': {
    title: 'Aucun dossier dans cette phase',
    description: 'Aucun locataire n’est classé dans cette phase pour le moment.'
  },
  filters: {
    title: 'Aucun dossier correspondant',
    description:
      'Des dossiers existent dans cette phase, mais aucun ne correspond aux filtres actifs.'
  }
}

interface Props {
  /** Phase sans aucun dossier (avant filtres). */
  bucketEmpty: boolean
  className?: string
}

export function RepaymentBucketEmpty({ bucketEmpty, className }: Props) {
  const { title, description } = COPY[bucketEmpty ? 'phase-empty' : 'filters']

  return (
    <Empty className={cn('min-h-40', className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon" size="sm">
          <EmptyFolder />
        </EmptyMedia>
        <EmptyTitle className="text-sm leading-5 font-medium">{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
