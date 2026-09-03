import type { ActivityType } from '@/shared/types/activites'

const BOOST_NOUNS: Partial<Record<ActivityType, string>> = {
  'note.published': 'note',
  'note.updated': 'note',
  'communication.sent': 'communication',
  'communication.received': 'communication',
  'communication.imported': 'courriel',
  'bulk.ran': 'traitement de masse',
  'bulk.applied': 'application de masse',
  'bulk.no_route': 'traitement sans route',
  'repayment_plan.created': 'plan d’apurement',
  'repayment_plan.closed': 'clôture de plan',
  'case.bucket_changed': 'changement de panier',
  'case.group_changed': 'changement de groupe',
  'case.assignee_changed': 'affectation',
  'case.tags_changed': 'mise à jour des tags',
  'task.created': 'tâche',
  'ticket.field_changed': 'ticket',
  'artifact.generated': 'document',
  'automation.reported': 'rapport'
}

const BOOST_OBJECTS: Partial<Record<ActivityType, string>> = {
  'note.published': 'une note',
  'note.updated': 'une note',
  'communication.sent': 'une communication',
  'communication.received': 'une communication',
  'communication.imported': 'un courriel',
  'bulk.ran': 'un traitement de masse',
  'bulk.applied': 'une application de masse',
  'bulk.no_route': 'un traitement sans route',
  'repayment_plan.created': 'un plan d’apurement',
  'repayment_plan.closed': 'une clôture de plan',
  'case.bucket_changed': 'un changement de panier',
  'case.group_changed': 'un changement de groupe',
  'case.assignee_changed': 'une affectation',
  'case.tags_changed': 'une mise à jour des tags',
  'task.created': 'une tâche',
  'ticket.field_changed': 'un ticket',
  'artifact.generated': 'un document',
  'automation.reported': 'un rapport'
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
