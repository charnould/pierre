import { Database } from 'bun:sqlite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'

import { build_rattachement } from '../../../../utils/activities/rows'
import { create_trusted_activity } from '../../../../utils/activities/write'
import { format_automation_prompt } from '../../../../utils/automations/format-prompt'
import {
  reset_automation_executor,
  run_automation_now,
  run_due_automations,
  set_automation_executor
} from '../../../../utils/automations/run'
import {
  claim_automation,
  create_automation,
  delete_automation,
  finalize_automation_run,
  get_automation,
  list_automations,
  renew_automation_lease,
  set_automation_pin,
  trim_report_activities,
  update_automation
} from '../../../../utils/automations/store'
import { datastorePaths } from '../../../../utils/paths'
import { setup } from '../../../../utils/setup'

const TEST_SERVICE = '_test_automations_svc'
const ORIGINAL_SERVICE = Bun.env['SERVICE']
const TEST_PATHS = datastorePaths(TEST_SERVICE)
const DATASTORE_ROOT = TEST_PATHS.root

function seed_user(email: string) {
  const db = new Database(TEST_PATHS.database)
  db.run(
    `INSERT INTO users (email, role, config, password_hash, preferences)
     VALUES (?, 'contributor', ?, 'x', '{}')`,
    [email, JSON.stringify(['default'])]
  )
  db.close()
}

beforeAll(() => {
  Bun.env['SERVICE'] = TEST_SERVICE
})

afterAll(async () => {
  if (ORIGINAL_SERVICE === undefined) delete Bun.env['SERVICE']
  else Bun.env['SERVICE'] = ORIGINAL_SERVICE
  await rm(DATASTORE_ROOT, { recursive: true, force: true })
})

beforeEach(async () => {
  await mkdir(DATASTORE_ROOT, { recursive: true })
  await setup()
  seed_user('alice@example.com')
  seed_user('bob@example.com')
  reset_automation_executor()
  set_automation_executor(async () => ({ kind: 'report', contenu: '<p>Rapport de test</p>' }))
})

afterEach(async () => {
  await rm(DATASTORE_ROOT, { recursive: true, force: true })
})

describe('automations store', () => {
  it('create assigns owner and next_run_at; owner sees it', async () => {
    const auto = await create_automation('alice', {
      type: 'report',
      name: 'Rapport test',
      frequency: 'weekly',
      frequencyDay: 'lundi',
      frequencyTime: '08:00',
      prompt: 'Analyse',
      maxReports: 3,
      mentions: ['bob']
    })
    expect(auto.owner).toBe('alice')
    expect(auto.status).toBe('scheduled')
    expect(auto.next_run_at).toBeTruthy()
    expect(auto.cron).toBe('0 8 * * 1')
    expect(list_automations('alice', 'alice@example.com')).toHaveLength(1)
    expect(list_automations('bob@example.com', 'bob@example.com')).toHaveLength(1)
    expect(list_automations('carol', 'carol@example.com')).toHaveLength(0)
  })

  it('non-owner cannot patch or delete', async () => {
    const auto = await create_automation('alice', {
      type: 'report',
      name: 'X',
      frequency: 'daily',
      frequencyTime: '08:00',
      prompt: 'p',
      mentions: ['bob']
    })
    await expect(update_automation(auto.id, 'bob', { name: 'hack' })).rejects.toThrow()
    expect(() => delete_automation(auto.id, 'bob')).toThrow()
  })

  it('pin is per-user; delete purges pins', async () => {
    const auto = await create_automation('alice', {
      type: 'report',
      name: 'Pin me',
      frequency: 'daily',
      frequencyTime: '08:00',
      prompt: 'p',
      mentions: ['bob']
    })
    set_automation_pin(auto.id, 'bob@example.com', 'bob@example.com', true)
    expect(get_automation(auto.id, 'bob@example.com', 'bob@example.com')?.pinned).toBe(true)
    expect(get_automation(auto.id, 'alice', 'alice@example.com')?.pinned).toBe(false)
    delete_automation(auto.id, 'alice')
    const db = new Database(TEST_PATHS.database)
    const bob = db
      .query<{ preferences: string }, [string]>('SELECT preferences FROM users WHERE email = ?')
      .get('bob@example.com')
    db.close()
    expect(JSON.parse(bob!.preferences).pinned_automation_ids).toEqual([])
  })

  it('pause clears next_run_at; unpause recomputes', async () => {
    const auto = await create_automation('alice', {
      type: 'report',
      name: 'Pause',
      frequency: 'daily',
      frequencyTime: '08:00',
      prompt: 'p'
    })
    const paused = await update_automation(auto.id, 'alice', { status: 'paused' })
    expect(paused.status).toBe('paused')
    expect(paused.next_run_at).toBeNull()
    const resumed = await update_automation(auto.id, 'alice', { status: 'scheduled' })
    expect(resumed.status).toBe('scheduled')
    expect(resumed.next_run_at).toBeTruthy()
  })

  it('persists oxfmt-formatted report prompt', async () => {
    const messy = '-  item1\n-   item2'
    const auto = await create_automation('alice', {
      type: 'report',
      name: 'Fmt',
      frequency: 'daily',
      frequencyTime: '08:00',
      prompt: messy
    })
    expect(auto.config).toMatchObject({ prompt: await format_automation_prompt(messy) })

    const patched = await update_automation(auto.id, 'alice', {
      prompt: '**gras**  et   espaces'
    })
    expect(patched.config).toMatchObject({
      prompt: await format_automation_prompt('**gras**  et   espaces')
    })
  })
})

