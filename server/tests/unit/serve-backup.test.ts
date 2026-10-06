import { Database } from 'bun:sqlite'
import { expect, it } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
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

it('writes the backup inside PIERRE_HOME', async () => {
  const home = await mkdtemp(join(tmpdir(), 'pierre-backup-'))
  const server = join(import.meta.dir, '../..')
  try {
    const database = join(home, 'datastore.sqlite')
    const db = new Database(database)
    db.exec('create table kept (id integer primary key)')
    db.exec('insert into kept (id) values (1)')
    db.close()

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
    const destination = join(home, 'backups', 'datastore.sqlite')
    expect(stderr).toBe('')
    expect(code).toBe(0)
    expect(stdout.trim()).toBe(destination)

    const copy = new Database(destination, { readonly: true })
    try {
      expect(copy.query('select id from kept').get()).toEqual({ id: 1 })
    } finally {
      copy.close()
    }
  } finally {
    await rm(home, { recursive: true, force: true })
  }
})
