import type { ReactNode } from 'react'

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/shared/components/ui/empty'

export type WorkflowArtifactEmptyProps = {
  icon: ReactNode
  title: string
  description: string
}

export function WorkflowArtifactEmpty({ icon, title, description }: WorkflowArtifactEmptyProps) {
  return (
    <Empty className="workflow-artifact-empty h-full border-0">
      <EmptyHeader>
        <EmptyMedia
          variant="icon"
          className="workflow-artifact-empty__media bg-muted text-muted-foreground/55"
        >
          {icon}
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
