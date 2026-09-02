export const baseline = {
  version: 1,
  name: 'baseline',
  objects: [
    'conversations',
    'users',
    'telemetry',
    'knowledge_build',
    'reclamation_drafts',
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
    'automations',
    'idx_automations_due',
    'bulk_operations',
    'bulk_jobs',
    'idx_bulk_jobs_report_operation_execution',
    'idx_bulk_jobs_report_execution_status',
    'idx_bulk_jobs_due',
    'contacts'
  ],
  sql: `
    CREATE TABLE IF NOT EXISTS conversations (
      conv_id TEXT,
      config TEXT,
      role TEXT,
      timestamp TEXT,
      content TEXT,
      metadata TEXT,
      UNIQUE(conv_id, timestamp)
    );

    CREATE TABLE IF NOT EXISTS users (
      config TEXT NOT NULL,
      email TEXT PRIMARY KEY UNIQUE NOT NULL,
      role TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      preferences TEXT NOT NULL DEFAULT '{}',
      avatar BLOB
    );

    CREATE TABLE IF NOT EXISTS telemetry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT,
      host TEXT,
      event TEXT
    );

    CREATE TABLE IF NOT EXISTS knowledge_build (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT,
      source TEXT,
      kind TEXT,
      code TEXT,
      subject TEXT
    );

    CREATE TABLE IF NOT EXISTS reclamation_drafts (
      id_reclamation TEXT NOT NULL,
      id_skill TEXT NOT NULL,
      channel TEXT,
      generated_output TEXT,
      generated_reasoning TEXT,
      generated_duration_ms INTEGER,
      generated_at TEXT NOT NULL,
      generated_by TEXT NOT NULL,
      automation_id TEXT,
      edited_output TEXT,
      edited_at TEXT,
      edited_by TEXT,
      feedback_rating INTEGER,
      feedback_comment TEXT,
      feedback_at TEXT,
      feedback_by TEXT,
      UNIQUE(id_reclamation, id_skill)
    );

    CREATE TABLE IF NOT EXISTS activites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date_creation TEXT NOT NULL,
      date_statut TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
      rattachement TEXT NOT NULL,
      auteur TEXT NOT NULL,
      destinataire TEXT,
      id_client TEXT,
      id_locataire TEXT,
      id_lot TEXT,
      type TEXT NOT NULL,
      statut TEXT,
      mentions TEXT NOT NULL DEFAULT '[]',
      contenu TEXT NOT NULL DEFAULT '',
      thread_id TEXT,
      event TEXT,
      state TEXT,
      revision INTEGER,
      bulk_id TEXT,
      execution_id TEXT,
      idempotency_key TEXT,
      CHECK (json_valid(mentions) AND json_type(mentions) = 'array'),
      CHECK (
        (
          type = 'action'
          AND thread_id IS NOT NULL
          AND event IN ('created', 'updated', 'completed', 'ignored', 'reopened')
          AND state IN ('a_faire', 'fait', 'ignore')
          AND revision IS NOT NULL
          AND revision > 0
          AND (
            (event IN ('created', 'updated', 'reopened') AND state = 'a_faire')
            OR (event = 'completed' AND state = 'fait')
            OR (event = 'ignored' AND state = 'ignore')
          )
        )
        OR (
          type IN ('rcs', 'sms', 'email', 'courrier', 'lrar', 'lre', 'signature')
          AND thread_id IS NOT NULL
          AND event IS NULL
          AND state IS NULL
          AND revision IS NULL
        )
        OR (
          type NOT IN ('action', 'rcs', 'sms', 'email', 'courrier', 'lrar', 'lre', 'signature')
          AND thread_id IS NULL
          AND event IS NULL
          AND state IS NULL
          AND revision IS NULL
        )
      ),
      UNIQUE(thread_id, revision)
    );

    CREATE INDEX IF NOT EXISTS idx_activites_rattachement
      ON activites (rattachement, date_creation DESC, id DESC);
    CREATE INDEX IF NOT EXISTS idx_activites_client
      ON activites (id_client, date_creation DESC);
    CREATE INDEX IF NOT EXISTS idx_activites_locataire
      ON activites (id_locataire, date_creation DESC);
    CREATE INDEX IF NOT EXISTS idx_activites_locataire_type
      ON activites (id_locataire, type, date_creation DESC, id DESC);
    CREATE INDEX IF NOT EXISTS idx_activites_lot
      ON activites (id_lot, date_creation DESC);
    CREATE INDEX IF NOT EXISTS idx_activites_type
      ON activites (type, date_creation DESC);
    CREATE INDEX IF NOT EXISTS idx_activites_auteur
      ON activites (auteur, date_creation DESC);
    CREATE INDEX IF NOT EXISTS idx_activites_statut
      ON activites (statut, date_creation DESC);
    CREATE INDEX IF NOT EXISTS idx_activites_rattachement_thread
      ON activites (rattachement, type, thread_id, revision DESC)
      WHERE thread_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_activites_bulk
      ON activites (bulk_id, date_creation DESC);
    CREATE INDEX IF NOT EXISTS idx_activites_execution
      ON activites (execution_id, date_creation DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_activites_idempotency
      ON activites (idempotency_key)
      WHERE idempotency_key IS NOT NULL;

    CREATE TABLE IF NOT EXISTS automations (
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
      config TEXT NOT NULL,
      CHECK (json_valid(mentions)),
      CHECK (json_valid(config))
    );

    CREATE INDEX IF NOT EXISTS idx_automations_due
      ON automations (status, next_run_at);

    CREATE TABLE IF NOT EXISTS bulk_operations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      definition TEXT NOT NULL,
      reports_to_keep INTEGER NOT NULL DEFAULT 10 CHECK (reports_to_keep >= 1),
      edits TEXT NOT NULL DEFAULT '[]',
      CHECK (json_valid(definition) AND json_type(definition) = 'object'),
      CHECK (json_valid(edits) AND json_type(edits) = 'array')
    );

    CREATE TABLE IF NOT EXISTS bulk_jobs (
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

    CREATE INDEX IF NOT EXISTS idx_bulk_jobs_report_operation_execution
      ON bulk_jobs (bulk_operation_id, execution_id);
    CREATE INDEX IF NOT EXISTS idx_bulk_jobs_report_execution_status
      ON bulk_jobs (execution_id, report_status);
    CREATE INDEX IF NOT EXISTS idx_bulk_jobs_due
      ON bulk_jobs (run_at)
      WHERE report_status = 'in_progress' AND run_at IS NOT NULL;

    CREATE TABLE IF NOT EXISTS contacts (
      value TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      checked_at TEXT NOT NULL
    );
  `
} as const
