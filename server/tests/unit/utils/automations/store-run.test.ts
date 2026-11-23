import { Database } from 'bun:sqlite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'

import { build_rattachement } from '../../../../utils/activities/rows'
import { create_trusted_activity } from '../../../../utils/activities/write'
import {
  abort_automation_run,
  reset_automation_executor,
  run_automation_now,
  run_due_automations,
  set_automation_executor,
  stop_automation_run
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
import { setDatastoreRoot, testDatastorePaths } from '../../../../utils/paths'
import { setup } from '../../../../utils/setup'
import { seedInstanceSetup } from '../../../seed-setup'
import { createTestUser } from '../../../test-user'

const paths = testDatastorePaths('automations')

const seed_user = (email: string, isAdministrator = false): Promise<void> =>
  createTestUser({
    email,
    isAdministrator,
    moduleIds: [],
    chatbotIds: ['default']
  })

const alice = { email: 'alice@example.com', isAdministrator: false }
const bob = { email: 'bob@example.com', isAdministrator: false }
const carol = { email: 'carol@example.com', isAdministrator: false }
const admin = { email: 'admin@example.com', isAdministrator: true }

beforeAll(() => {
  setDatastoreRoot(paths.root)
})

afterAll(async () => {
  setDatastoreRoot(null)
  await rm(paths.root, { recursive: true, force: true })
})

beforeEach(async () => {
  await mkdir(paths.root, { recursive: true })
  await setup()
  await seedInstanceSetup()
  await seed_user(alice.email)
  await seed_user(bob.email)
  await seed_user(admin.email, true)
  reset_automation_executor()
  set_automation_executor(async () => ({ kind: 'report', contenu: '<p>Rapport de test</p>' }))
})

afterEach(async () => {
  await rm(paths.root, { recursive: true, force: true })
})

describe('automations store', () => {
  it('create assigns owner and next_run_at; owner, mentions and admin see it', async () => {
    const auto = await create_automation(alice.email, {
      type: 'report',
      name: 'Rapport test',
      frequency: 'weekly',
      frequencyDay: 'lundi',
      frequencyTime: '08:00',
      prompt: 'Analyse',
      maxReports: 3,
      mentions: ['bob']
    })
    expect(auto.owner).toBe(alice.email)
    expect(auto.status).toBe('scheduled')
    expect(auto.nextRunAt).toBeTruthy()
    expect(auto.cron).toBe('0 8 * * 1')
    expect(list_automations(alice)).toHaveLength(1)
    expect(list_automations(bob)).toHaveLength(1)
    expect(list_automations(carol)).toHaveLength(0)
    expect(list_automations(admin)).toHaveLength(1)
  })

  it('non-owner cannot patch or delete; administrator can manage', async () => {
    const auto = await create_automation(alice.email, {
      type: 'report',
      name: 'X',
      frequency: 'daily',
      frequencyTime: '08:00',
      prompt: 'p',
      mentions: ['bob']
    })
    await expect(update_automation(auto.id, bob, { name: 'hack' })).rejects.toThrow()
    expect(() => delete_automation(auto.id, bob)).toThrow()

    const editedByAdmin = await update_automation(auto.id, admin, { name: 'Admin edit' })
    expect(editedByAdmin.name).toBe('Admin edit')
    const ranByAdmin = await run_automation_now(auto.id, admin)
    expect(ranByAdmin.lastRunStatus).toBe('success')
    set_automation_pin(auto.id, admin, true)
    expect(get_automation(auto.id, admin)?.pinned).toBe(true)
    delete_automation(auto.id, admin)
    expect(get_automation(auto.id, alice)).toBeNull()
  })

  it('pin is per-user; delete purges pins', async () => {
    const auto = await create_automation(alice.email, {
      type: 'report',
      name: 'Pin me',
      frequency: 'daily',
      frequencyTime: '08:00',
      prompt: 'p',
      mentions: ['bob']
    })
    set_automation_pin(auto.id, bob, true)
    expect(get_automation(auto.id, bob)?.pinned).toBe(true)
    expect(get_automation(auto.id, alice)?.pinned).toBe(false)
    delete_automation(auto.id, alice)
    const db = new Database(paths.database)
    const bobRow = db
      .query<{ preferences: string }, [string]>('SELECT preferences FROM users WHERE email = ?')
      .get('bob@example.com')
    db.close()
    expect(JSON.parse(bobRow!.preferences).pinned_automation_ids).toEqual([])
  })

  it('pause clears next_run_at; unpause recomputes', async () => {
    const auto = await create_automation(alice.email, {
      type: 'report',
      name: 'Pause',
      frequency: 'daily',
      frequencyTime: '08:00',
      prompt: 'p'
    })
    const paused = await update_automation(auto.id, alice, { status: 'paused' })
    expect(paused.status).toBe('paused')
    expect(paused.nextRunAt).toBeNull()
    const resumed = await update_automation(auto.id, alice, { status: 'scheduled' })
    expect(resumed.status).toBe('scheduled')
    expect(resumed.nextRunAt).toBeTruthy()
  })

  it('persists a formatted report prompt', async () => {
    const auto = await create_automation(alice.email, {
      type: 'report',
      name: 'Fmt',
      frequency: 'daily',
      frequencyTime: '08:00',
      prompt: '-  item1\n-   item2\n\n\n'
    })
    expect(auto.config).toMatchObject({ prompt: '- item1\n- item2\n' })

    const patched = await update_automation(auto.id, alice, {
      prompt: '#   Titre\n\n**gras**'
    })
    expect(patched.config).toMatchObject({
      prompt: '# Titre\n\n**gras**\n'
    })
  })
})

describe('automations worker', () => {
  it('run creates activity with owner+mentions and sets last_run_status', async () => {
    const auto = await create_automation(alice.email, {
      type: 'report',
      name: 'Run me',
      frequency: 'daily',
      frequencyTime: '08:00',
      prompt: 'p',
      maxReports: 6,
      mentions: ['bob']
    })
    const after = await run_automation_now(auto.id, alice)
    expect(after.lastRunStatus).toBe('success')
    expect(after.status).toBe('scheduled')
    expect(after.nextRunAt).toBeTruthy()

    const db = new Database(paths.database)
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
    const auto = await create_automation(alice.email, {
      type: 'report',
      name: 'Claim',
      frequency: 'daily',
      frequencyTime: '08:00',
      prompt: 'p'
    })
    const db = new Database(paths.database)
    db.run('UPDATE automations SET next_run_at = ? WHERE id = ?', [
      new Date(Date.now() - 1000).toISOString(),
      auto.id
    ])
    db.close()
    expect(typeof claim_automation(auto.id)).toBe('string')
    expect(claim_automation(auto.id)).toBeNull()
  })

  it('does not reclaim a lease renewed after the stale scan', async () => {
    const auto = await create_automation(alice.email, {
      type: 'report',
      name: 'Lease',
      frequency: 'daily',
      frequencyTime: '08:00',
      prompt: 'p'
    })
    const db = new Database(paths.database)
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
    expect(get_automation(auto.id, alice)?.status).toBe('running')
  })

  it('executor error still replanifies', async () => {
    const errorSpy = spyOn(console, 'error').mockImplementation(() => {})
    set_automation_executor(async () => {
      throw new Error('boom')
    })
    const auto = await create_automation(alice.email, {
      type: 'report',
      name: 'Fail',
      frequency: 'daily',
      frequencyTime: '08:00',
      prompt: 'p'
    })
    try {
      const after = await run_automation_now(auto.id, alice)
      expect(after.lastRunStatus).toBe('error')
      expect(after.status).toBe('scheduled')
      expect(after.nextRunAt).toBeTruthy()
      expect(errorSpy).toHaveBeenCalledTimes(1)
    } finally {
      errorSpy.mockRestore()
    }
  })

  it('trim preserves append-only report activities', async () => {
    const auto = await create_automation(alice.email, {
      type: 'report',
      name: 'Trim',
      frequency: 'daily',
      frequencyTime: '08:00',
      prompt: 'p',
      maxReports: 2
    })
    for (let i = 0; i < 4; i++) {
      create_trusted_activity(alice.email, {
        contexte: 'automations',
        ref: auto.id,
        type: 'automation.reported',
        recipients: [alice.email],
        contenu: JSON.stringify({ version: 1, title: `Rapport ${i}` }),
        auteur: `automation:${auto.id}`
      })
    }
    trim_report_activities(auto.id, 2)
    const db = new Database(paths.database)
    const count = db
      .query<{ n: number }, [string]>(
        `SELECT COUNT(*) as n FROM activites WHERE rattachement = ? AND type = 'automation.reported'`
      )
      .get(build_rattachement('automations', auto.id))
    db.close()
    expect(count!.n).toBe(4)
  })

  it('manual run while paused restores paused without next_run_at', async () => {
    const auto = await create_automation(alice.email, {
      type: 'report',
      name: 'Paused run',
      frequency: 'daily',
      frequencyTime: '08:00',
      prompt: 'p'
    })
    await update_automation(auto.id, alice, { status: 'paused' })
    const after = await run_automation_now(auto.id, alice)
    expect(after.status).toBe('paused')
    expect(after.nextRunAt).toBeNull()
    expect(after.lastRunStatus).toBe('success')
  })

  it('due poll reclaim stuck running then runs due', async () => {
    const auto = await create_automation(alice.email, {
      type: 'report',
      name: 'Due',
      frequency: 'daily',
      frequencyTime: '08:00',
      prompt: 'p'
    })
    const db = new Database(paths.database)
    db.run(
      `UPDATE automations
       SET status = 'running', next_run_at = ?, run_token = ?, lease_expires_at = ?
       WHERE id = ?`,
      [
        new Date(Date.now() - 60_000).toISOString(),
        Bun.randomUUIDv7(),
        new Date(Date.now() - 1000).toISOString(),
        auto.id
      ]
    )
    // After reclaim, status becomes scheduled with next_run_at in the future — force due:
    db.close()
    await run_due_automations()
    const afterReclaim = get_automation(auto.id, alice)!
    // stuck was reclaimed to error + scheduled with future next — make it due and poll again
    expect(afterReclaim.lastRunStatus).toBe('error')
    expect(afterReclaim.status).toBe('scheduled')

    const db2 = new Database(paths.database)
    db2.run(`UPDATE automations SET next_run_at = ? WHERE id = ?`, [
      new Date(Date.now() - 1000).toISOString(),
      auto.id
    ])
    db2.close()
    await run_due_automations()
    const afterRun = get_automation(auto.id, alice)!
    expect(afterRun.lastRunStatus).toBe('success')
  })

  it('deletes a running automation, aborts its active run, and emits no report activity', async () => {
    let started!: () => void
    const executorStarted = new Promise<void>((resolve) => {
      started = resolve
    })
    let aborted = false
    set_automation_executor(async (_automation, { signal }) => {
      started()
      return await new Promise((_resolve, reject) => {
        signal.addEventListener(
          'abort',
          () => {
            aborted = true
            reject(new DOMException('Aborted', 'AbortError'))
          },
          { once: true }
        )
      })
    })

    const auto = await create_automation(alice.email, {
      type: 'report',
      name: 'Running delete',
      frequency: 'daily',
      frequencyTime: '08:00',
      prompt: 'p',
      mentions: ['bob']
    })
    set_automation_pin(auto.id, bob, true)

    const running = run_automation_now(auto.id, alice)
    await executorStarted
    expect(get_automation(auto.id, alice)?.status).toBe('running')

    delete_automation(auto.id, alice)
    abort_automation_run(auto.id)

    await expect(running).rejects.toThrow('Automation not found')
    expect(aborted).toBe(true)
    expect(get_automation(auto.id, alice)).toBeNull()

    const db = new Database(paths.database)
    const count = db
      .query<{ n: number }, [string]>('SELECT COUNT(*) AS n FROM activites WHERE rattachement = ?')
      .get(build_rattachement('automations', auto.id))
    const bobRow = db
      .query<{ preferences: string }, [string]>('SELECT preferences FROM users WHERE email = ?')
      .get('bob@example.com')
    db.close()
    expect(count!.n).toBe(0)
    expect(JSON.parse(bobRow!.preferences).pinned_automation_ids).toEqual([])
  })

  it('stops a running scheduled automation, preserves pin, and emits no report activity or error log', async () => {
    const errorSpy = spyOn(console, 'error').mockImplementation(() => {})
    let started!: () => void
    const executorStarted = new Promise<void>((resolve) => {
      started = resolve
    })
    let aborted = false
    set_automation_executor(async (_automation, { signal }) => {
      started()
      return await new Promise((_resolve, reject) => {
        signal.addEventListener(
          'abort',
          () => {
            aborted = true
            reject(new DOMException('Aborted', 'AbortError'))
          },
          { once: true }
        )
      })
    })

    const auto = await create_automation(alice.email, {
      type: 'report',
      name: 'Stop me',
      frequency: 'daily',
      frequencyTime: '08:00',
      prompt: 'p'
    })
    set_automation_pin(auto.id, alice, true)

    try {
      const running = run_automation_now(auto.id, alice)
      await executorStarted
      expect(get_automation(auto.id, alice)?.status).toBe('running')

      const stopped = stop_automation_run(auto.id, alice)
      expect(aborted).toBe(true)
      expect(stopped.status).toBe('scheduled')
      expect(stopped.nextRunAt).toBeTruthy()
      expect(stopped.lastRunStatus).toBe('error')
      expect(stopped.pinned).toBe(true)

      await running
      expect(errorSpy).not.toHaveBeenCalled()

      const db = new Database(paths.database)
      const count = db
        .query<{ n: number }, [string]>(
          'SELECT COUNT(*) AS n FROM activites WHERE rattachement = ?'
        )
        .get(build_rattachement('automations', auto.id))
      db.close()
      expect(count!.n).toBe(0)
    } finally {
      errorSpy.mockRestore()
    }
  })

  it('stops a running paused automation and restores paused without next_run_at', async () => {
    let started!: () => void
    const executorStarted = new Promise<void>((resolve) => {
      started = resolve
    })
    set_automation_executor(async (_automation, { signal }) => {
      started()
      return await new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), {
          once: true
        })
      })
    })

    const auto = await create_automation(alice.email, {
      type: 'report',
      name: 'Paused stop',
      frequency: 'daily',
      frequencyTime: '08:00',
      prompt: 'p'
    })
    await update_automation(auto.id, alice, { status: 'paused' })

    const running = run_automation_now(auto.id, alice)
    await executorStarted

    const stopped = stop_automation_run(auto.id, alice)
    expect(stopped.status).toBe('paused')
    expect(stopped.nextRunAt).toBeNull()
    expect(stopped.lastRunStatus).toBe('error')
    await running
  })

  it('unstucks a crash-stuck running automation without an active in-memory run', async () => {
    const auto = await create_automation(alice.email, {
      type: 'report',
      name: 'Stuck stop',
      frequency: 'daily',
      frequencyTime: '08:00',
      prompt: 'p'
    })
    const db = new Database(paths.database)
    db.run(
      `UPDATE automations
       SET status = 'running', run_token = ?, lease_expires_at = ?
       WHERE id = ?`,
      [Bun.randomUUIDv7(), new Date(Date.now() + 60_000).toISOString(), auto.id]
    )
    db.close()

    const stopped = stop_automation_run(auto.id, alice)
    expect(stopped.status).toBe('scheduled')
    expect(stopped.lastRunStatus).toBe('error')
    expect(stopped.nextRunAt).toBeTruthy()
  })
})
