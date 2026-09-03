import sql from './001-baseline.sql' with { type: 'text' }

export const baseline = {
  version: 1,
  name: 'baseline',
  objects: [
    'conversations',
    'users',
    'telemetry',
    'knowledge_build',
    'activites',
    'idx_activites_rattachement',
    'idx_activites_client',
    'idx_activites_locataire',
    'idx_activites_locataire_type',
    'idx_activites_lot',
    'idx_activites_type',
    'idx_activites_auteur',
    'idx_activites_statut',
    'idx_activites_rattachement_thread',
    'idx_activites_bulk',
    'idx_activites_execution',
    'idx_activites_idempotency',
    'idx_activites_ticket_draft',
    'automations',
    'idx_automations_due',
    'bulk_operations',
    'bulk_jobs',
    'idx_bulk_jobs_report_operation_execution',
    'idx_bulk_jobs_report_execution_status',
    'idx_bulk_jobs_due',
    'contacts'
  ],
  sql
} as const
