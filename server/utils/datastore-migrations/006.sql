DROP TRIGGER activites_no_delete;

DELETE FROM activites
WHERE type IN (
  'repayment_plan.created',
  'repayment_plan.updated',
  'repayment_plan.finalized',
  'repayment_plan.closed'
)
AND json_type(contenu, '$.echeancier') IS NOT 'object';

CREATE TRIGGER activites_no_delete
BEFORE DELETE ON activites
BEGIN
  SELECT RAISE(ABORT, 'activites is append-only');
END;

DROP TRIGGER activites_no_update;

CREATE TRIGGER activites_no_update
BEFORE UPDATE ON activites
WHEN NOT (
  OLD.type IN (
    'repayment_plan.created',
    'repayment_plan.updated',
    'repayment_plan.finalized'
  )
  AND json_type(OLD.contenu, '$.donnees_communes') = 'object'
  AND NEW.contenu = '{}'
  AND NEW.id IS OLD.id
  AND NEW.date_creation IS OLD.date_creation
  AND NEW.rattachement IS OLD.rattachement
  AND NEW.auteur IS OLD.auteur
  AND NEW.destinataire IS OLD.destinataire
  AND NEW.id_client IS OLD.id_client
  AND NEW.id_locataire IS OLD.id_locataire
  AND NEW.id_lot IS OLD.id_lot
  AND NEW.type IS OLD.type
  AND NEW.channel IS OLD.channel
  AND NEW.mentions IS OLD.mentions
  AND NEW.thread_id IS OLD.thread_id
  AND NEW.revision IS OLD.revision
  AND NEW.bulk_id IS OLD.bulk_id
  AND NEW.execution_id IS OLD.execution_id
  AND NEW.idempotency_key IS OLD.idempotency_key
  AND NEW.id_externe IS OLD.id_externe
)
BEGIN
  SELECT RAISE(ABORT, 'activites is append-only');
END;
