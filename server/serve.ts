import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'

import { version } from './package.json' with { type: 'json' }
import { run_due_automations } from './utils/automations/run'
import { start_bulk_scheduler } from './utils/bulk/scheduler/queue'
import { refresh_stale_sms_contacts } from './utils/contacts'
import { openDatastore } from './utils/datastore-db'
import { ensureEnvAdmin } from './utils/ensure-env-admin'
import { initializeKnowledgeBuildCoordinator } from './utils/knowledge/build-coordinator'
import { startMailevaReconciliation } from './utils/maileva/track'
import { datastorePaths } from './utils/paths'
import { setup } from './utils/setup'
import { initVmPool } from './utils/vm-pool'
import { cleanupOrphanedVms } from './utils/vm-registry'

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
  const db = openDatastore()
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
  await setup()
  await ensureEnvAdmin()
  start_bulk_scheduler()
  startMailevaReconciliation()
  await initializeKnowledgeBuildCoordinator()
  Bun.cron('0 4 * * *', () => {
    refresh_stale_sms_contacts()
  })
  Bun.cron('* * * * *', async () => {
    await run_due_automations()
  })
  const { createApp } = await import('./app')
  const application = createApp()
  // Bun refuses a global idleTimeout above 255s. Each request raises its own.
  Bun.serve({
    hostname: '127.0.0.1',
    port: Number(Bun.env['BUN_PORT'] ?? 3000) || 3000,
    idleTimeout: 255,
    fetch(request, server) {
      server.timeout(request, MINUTES_30)
      return application.fetch(request)
    }
  })
  void prepareVirtualMachines()
}

async function prepareVirtualMachines(): Promise<void> {
  try {
    await cleanupOrphanedVms()
    await initVmPool()
  } catch (error) {
    console.error(error)
  }
}
