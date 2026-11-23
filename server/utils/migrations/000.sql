-- Auth & users (Better Auth tables remain non-STRICT for DATE columns)

CREATE TABLE user_profiles (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL UNIQUE,
  module_ids TEXT NOT NULL DEFAULT '[]',
  chatbot_ids TEXT NOT NULL DEFAULT '[]'
) STRICT;

CREATE TABLE users (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  emailVerified INTEGER NOT NULL,
  image TEXT,
  createdAt DATE NOT NULL,
  updatedAt DATE NOT NULL,
  role TEXT,
  banned INTEGER,
  banReason TEXT,
  banExpires DATE,
  module_ids TEXT NOT NULL DEFAULT '[]',
  chatbot_ids TEXT NOT NULL DEFAULT '[]',
  profile_id TEXT REFERENCES user_profiles(id),
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

-- Conversations, LLM runs & telemetry

CREATE TABLE conversations (
  conv_id TEXT PRIMARY KEY NOT NULL,
  config_id TEXT NOT NULL,
  user_email TEXT,
  started_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  messages TEXT NOT NULL CHECK (json_valid(messages) AND json_type(messages) = 'array'),
  review TEXT CHECK (review IS NULL OR (json_valid(review) AND json_type(review) = 'object'))
) STRICT;

CREATE INDEX idx_conversations_updated_at ON conversations (updated_at DESC);

CREATE TABLE llm_runs (
  id TEXT PRIMARY KEY NOT NULL,
  started_at TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('chat', 'workflow', 'automation')),
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'aborted', 'timeout')),
  duration_ms INTEGER NOT NULL,
  tokens_total INTEGER,
  details TEXT NOT NULL CHECK (json_valid(details) AND json_type(details) = 'object')
) STRICT;

CREATE INDEX idx_llm_runs_started_at ON llm_runs (started_at DESC, operation, tokens_total);

CREATE TABLE telemetry (
  id INTEGER PRIMARY KEY,
  recorded_at TEXT NOT NULL,
  host TEXT NOT NULL,
  event TEXT NOT NULL
) STRICT;

-- Knowledge & intakes

CREATE TABLE knowledge_records (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL,
  document TEXT NOT NULL,
  content TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;

CREATE UNIQUE INDEX idx_knowledge_records_source_sheet
  ON knowledge_records (
    lower(json_extract(document, '$.original_name')),
    lower(coalesce(json_extract(document, '$.sheet_name'), ''))
  )
  WHERE kind = 'source';

CREATE UNIQUE INDEX idx_knowledge_records_active_build
  ON knowledge_records ((1))
  WHERE kind = 'build'
    AND json_extract(document, '$.status') IN ('queued', 'running');

CREATE TABLE intakes (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  table_name TEXT NOT NULL UNIQUE,
  publish_to_knowledge INTEGER NOT NULL DEFAULT 0 CHECK (publish_to_knowledge IN (0, 1)),
  owner TEXT NOT NULL,
  mentions TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(mentions) AND json_type(mentions) = 'array'),
  token TEXT UNIQUE,
  config TEXT NOT NULL CHECK (json_valid(config) AND json_type(config) = 'object'),
  column_types TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(column_types) AND json_type(column_types) = 'object'),
  created_at TEXT NOT NULL,
  published_at TEXT,
  closed_at TEXT,
  last_notified_at TEXT
) STRICT;

-- Activities & communications

CREATE TABLE activites (
  id INTEGER PRIMARY KEY,
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
  id_externe TEXT,
  UNIQUE (thread_id, revision)
) STRICT;

CREATE INDEX idx_activites_rattachement ON activites (rattachement);

CREATE INDEX idx_activites_locataire
  ON activites (id_locataire)
  WHERE id_locataire IS NOT NULL;

CREATE INDEX idx_activites_type ON activites (type, auteur);

CREATE UNIQUE INDEX idx_activites_repayment_plan_snapshot
  ON activites (thread_id)
  WHERE type IN (
    'repayment_plan.created',
    'repayment_plan.updated',
    'repayment_plan.finalized',
    'repayment_plan.closed'
  )
  AND json_type(contenu, '$.donnees_communes') = 'object';

CREATE UNIQUE INDEX idx_activites_idempotency
  ON activites (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

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

CREATE TRIGGER activites_no_delete
BEFORE DELETE ON activites
BEGIN
  SELECT RAISE(ABORT, 'activites is append-only');
END;

CREATE TABLE communication_dispatch_claims (
  activity_id INTEGER PRIMARY KEY,
  claimed_at TEXT NOT NULL,
  FOREIGN KEY (activity_id) REFERENCES activites(id) ON DELETE CASCADE
) STRICT;

CREATE TABLE communication_provider_operations (
  activity_id INTEGER PRIMARY KEY,
  target TEXT NOT NULL,
  account TEXT NOT NULL,
  product TEXT NOT NULL,
  sending_id TEXT,
  document_id TEXT,
  recipient_id TEXT,
  step TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (activity_id) REFERENCES activites(id) ON DELETE CASCADE
) STRICT;

-- Automations & bulk operations

CREATE TABLE automations (
  id TEXT PRIMARY KEY NOT NULL,
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
  config TEXT NOT NULL
) STRICT;

CREATE TABLE bulk_operations (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  definition TEXT NOT NULL,
  reports_to_keep INTEGER NOT NULL DEFAULT 10,
  edits TEXT NOT NULL DEFAULT '[]'
) STRICT;

CREATE TABLE bulk_jobs (
  id TEXT PRIMARY KEY NOT NULL,
  bulk_operation_id TEXT NOT NULL,
  execution_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  source TEXT NOT NULL,
  mode TEXT NOT NULL,
  report_status TEXT NOT NULL,
  outcome TEXT,
  current_activity_id INTEGER,
  completed_at TEXT,
  run_at TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  payload TEXT NOT NULL CHECK (json_valid(payload)),
  UNIQUE (execution_id, item_id)
) STRICT;

CREATE INDEX idx_bulk_jobs_due
  ON bulk_jobs (run_at, id)
  WHERE report_status = 'in_progress' AND run_at IS NOT NULL;

-- Contacts, setup & CARL cache

CREATE TABLE contacts (
  value TEXT PRIMARY KEY NOT NULL,
  status TEXT NOT NULL,
  checked_at TEXT NOT NULL
) STRICT, WITHOUT ROWID;

CREATE TABLE setup (
  id TEXT PRIMARY KEY NOT NULL,
  content BLOB NOT NULL
) STRICT;

CREATE TABLE carl_qualifications (
  id_reclamation TEXT PRIMARY KEY NOT NULL,
  domaine TEXT NOT NULL,
  sous_domaine TEXT NOT NULL,
  motif TEXT NOT NULL,
  integrite_physique TEXT NOT NULL,
  lieu TEXT NOT NULL,
  obligation_reglementaire TEXT NOT NULL,
  ton TEXT NOT NULL
) STRICT, WITHOUT ROWID;
