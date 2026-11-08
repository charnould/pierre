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
);
