import { formatActivityBoostAction } from '@/features/activity/lib/activity-boost-copy'
import { activity_payload, type Activite } from '@/shared/types/activites'

export const TIMELINE_MOVEMENT_TITLE = 'Mouvement comptable'

/** Past-tense verb for a drawer timeline activity row. */
export function timelineActivityActionVerb(row: Activite): string {
  const inbound = /^(tenant|candidate|external):/.test(row.auteur)
  switch (row.type) {
    case 'activity_boost': {
      const payload = activity_payload(row.type, row.contenu)
      const sourceType =
        typeof payload['type_activite_source'] === 'string'
          ? payload['type_activite_source']
          : row.type
      const emoji = typeof payload['emoji'] === 'string' ? payload['emoji'] : ''
      return formatActivityBoostAction(sourceType, emoji)
    }
    case 'note':
    case 'ticket_memo':
      return 'a laissé une note'
    case 'rcs':
      return inbound ? 'a répondu par RCS' : 'a envoyé un RCS'
    case 'sms':
      return 'a envoyé un SMS'
    case 'email':
      return inbound ? 'a répondu par courriel' : 'a envoyé un courriel'
    case 'email_import':
      return 'a importé un courriel'
    case 'courrier':
      return 'a envoyé un courrier'
    case 'lrar':
      return 'a envoyé une lettre recommandée'
    case 'lre':
      return 'a envoyé une lettre recommandée électronique'
    case 'signature':
      return 'a envoyé une demande de signature'
    case 'bulk_run':
      return 'a exécuté un traitement de masse'
    case 'bulk_application':
      return 'a appliqué un traitement de masse'
    case 'bulk_no_route':
      return 'n’a trouvé aucune route exploitable'
    case 'repayment_plan':
      return 'a créé un plan d’apurement'
    case 'repayment_plan_close':
      return 'a clôturé un plan d’apurement'
    case 'action': {
      if (row.event === 'created') return 'a créé une tâche'
      if (row.event === 'updated') return 'a modifié une tâche'
      if (row.event === 'completed') return 'a réalisé une tâche'
      if (row.event === 'ignored') return 'a ignoré une tâche'
      if (row.event === 'reopened') return 'a rouvert une tâche'
      return 'a publié une action'
    }
    case 'repayment_phase_change':
      return 'a changé le groupe'
    case 'repayment_assignment':
      return 'a affecté le dossier'
    case 'repayment_tag_change':
      return 'a mis à jour les tags'
    case 'ticket_change':
      return 'a mis à jour le ticket'
    case 'ticket_summary':
      return 'a résumé le ticket'
    case 'ticket_reply':
      return 'a pré-généré des réponses'
    case 'automation_report':
      return 'a publié un rapport'
    default:
      return 'a publié une activité'
  }
}

export function formatTimelineActivityTitle(actorName: string, row: Activite): string {
  const name = actorName.trim() || 'Inconnu'
  return `${name} ${timelineActivityActionVerb(row)}`
}
