DROP TABLE IF EXISTS knowledge_build;

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
