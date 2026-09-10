DROP TABLE IF EXISTS activites;

CREATE TABLE activites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date_creation TEXT NOT NULL,
  rattachement TEXT NOT NULL,
  auteur TEXT NOT NULL,
  destinataire TEXT,
  id_client TEXT,
  id_locataire TEXT,
  id_lot TEXT,
  type TEXT NOT NULL,
  channel TEXT,
  mentions TEXT NOT NULL DEFAULT '[]',
  contenu TEXT NOT NULL,
  thread_id TEXT,
  revision INTEGER,
  bulk_id TEXT,
  execution_id TEXT,
  idempotency_key TEXT,
  CHECK (json_valid(mentions) AND json_type(mentions) = 'array'),
  CHECK (
    json_valid(contenu)
    AND json_type(contenu) = 'object'
    AND json_extract(contenu, '$.version') IS 2
  ),
  CHECK (
    (
      type IN (
        'repayment_plan.created',
        'repayment_plan.updated',
        'repayment_plan.finalized',
        'repayment_plan.closed'
      )
      AND thread_id IS NOT NULL
      AND revision IS NULL
    )
    OR (
      type NOT IN (
        'repayment_plan.created',
        'repayment_plan.updated',
        'repayment_plan.finalized',
        'repayment_plan.closed'
      )
      AND (
        (thread_id IS NULL AND revision IS NULL)
        OR (thread_id IS NOT NULL AND revision IS NOT NULL AND revision > 0)
      )
    )
  ),
  CHECK (
    (
      type IN (
        'communication.sent',
        'communication.ok',
        'communication.failed',
        'communication.received',
        'communication.imported'
      )
      AND channel IS NOT NULL
      AND channel IN (
        'rcs',
        'sms',
        'email',
        'postal_letter',
        'postal_registered_letter_with_acknowledgement',
        'electronic_registered_delivery',
        'electronic_registered_letter'
      )
      AND thread_id IS NOT NULL
    )
    OR (
      type = 'document.sent_for_signature'
      AND channel IS NOT NULL
      AND channel IN (
        'rcs',
        'sms',
        'email',
        'postal_letter',
        'postal_registered_letter_with_acknowledgement',
        'electronic_registered_delivery',
        'electronic_registered_letter'
      )
      AND thread_id IS NOT NULL
    )
    OR (
      type NOT IN (
        'communication.sent',
        'communication.ok',
        'communication.failed',
        'communication.received',
        'communication.imported',
        'document.sent_for_signature'
      )
      AND channel IS NULL
    )
  ),
  UNIQUE (thread_id, revision)
);

CREATE INDEX idx_activites_rattachement
  ON activites (rattachement, date_creation DESC, id DESC);
CREATE INDEX idx_activites_client
  ON activites (id_client, date_creation DESC);
CREATE INDEX idx_activites_locataire
  ON activites (id_locataire, date_creation DESC);
CREATE INDEX idx_activites_locataire_type
  ON activites (id_locataire, type, date_creation DESC, id DESC);
CREATE INDEX idx_activites_lot
  ON activites (id_lot, date_creation DESC);
CREATE INDEX idx_activites_type
  ON activites (type, date_creation DESC);
CREATE INDEX idx_activites_auteur
  ON activites (auteur, date_creation DESC);
CREATE INDEX idx_activites_rattachement_thread
  ON activites (rattachement, type, thread_id, revision DESC)
  WHERE thread_id IS NOT NULL;
CREATE INDEX idx_activites_repayment_plan_thread
  ON activites (rattachement, thread_id, id DESC)
  WHERE type IN (
    'repayment_plan.created',
    'repayment_plan.updated',
    'repayment_plan.finalized',
    'repayment_plan.closed'
  );
CREATE UNIQUE INDEX idx_activites_repayment_plan_snapshot
  ON activites (thread_id)
  WHERE type IN (
    'repayment_plan.created',
    'repayment_plan.updated',
    'repayment_plan.finalized',
    'repayment_plan.closed'
  )
  AND json_type(contenu, '$.plan') = 'object';
CREATE INDEX idx_activites_bulk
  ON activites (bulk_id, date_creation DESC);
CREATE INDEX idx_activites_bulk_reports
  ON activites (
    bulk_id,
    COALESCE(
      json_extract(contenu, '$.completed_at'),
      json_extract(contenu, '$.snapshot.confirmed_at')
    ) DESC,
    execution_id DESC
  )
  WHERE type = 'bulk.ran' AND bulk_id IS NOT NULL;
CREATE INDEX idx_activites_execution
  ON activites (execution_id, date_creation DESC);
CREATE INDEX idx_activites_inbound_thread
  ON activites (type, destinataire, thread_id)
  WHERE thread_id IS NOT NULL;
CREATE UNIQUE INDEX idx_activites_idempotency
  ON activites (idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX idx_activites_case_group
  ON activites (rattachement, date_creation DESC, id DESC)
  WHERE type IN ('case.group_changed', 'case.bucket_changed');

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
)
BEGIN
  SELECT RAISE(ABORT, 'activites is append-only');
END;

CREATE TRIGGER activites_no_delete
BEFORE DELETE ON activites
BEGIN
  SELECT RAISE(ABORT, 'activites is append-only');
END;
