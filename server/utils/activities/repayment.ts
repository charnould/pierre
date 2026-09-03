import { Database } from 'bun:sqlite'

import { parse_action_activity_content, parse_contenu_json } from '../../../shared/activites'
import { chronological_date_key, sql_date_key } from '../sql-normalization'

export type RepaymentActivityState = {
  bucket: string | null
  derniere_action_realisee: string | null
  date_derniere_action_realisee: string | null
  gestionnaire: string | null
  gestionnaire_email: string | null
}

export const latest_repayment_states = (
  db: Database,
  tenantIds: string[]
): Map<string, RepaymentActivityState> => {
  const result = new Map<string, RepaymentActivityState>()
  const ids = [...new Set(tenantIds.filter(Boolean))]
  if (ids.length === 0) return result
  const placeholders = ids.map(() => '?').join(', ')
  const rows = db
    .query<
      {
        id_locataire: string
        type: string
        statut: string | null
        date_creation: string
        contenu: string
      },
      string[]
    >(
      `SELECT id_locataire, type, statut, date_creation, contenu
       FROM activites
       WHERE id_locataire IN (${placeholders})
         AND rattachement = 'repayment:' || id_locataire
         AND type IN (
           'repayment_phase_change', 'repayment_assignment',
           'action', 'bulk_application',
           'rcs', 'sms', 'email', 'courrier', 'lrar', 'lre', 'signature'
         )
       ORDER BY ${sql_date_key('date_creation')} DESC, id DESC`
    )
    .all(...ids)
  const bucketResolved = new Set<string>()
  const actionDates = new Map<string, string>()
  const gestionnaireResolved = new Set<string>()
  for (const row of rows) {
    const state = result.get(row.id_locataire) ?? {
      bucket: null,
      derniere_action_realisee: null,
      date_derniere_action_realisee: null,
      gestionnaire: null,
      gestionnaire_email: null
    }
    const metadata = parse_contenu_json(row.contenu)
    if (
      !bucketResolved.has(row.id_locataire) &&
      (row.type === 'repayment_phase_change' || row.type === 'bulk_application') &&
      typeof metadata['phase'] === 'string'
    ) {
      state.bucket = metadata['phase']
      bucketResolved.add(row.id_locataire)
    }
    const action = row.type === 'action' ? parse_action_activity_content(row.contenu) : null
    const actionLabel =
      action?.etat === 'fait'
        ? action.action
        : row.type === 'bulk_application' && typeof metadata['action'] === 'string'
          ? metadata['action']
          : row.type !== 'action' &&
              row.type !== 'bulk_application' &&
              row.statut != null &&
              ['sent', 'delivered', 'read', 'signed'].includes(row.statut) &&
              typeof metadata['action'] === 'string'
            ? metadata['action']
            : null
    const actionDate = actionLabel ? row.date_creation : null
    const actionDateKey = actionDate ? chronological_date_key(actionDate) : null
    const latestActionDateKey = actionDates.get(row.id_locataire)
    if (
      actionLabel &&
      actionDate &&
      actionDateKey &&
      (!latestActionDateKey || actionDateKey > latestActionDateKey)
    ) {
      state.derniere_action_realisee = actionLabel
      state.date_derniere_action_realisee = actionDate
      actionDates.set(row.id_locataire, actionDateKey)
    }
    if (!gestionnaireResolved.has(row.id_locataire) && row.type === 'repayment_assignment') {
      const apres = metadata['gestionnaire']
      if (typeof apres === 'string' && apres.trim() !== '') {
        state.gestionnaire = apres.trim()
        state.gestionnaire_email = apres.trim().toLowerCase()
        gestionnaireResolved.add(row.id_locataire)
      }
    }
    result.set(row.id_locataire, state)
  }
  return result
}

/** Latest repayment tag snapshot per tenant; tenants without a snapshot have no tags. */
export const repayment_action_history = (
  db: Database,
  tenantIds: string[]
): Map<string, Set<string>> => {
  const result = new Map<string, Set<string>>()
  const ids = [...new Set(tenantIds.filter(Boolean))]
  if (ids.length === 0) return result
  const placeholders = ids.map(() => '?').join(', ')
  const rows = db
    .query<
      { id_locataire: string; type: string; statut: string | null; contenu: string },
      string[]
    >(
      `SELECT id_locataire, type, statut, contenu
       FROM activites
       WHERE id_locataire IN (${placeholders})
         AND rattachement = 'repayment:' || id_locataire
         AND type IN (
           'action', 'bulk_application',
           'rcs', 'sms', 'email', 'courrier', 'lrar', 'lre', 'signature'
         )`
    )
    .all(...ids)
  for (const row of rows) {
    const metadata = parse_contenu_json(row.contenu)
    const action = row.type === 'action' ? parse_action_activity_content(row.contenu) : null
    const label =
      action?.etat === 'fait'
        ? action.action
        : row.type === 'bulk_application' && typeof metadata['action'] === 'string'
          ? metadata['action']
          : row.type !== 'action' &&
              row.type !== 'bulk_application' &&
              row.statut != null &&
              ['sent', 'delivered', 'read', 'signed'].includes(row.statut) &&
              typeof metadata['action'] === 'string'
            ? metadata['action']
            : null
    if (!label?.trim()) continue
    const set = result.get(row.id_locataire) ?? new Set<string>()
    set.add(label)
    result.set(row.id_locataire, set)
  }
  return result
}
