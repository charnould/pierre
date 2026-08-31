/** Modules affichés dans le panneau Notifications. */
export type ActivityModuleView = 'repayment' | 'tickets' | 'automations' | 'updates'

export const ACTIVITY_MODULE_LABELS: Record<ActivityModuleView, string> = {
  repayment: 'Impayés',
  tickets: 'Réclamations',
  automations: 'Routines',
  updates: 'Mises à jour'
}