describe('automations worker', () => {
  it('run creates activity with owner+mentions and sets last_run_status', async () => {
    const auto = await create_automation('alice', {
      type: 'report',
      name: 'Run me',
      frequency: 'daily',
      frequencyTime: '08:00',
      prompt: 'p',
      maxReports: 6,
      mentions: ['bob']
    })
    const after = await run_automation_now(auto.id, 'alice')
    expect(after.last_run_status).toBe('success')
    expect(after.status).toBe('scheduled')
    expect(after.next_run_at).toBeTruthy()

    const db = new Database(TEST_PATHS.database)
    const row = db
      .query<{ mentions: string }, [string]>(
        `SELECT mentions FROM activites WHERE rattachement = ? LIMIT 1`
      )
      .get(build_rattachement('automations', auto.id))
    db.close()
    const mentions = JSON.parse(row!.mentions) as Array<{ destinataire: string }>
    expect(mentions.map((mention) => mention.destinataire).sort()).toEqual([
      'user:alice@example.com',
      'user:bob@example.com'
    ])
  })

  it('claim is exclusive', async () => {
    const auto = await create_automation('alice', {
      type: 'report',
      name: 'Claim',
      frequency: 'daily',
      frequencyTime: '08:00',
      prompt: 'p'
    })
    const db = new Database(TEST_PATHS.database)
    db.run('UPDATE automations SET next_run_at = ? WHERE id = ?', [
      new Date(Date.now() - 1000).toISOString(),
      auto.id
    ])
    db.close()
    expect(typeof claim_automation(auto.id)).toBe('string')
    expect(claim_automation(auto.id)).toBeNull()
  })

  it('does not reclaim a lease renewed after the stale scan', async () => {
    const auto = await create_automation('alice', {
      type: 'report',
      name: 'Lease',
      frequency: 'daily',
      frequencyTime: '08:00',
      prompt: 'p'
    })
    const db = new Database(TEST_PATHS.database)
    db.run('UPDATE automations SET next_run_at = ? WHERE id = ?', [
      new Date(Date.now() - 1000).toISOString(),
      auto.id
    ])
    db.close()
    const token = claim_automation(auto.id)!
    const staleScanAt = new Date().toISOString()
    expect(renew_automation_lease(auto.id, token)).toBe(true)
    expect(
      finalize_automation_run(auto.id, token, 'error', {
        leaseExpiredBefore: staleScanAt
      })
    ).toBe(false)
    expect(get_automation(auto.id, 'alice')?.status).toBe('running')
  })

  it('executor error still replanifies', async () => {
    set_automation_executor(async () => {
      throw new Error('boom')
    })
    const auto = await create_automation('alice', {
      type: 'report',
      name: 'Fail',
      frequency: 'daily',
      frequencyTime: '08:00',
      prompt: 'p'
    })
    const after = await run_automation_now(auto.id, 'alice')
    expect(after.last_run_status).toBe('error')
    expect(after.status).toBe('scheduled')
    expect(after.next_run_at).toBeTruthy()
  })

  it('trim keeps maxReports activities', async () => {
    const auto = await create_automation('alice', {
      type: 'report',
      name: 'Trim',
      frequency: 'daily',
      frequencyTime: '08:00',
      prompt: 'p',
      maxReports: 2
    })
    for (let i = 0; i < 4; i++) {
      create_trusted_activity('alice', {
        contexte: 'automations',
        ref: auto.id,
        type: 'automation_report',
        statut: 'logged',
        recipients: ['alice'],
        contenu: `r${i}`,
        auteur: `automation:${auto.id}`
      })
    }
    trim_report_activities(auto.id, 2)
    const db = new Database(TEST_PATHS.database)
    const count = db
      .query<{ n: number }, [string]>(
        `SELECT COUNT(*) as n FROM activites WHERE rattachement = ? AND type = 'automation_report'`
      )
      .get(build_rattachement('automations', auto.id))
    db.close()
    expect(count!.n).toBe(2)
  })

  it('manual run while paused restores paused without next_run_at', async () => {
    const auto = await create_automation('alice', {
      type: 'report',
      name: 'Paused run',
      frequency: 'daily',
      frequencyTime: '08:00',
      prompt: 'p'
    })
    await update_automation(auto.id, 'alice', { status: 'paused' })
    const after = await run_automation_now(auto.id, 'alice')
    expect(after.status).toBe('paused')
    expect(after.next_run_at).toBeNull()
    expect(after.last_run_status).toBe('success')
  })

  it('due poll reclaim stuck running then runs due', async () => {
    const auto = await create_automation('alice', {
      type: 'report',
      name: 'Due',
      frequency: 'daily',
      frequencyTime: '08:00',
      prompt: 'p'
    })
    const db = new Database(TEST_PATHS.database)
    db.run(
      `UPDATE automations
       SET status = 'running', next_run_at = ?, run_token = ?, lease_expires_at = ?
       WHERE id = ?`,
      [
        new Date(Date.now() - 60_000).toISOString(),
        crypto.randomUUID(),
        new Date(Date.now() - 1000).toISOString(),
        auto.id
      ]
    )
    // After reclaim, status becomes scheduled with next_run_at in the future — force due:
    db.close()
    await run_due_automations()
    const afterReclaim = get_automation(auto.id, 'alice')!
    // stuck was reclaimed to error + scheduled with future next — make it due and poll again
    expect(afterReclaim.last_run_status).toBe('error')
    expect(afterReclaim.status).toBe('scheduled')

    const db2 = new Database(TEST_PATHS.database)
    db2.run(`UPDATE automations SET next_run_at = ? WHERE id = ?`, [
      new Date(Date.now() - 1000).toISOString(),
      auto.id
    ])
    db2.close()
    await run_due_automations()
    const afterRun = get_automation(auto.id, 'alice')!
    expect(afterRun.last_run_status).toBe('success')
  })
})
