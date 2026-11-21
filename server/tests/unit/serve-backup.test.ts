import { Database } from 'bun:sqlite'
import { expect, it } from 'bun:test'
import { statSync } from 'node:fs'
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import packageJson from '../../package.json' with { type: 'json' }

it('reports the server release tag', async () => {
  const server = join(import.meta.dir, '../..')
  const proc = Bun.spawn(['bun', 'serve.ts', '--version'], {
    cwd: server,
    stdout: 'pipe',
    stderr: 'pipe'
  })
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited
  ])
  expect(code).toBe(0)
  expect(stderr).toBe('')
  expect(stdout.trim()).toBe(`server-${packageJson.version}`)
})

it('writes a 0600 dated backup inside PIERRE_HOME and refuses overwriting in the same second', async () => {
  const home = await mkdtemp(join(tmpdir(), 'pierre-backup-'))
  const server = join(import.meta.dir, '../..')
  try {
    const database = join(home, 'datastore.sqlite')
    const db = new Database(database)
    db.exec('create table kept (id integer primary key)')
    db.exec('insert into kept (id) values (1)')
    db.close()

    const runBackup = async () => {
      const proc = Bun.spawn(['bun', 'serve.ts', 'backup'], {
        cwd: server,
        env: { ...process.env, PIERRE_HOME: home },
        stdout: 'pipe',
        stderr: 'pipe'
      })
      const [stdout, stderr, code] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited
      ])
      return { stdout, stderr, code }
    }

    const first = await runBackup()
    expect(first.stderr).toBe('')
    expect(first.code).toBe(0)
    const destination = first.stdout.trim()
    expect(destination).toMatch(/\/backups\/datastore-\d{8}T\d{6}Z\.sqlite$/)
    expect(statSync(join(home, 'backups')).mode & 0o777).toBe(0o700)
    expect(statSync(destination).mode & 0o777).toBe(0o600)

    const copy = new Database(destination, { readonly: true })
    try {
      expect(copy.query('select id from kept').get()).toEqual({ id: 1 })
    } finally {
      copy.close()
    }

    const backupsDir = join(home, 'backups')
    const baseMs = Date.now()
    const stampOf = (ms: number) =>
      new Date(ms)
        .toISOString()
        .replace(/[-:]/g, '')
        .replace(/\.\d{3}/, '')
    for (let offset = -1; offset <= 10; offset += 1) {
      const candidate = join(backupsDir, `datastore-${stampOf(baseMs + offset * 1000)}.sqlite`)
      if (candidate !== destination) await writeFile(candidate, 'existing')
    }
    const beforeCollision = await readdir(backupsDir)

    const again = await runBackup()
    expect(again.code).toBe(1)
    expect(again.stderr).toContain('Sauvegarde déjà présente')
    expect(await readdir(backupsDir)).toEqual(beforeCollision)
  } finally {
    await rm(home, { recursive: true, force: true })
  }
})
