DROP INDEX IF EXISTS idx_activites_repayment_plan_snapshot;
CREATE UNIQUE INDEX idx_activites_repayment_plan_snapshot
  ON activites (thread_id)
  WHERE type IN (
    'repayment_plan.created',
    'repayment_plan.updated',
    'repayment_plan.finalized',
    'repayment_plan.closed'
  )
  AND json_type(contenu, '$.donnees_communes') = 'object';
