CREATE TABLE communication_dispatch_claims (
  activity_id INTEGER PRIMARY KEY,
  claimed_at TEXT NOT NULL,
  FOREIGN KEY (activity_id) REFERENCES activites(id) ON DELETE CASCADE
);
