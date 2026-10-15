ALTER TABLE activites ADD COLUMN id_externe TEXT;

CREATE INDEX idx_activites_id_externe
  ON activites (id_externe)
  WHERE id_externe IS NOT NULL;

DROP TRIGGER activites_no_update;

CREATE TRIGGER activites_no_update
BEFORE UPDATE ON activites
WHEN NOT (
  OLD.type IN (
    'repayment_plan.created',
    'repayment_plan.updated',
    'repayment_plan.finalized'
  )
  AND json_type(OLD.contenu, '$.plan') = 'object'
  AND json_type(NEW.contenu, '$.plan') IS NULL
  AND NEW.contenu = json_remove(OLD.contenu, '$.plan')
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
