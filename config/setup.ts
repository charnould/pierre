import { Database } from 'bun:sqlite'
import { $ } from 'bun'

if (Bun.env.SERVICE === undefined) Bun.env.SERVICE = 'default'

await $`mkdir -p datastores/${Bun.env.SERVICE}`
await $`mkdir -p datastores/${Bun.env.SERVICE}/files`
await $`mkdir -p datastores/${Bun.env.SERVICE}/__temp__`

const db = new Database(`datastores/${Bun.env.SERVICE}/datastore.sqlite`)

db.exec(`
    CREATE TABLE IF NOT EXISTS telemetry (
        conv_id TEXT,
        config TEXT,
        role TEXT,
        timestamp TEXT,
        content TEXT,
        metadata TEXT,
        UNIQUE(conv_id, timestamp)
        );`)

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        config TEXT NOT NULL,
        email TEXT PRIMARY KEY UNIQUE NOT NULL,
        role TEXT NOT NULL,
        password_hash TEXT NOT NULL
        );`)
