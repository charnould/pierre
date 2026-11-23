-- Collectes (intake) : formulaires publics avec tables SQLite dédiées `intake_{table_name}`.

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
);
