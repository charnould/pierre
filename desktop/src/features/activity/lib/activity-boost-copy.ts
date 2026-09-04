import type { ActivityType } from '@/shared/types/activites'

const BOOST_NOUNS: Partial<Record<ActivityType, string>> = {
  note: 'note',
  ticket_memo: 'note',
  rcs: 'RCS',
  email: 'courriel',
  email_import: 'courriel',
  courrier: 'courrier',
  lrar: 'lettre recommandée',
  lre: 'lettre recommandée électronique',
  signature: 'demande de signature',
  bulk_run: 'traitement de masse',
  bulk_application: 'application de masse',
  bulk_no_route: 'traitement sans route',
  repayment_plan: 'plan d’apurement',
  repayment_plan_close: 'clôture de plan',
  case_bucket_change: 'changement de panier',
  case_assignment: 'affectation',
  case_tag_change: 'mise à jour des tags',
  action: 'action',
  ticket_change: 'ticket',
  ticket_summary: 'résumé',
  ticket_reply: 'réponses',
  automation_report: 'rapport'
}

const BOOST_OBJECTS: Partial<Record<ActivityType, string>> = {
  note: 'une note',
  ticket_memo: 'une note',
  rcs: 'un RCS',
  email: 'un courriel',
  email_import: 'un courriel',
  courrier: 'un courrier',
  lrar: 'une lettre recommandée',
  lre: 'une lettre recommandée électronique',
  signature: 'une demande de signature',
  bulk_run: 'un traitement de masse',
  bulk_application: 'une application de masse',
  bulk_no_route: 'un traitement sans route',
  repayment_plan: 'un plan d’apurement',
  repayment_plan_close: 'une clôture de plan',
  case_bucket_change: 'un changement de panier',
  case_assignment: 'une affectation',
  case_tag_change: 'une mise à jour des tags',
  action: 'une tâche',
  ticket_change: 'un ticket',
  ticket_summary: 'un résumé',
  ticket_reply: 'des réponses',
  automation_report: 'un rapport'
}

export function activityBoostNoun(type: ActivityType | string): string {
  return BOOST_NOUNS[type as ActivityType] ?? 'action'
}

export function formatActivityBoostBody(type: ActivityType | string, emoji: string): string {
  const noun = activityBoostNoun(type)
  const mark = emoji.trim()
  return mark ? `a boosté votre ${noun} ${mark}` : `a boosté votre ${noun}`
}

export function formatActivityBoostAction(type: ActivityType | string, emoji: string): string {
  const object = BOOST_OBJECTS[type as ActivityType] ?? 'une activité'
  const mark = emoji.trim()
  return mark ? `a boosté ${object} ${mark}` : `a boosté ${object}`
}
