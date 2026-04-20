import { Database } from "bun:sqlite";
import { $ } from "bun";

export const setup = async () => {
  await $`find . -name ".DS_Store" -type f -delete`;

  if (Bun.env["SERVICE"] === undefined) Bun.env["SERVICE"] = "default";

  await $`mkdir -p datastores/${Bun.env["SERVICE"]}`;
  await $`mkdir -p datastores/${Bun.env["SERVICE"]}/files`;

  new Database(`datastores/${Bun.env["SERVICE"]}/datastore.sqlite`).run(`
    CREATE TABLE IF NOT EXISTS telemetry
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

    CREATE TABLE IF NOT EXISTS skills
      (
        id          TEXT PRIMARY KEY UNIQUE NOT NULL,
        name        TEXT,
        skill       TEXT
      );
    `);
};

await setup();
