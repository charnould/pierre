import { Database } from 'bun:sqlite'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

import { version } from './package.json' with { type: 'json' }
import { datastorePaths } from './utils/paths'

const MINUTES_30 = 30 * 60

function usage(): never {
  console.error('Usage: pierre [--version] | pierre backup')
  process.exit(1)
}

function backup(): void {
  const { root, database } = datastorePaths()
  if (!existsSync(database)) {
    console.error(`Base introuvable: ${database}`)
    process.exit(1)
  }
  const backups = join(root, 'backups')
  mkdirSync(backups, { recursive: true })
  const destination = join(backups, 'datastore.sqlite')
  rmSync(destination, { force: true })
  const db = new Database(database)
  try {
    db.exec(`VACUUM INTO '${destination.replaceAll("'", "''")}'`)
  } finally {
    db.close()
  }
  console.log(destination)
}

const command = process.argv[2]

if (command === '--version' || command === '-v') {
  console.log(`server-${version}`)
  process.exit(0)
}

if (command === 'backup') {
  backup()
  process.exit(0)
}

if (command) {
  usage()
} else {
  // Bun refuses a global idleTimeout above 255s. Each request raises its own.
  const { default: application } = await import('./app')
  Bun.serve({
    hostname: '127.0.0.1',
    port: 3000,
    idleTimeout: 255,
    fetch(request, server) {
      server.timeout(request, MINUTES_30)
      return application.fetch(request)
    }
  })
}
