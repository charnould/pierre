CREATE TABLE conversations (
  conv_id TEXT,
  config TEXT,
  role TEXT,
  timestamp TEXT,
  content TEXT,
  metadata TEXT,
  UNIQUE(conv_id, timestamp)
);

CREATE INDEX idx_conversations_timestamp
  ON conversations (timestamp DESC);

CREATE TABLE users (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  emailVerified INTEGER NOT NULL,
  image TEXT,
  createdAt DATE NOT NULL,
  updatedAt DATE NOT NULL,
  role TEXT,
  banned INTEGER,
  banReason TEXT,
  banExpires DATE,
  module_ids TEXT NOT NULL DEFAULT '[]'
    CHECK (json_valid(module_ids) AND json_type(module_ids) = 'array'),
  chatbot_ids TEXT NOT NULL DEFAULT '[]'
    CHECK (json_valid(chatbot_ids) AND json_type(chatbot_ids) = 'array'),
  preferences TEXT NOT NULL DEFAULT '{}',
  avatar BLOB,
  avatar_version INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE session (
  id TEXT PRIMARY KEY NOT NULL,
  expiresAt DATE NOT NULL,
  token TEXT UNIQUE NOT NULL,
  createdAt DATE NOT NULL,
  updatedAt DATE NOT NULL,
  ipAddress TEXT,
  userAgent TEXT,
  userId TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  impersonatedBy TEXT
);

CREATE TABLE account (
  id TEXT PRIMARY KEY NOT NULL,
  accountId TEXT NOT NULL,
  providerId TEXT NOT NULL,
  userId TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  accessToken TEXT,
  refreshToken TEXT,
  idToken TEXT,
  accessTokenExpiresAt DATE,
  refreshTokenExpiresAt DATE,
  scope TEXT,
  password TEXT,
  createdAt DATE NOT NULL,
  updatedAt DATE NOT NULL
);

CREATE TABLE verification (
  id TEXT PRIMARY KEY NOT NULL,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expiresAt DATE NOT NULL,
  createdAt DATE NOT NULL,
  updatedAt DATE NOT NULL
);

CREATE INDEX session_userId_idx ON session (userId);
CREATE INDEX account_userId_idx ON account (userId);
CREATE INDEX verification_identifier_idx ON verification (identifier);

CREATE TABLE telemetry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT,
  host TEXT,
  event TEXT
);

CREATE TABLE knowledge_records (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('source', 'build')),
  document TEXT NOT NULL CHECK (
    json_valid(document)
    AND json_type(document) = 'object'
  ),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_knowledge_records_kind_created
  ON knowledge_records (kind, created_at DESC);

CREATE UNIQUE INDEX idx_knowledge_records_storage_name
  ON knowledge_records (json_extract(document, '$.storageName'))
  WHERE kind = 'source';

CREATE UNIQUE INDEX idx_knowledge_records_active_build
  ON knowledge_records ((1))
  WHERE kind = 'build'
    AND json_extract(document, '$.status') IN ('queued', 'running');

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

CREATE TABLE automations (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL,
  owner TEXT NOT NULL,
  mentions TEXT NOT NULL DEFAULT '[]',
  cron TEXT NOT NULL,
  next_run_at TEXT,
  last_run_at TEXT,
  last_run_status TEXT,
  run_token TEXT,
  lease_expires_at TEXT,
  config TEXT NOT NULL,
  CHECK (json_valid(mentions)),
  CHECK (json_valid(config))
);

CREATE INDEX idx_automations_due
  ON automations (status, next_run_at);

CREATE TABLE bulk_operations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  definition TEXT NOT NULL,
  reports_to_keep INTEGER NOT NULL DEFAULT 10 CHECK (reports_to_keep >= 1),
  edits TEXT NOT NULL DEFAULT '[]',
  CHECK (json_valid(definition) AND json_type(definition) = 'object'),
  CHECK (json_valid(edits) AND json_type(edits) = 'array')
);

CREATE TABLE bulk_jobs (
  id TEXT PRIMARY KEY,
  bulk_operation_id TEXT NOT NULL,
  execution_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK (
    source IN ('comptes_locataires', 'lots_locatifs', 'candidats', 'reclamations')
  ),
  mode TEXT NOT NULL CHECK (mode IN ('send', 'apply_without_send')),
  report_status TEXT NOT NULL CHECK (report_status IN ('in_progress', 'ok', 'ko')),
  outcome TEXT CHECK (outcome IS NULL OR json_valid(outcome)),
  current_activity_id INTEGER,
  completed_at TEXT,
  run_at TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  payload JSON NOT NULL,
  CHECK (json_valid(payload)),
  UNIQUE (execution_id, item_id)
);

CREATE INDEX idx_bulk_jobs_report_operation_execution
  ON bulk_jobs (bulk_operation_id, execution_id);
CREATE INDEX idx_bulk_jobs_report_execution_status
  ON bulk_jobs (execution_id, report_status);
CREATE INDEX idx_bulk_jobs_due
  ON bulk_jobs (run_at)
  WHERE report_status = 'in_progress' AND run_at IS NOT NULL;

CREATE TABLE contacts (
  value TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  checked_at TEXT NOT NULL
);
