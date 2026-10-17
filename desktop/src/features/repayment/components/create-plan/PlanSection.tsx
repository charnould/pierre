import type { ReactNode } from 'react'

import { FieldDescription, FieldGroup, FieldLegend, FieldSet } from '@/shared/components/ui/field'

export function PlanSection({
  title,
  description,
  action,
  children
}: {
  title: string
  description: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <FieldSet>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col">
          <FieldLegend variant="legend">{title}</FieldLegend>
          <FieldDescription>{description}</FieldDescription>
        </div>
        {action}
      </div>
      <FieldGroup>{children}</FieldGroup>
    </FieldSet>
  )
}
