import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const SCRIPT = resolve(import.meta.dir, '../../../microvm/guest/skills/carl/scripts/carl.mjs')

type MockHandler = (texte: string) => Response

let handler: MockHandler = () => new Response('not configured', { status: 500 })
let server: ReturnType<typeof Bun.serve>
let workDir: string

const sampleOutput = (motif: string) => ({
  domaine: 'technique',
  sous_domaine: 'menuiserie',
  motif,
  integrite_physique: 'non',
  lieu: 'logement',
  obligation_reglementaire: 'non',
  ton: 'neutre'
})

async function runCarl(args: string[], stdin?: string) {
  const proc = Bun.spawn(['node', SCRIPT, ...args], {
    env: { ...process.env, PIERRE_URL: server.url.origin },
    stdin: stdin === undefined ? 'ignore' : new TextEncoder().encode(stdin),
    stdout: 'pipe',
    stderr: 'pipe'
  })
  const [exitCode, stdout, stderr] = await Promise.all([
    proc.exited,
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text()
  ])
  return { exitCode, stdout, stderr }
}

beforeAll(async () => {
  workDir = await mkdtemp(join(tmpdir(), 'carl-cli-'))
  server = Bun.serve({
    hostname: '127.0.0.1',
    port: 0,
    async fetch(request) {
      if (request.method !== 'POST' || new URL(request.url).pathname !== '/carl') {
        return new Response('Not found', { status: 404 })
      }
      const body = (await request.json()) as { texte?: string }
      return handler(body.texte ?? '')
    }
  })
})

afterAll(async () => {
  await server.stop(true)
  await rm(workDir, { recursive: true, force: true })
})

describe('carl CLI', () => {
  it('classifies a direct CLI argument and prints compact output JSON', async () => {
    const received: string[] = []
    handler = (texte) => {
      received.push(texte)
      return Response.json({
        data: { input: texte, milliseconds: 12, output: sampleOutput('volet_bloque') }
      })
    }

    const result = await runCarl(['Bonjour, mon volet roulant est bloqué'])
    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe('')
    expect(received).toEqual(['Bonjour, mon volet roulant est bloqué'])
    expect(JSON.parse(result.stdout)).toEqual(sampleOutput('volet_bloque'))
  })

  it('classifies a multiline message from stdin', async () => {
    const received: string[] = []
    handler = (texte) => {
      received.push(texte)
      return Response.json({
        data: { input: texte, milliseconds: 9, output: sampleOutput('fuite_eau') }
      })
    }

    const message = 'Bonjour,\nJ’ai une fuite sous mon évier.\nMerci.'
    const result = await runCarl([], message)
    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe('')
    expect(received).toEqual([message])
    expect(JSON.parse(result.stdout)).toEqual(sampleOutput('fuite_eau'))
  })

  it('processes --batch line by line while skipping blank lines', async () => {
    const file = join(workDir, 'messages.txt')
    await Bun.write(file, 'Volet bloqué\n\n   \nFuite robinet\n')

    handler = (texte) =>
      Response.json({
        data: {
          input: texte,
          milliseconds: 5,
          output: sampleOutput(texte.includes('Volet') ? 'volet' : 'fuite')
        }
      })

    const result = await runCarl(['--batch', file])
    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe('')
    const lines = result.stdout
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line))
    expect(lines).toEqual([
      { texte: 'Volet bloqué', output: sampleOutput('volet') },
      { texte: 'Fuite robinet', output: sampleOutput('fuite') }
    ])
  })

  it('processes --batch JSON string array including multiline messages and per-item HTTP 400 errors', async () => {
    const file = join(workDir, 'batch.json')
    const items = ['Ligne 1\nLigne 2', '   ', 'Dernier message']
    await Bun.write(file, JSON.stringify(items))

    handler = (texte) => {
      if (!texte.trim()) {
        return Response.json(
          { error: { code: 'invalid', message: 'Texte vide.' } },
          { status: 400 }
        )
      }
      return Response.json({
        data: { input: texte, milliseconds: 4, output: sampleOutput('ok') }
      })
    }

    const result = await runCarl(['--batch', file])
    expect(result.exitCode).toBe(0)
    expect(result.stderr).toBe('')
    const lines = result.stdout
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line))
    expect(lines).toEqual([
      { texte: 'Ligne 1\nLigne 2', output: sampleOutput('ok') },
      { texte: '   ', error: 'Texte vide.' },
      { texte: 'Dernier message', output: sampleOutput('ok') }
    ])
  })

  it('fails fast on HTTP 503 during --batch', async () => {
    const received: string[] = []
    handler = (texte) => {
      received.push(texte)
      return Response.json(
        { error: { code: 'missing', message: "Le modèle Carl n'est pas installé." } },
        { status: 503 }
      )
    }

    const result = await runCarl(['--batch'], 'Premier message\nDeuxième message\n')
    expect(result.exitCode).toBe(1)
    expect(result.stdout).toBe('')
    expect(result.stderr).toContain("Le modèle Carl n'est pas installé.")
    expect(received).toEqual(['Premier message'])
  })

  it('includes the underlying network error code when the server is unreachable', async () => {
    const closed = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch: () => new Response() })
    const closedOrigin = closed.url.origin
    await closed.stop(true)

    const proc = Bun.spawn(['node', SCRIPT, 'Bonjour'], {
      env: { ...process.env, PIERRE_URL: closedOrigin },
      stdin: 'ignore',
      stdout: 'pipe',
      stderr: 'pipe'
    })
    const [exitCode, stdout, stderr] = await Promise.all([
      proc.exited,
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text()
    ])
    expect(exitCode).toBe(1)
    expect(stdout).toBe('')
    expect(stderr).toContain('ECONNREFUSED')
  })
})
