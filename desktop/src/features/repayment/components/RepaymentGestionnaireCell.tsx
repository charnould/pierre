import { CollaboratorChip } from '@/shared/components/inspector/collaborator-chip'

interface Props {
  identity: string
}

export function RepaymentGestionnaireCell({ identity }: Props) {
  if (!identity) return <span>—</span>

  return (
    <CollaboratorChip
      identity={identity}
      title={identity.includes('@') ? identity : undefined}
      className="max-w-full"
    />
  )
}
