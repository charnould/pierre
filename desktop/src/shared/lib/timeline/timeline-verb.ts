import {
  type Activity,
  type CommunicationChannel,
  communicationChannelLabel,
  isCommunicationOpenedType,
  parseActivityContent,
  parseCaseChangeContent,
  parseCommunicationOpenedContent,
  parseSignatureContent
} from '@/shared/types/activites'

function channelNoun(channel: CommunicationChannel): string {
  switch (channel) {
    case 'rcs':
      return 'un RCS'
    case 'sms':
      return 'un SMS'
    case 'email':
      return 'un courriel'
    case 'postal_letter':
      return 'un courrier postal simple'
    case 'postal_registered_letter_with_acknowledgement':
      return 'une lettre recommandée avec accusé de réception (LRAR)'
    case 'electronic_registered_delivery':
      return 'un envoi recommandé électronique (ERE)'
    case 'electronic_registered_letter':
      return 'une lettre recommandée électronique (LRE)'
  }
}

function communicationVerb(row: Activity): string {
  const content = parseCommunicationOpenedContent(row.contenu)
  const channel = row.channel
  if (!channel) return 'a publié une communication'
  if (row.type === 'communication.imported') return 'a importé un courriel'
  const inbound = /^(tenant|candidate|external):/.test(row.auteur)
  const verb = inbound
    ? `a répondu par ${communicationChannelLabel(channel)}`
    : `a envoyé ${channelNoun(channel)}`
  const extras = [content?.action, row.bulkId ? 'Traitement de masse' : null].filter(
    (value): value is string => Boolean(value)
  )
  return extras.length > 0 ? `${verb} · ${extras.join(' · ')}` : verb
}

export function timelineActivityVerb(row: Activity): string {
  if (isCommunicationOpenedType(row.type)) return communicationVerb(row)

  switch (row.type) {
    case 'note.published':
      return 'a laissé une note'
    case 'note.updated':
      return 'a modifié une note'
    case 'note.withdrawn':
      return 'a retiré une note'
    case 'task.created':
      return 'a créé une tâche'
    case 'task.updated':
      return 'a modifié une tâche'
    case 'task.completed':
      return 'a réalisé une tâche'
    case 'task.ignored':
      return 'a ignoré une tâche'
    case 'task.reopened':
      return 'a rouvert une tâche'
    case 'task.deleted':
      return 'a supprimé une tâche'
    case 'case.group_changed':
      return 'a changé la phase'
    case 'case.bucket_changed':
      return 'a déplacé le dossier de panier'
    case 'case.assignee_changed': {
      const change = parseCaseChangeContent(row.contenu)
      return change?.before ? 'a réaffecté le dossier' : 'a affecté le dossier'
    }
    case 'case.tags_changed':
      return 'a mis à jour les tags'
    case 'ticket.field_changed': {
      const content = parseActivityContent(row.type, row.contenu)
      const field =
        content && 'field' in content && typeof content.field === 'string'
          ? content.field
          : 'le ticket'
      return `a modifié ${field}`
    }
    case 'repayment_plan.created':
      return 'a créé un plan d’apurement'
    case 'repayment_plan.updated':
      return 'a modifié un plan d’apurement'
    case 'repayment_plan.finalized':
      return 'a finalisé un plan d’apurement'
    case 'repayment_plan.closed':
      return 'a clôturé un plan d’apurement'
    case 'artifact.generated':
      return 'a généré un document'
    case 'artifact.regenerated':
      return 'a régénéré un document'
    case 'artifact.finalized':
      return 'a finalisé un document'
    case 'artifact.discarded':
      return 'a écarté un document'
    case 'artifact.feedback_recorded':
      return 'a évalué un document'
    case 'automation.reported':
      return 'a publié un rapport'
    case 'bulk.ran':
      return 'a exécuté un traitement de masse'
    case 'bulk.applied':
      return 'a appliqué un traitement de masse'
    case 'bulk.no_route':
      return 'n’a trouvé aucune route exploitable'
    case 'ledger.movement_recorded':
      return 'a enregistré un mouvement comptable'
    case 'document.generated':
      return 'a généré un document'
    case 'document.sent_for_signature': {
      const content = parseSignatureContent(row.contenu)
      const title = content?.document.title ?? 'un document'
      return `a envoyé ${title} pour signature électronique`
    }
    case 'document.signed': {
      const content = parseSignatureContent(row.contenu)
      return `a signé ${content?.document.title ?? 'le document'}`
    }
    case 'document.signature_refused':
      return 'a refusé de signer un document'
    case 'document.signature_expired':
      return 'n’a pas signé un document à temps'
    case 'document.signature_cancelled':
      return 'a annulé une demande de signature'
    case 'document.signature_recorded': {
      const content = parseSignatureContent(row.contenu)
      return `a consigné la signature de ${content?.document.title ?? 'un document'}`
    }
    case 'communication.ok':
    case 'communication.failed':
    case 'activity.read':
    case 'activity.unread':
    case 'activity.reaction_changed':
      return 'a mis à jour une activité'
    default:
      return 'a publié une activité'
  }
}
