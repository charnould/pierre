import { Database } from 'bun:sqlite'

import { $ } from 'bun'

export const setup = async () => {
  if (Bun.env['SERVICE'] === undefined) Bun.env['SERVICE'] = 'default'

  await $`mkdir -p datastores/${Bun.env['SERVICE']}`
  await $`mkdir -p datastores/${Bun.env['SERVICE']}/files`
  await $`mkdir -p datastores/${Bun.env['SERVICE']}/knowledge`

  new Database(`datastores/${Bun.env['SERVICE']}/datastore.sqlite`).run(`
    CREATE TABLE IF NOT EXISTS conversations
      (
        conv_id     TEXT,
        config      TEXT,
        role        TEXT,
        timestamp   TEXT,
        content     TEXT,
        metadata    TEXT,
        UNIQUE(conv_id, timestamp)
      );

    CREATE TABLE IF NOT EXISTS users
      (
        config          TEXT NOT NULL,
        email           TEXT PRIMARY KEY UNIQUE NOT NULL,
        role            TEXT NOT NULL,
        password_hash   TEXT NOT NULL
      );

    CREATE TABLE IF NOT EXISTS telemetry
      (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp   TEXT,
        host        TEXT,
        event       TEXT
      );

    CREATE TABLE IF NOT EXISTS knowledge_build
      (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at  TEXT,
        source      TEXT,
        kind        TEXT,
        code        TEXT,
        subject     TEXT
      );

    CREATE TABLE IF NOT EXISTS reclamation_drafts
      (
        id_reclamation              TEXT NOT NULL,
        id_skill                    TEXT NOT NULL,
        channel                     TEXT,
        generated_output            TEXT,
        generated_reasoning         TEXT,
        generated_duration_ms       INTEGER,
        generated_at                TEXT NOT NULL,
        generated_by                TEXT NOT NULL,
        automation_id               TEXT,
        edited_output               TEXT,
        edited_at                   TEXT,
        edited_by                   TEXT,
        feedback_rating             INTEGER,
        feedback_comment            TEXT,
        feedback_at                 TEXT,
        feedback_by                 TEXT,
        UNIQUE(id_reclamation, id_skill)
      );
    `)
}
