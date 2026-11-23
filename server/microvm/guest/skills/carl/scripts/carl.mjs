#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { text as readStreamText } from 'node:stream/consumers'

const BASE_URL = (process.env.PIERRE_URL || 'http://100.96.0.1:3000').replace(/\/+$/, '')
const ENDPOINT = `${BASE_URL}/carl`
const TIMEOUT_MS = 15_000

async function classifyOne(texte) {
  let response
  try {
    response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ texte }),
      signal: AbortSignal.timeout(TIMEOUT_MS)
    })
  } catch (error) {
    const reason = error instanceof Error ? error.cause : null
    const code = reason && typeof reason === 'object' && 'code' in reason ? reason.code : null
    const base = error instanceof Error ? error.message : String(error)
    const detail = typeof code === 'string' ? `${base} (${code})` : base
    return { ok: false, fatal: true, message: `Impossible de joindre ${ENDPOINT}: ${detail}` }
  }

  const payload = await response.json().catch(() => null)
  if (response.ok) {
    if (payload?.data?.output) return { ok: true, output: payload.data.output }
    return { ok: false, fatal: true, message: 'Réponse CARL invalide.' }
  }

  return {
    ok: false,
    fatal: response.status >= 500 || response.status === 404,
    message: payload?.error?.message || `HTTP ${response.status}`
  }
}

function parseBatch(raw) {
  const trimmed = raw.trim()
  if (!trimmed) return []
  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
        return parsed
      }
    } catch {
      // Not a JSON string array: fall back to one message per line.
    }
  }
  return raw.split(/\r?\n/).filter((line) => line.trim().length > 0)
}

async function main() {
  const args = process.argv.slice(2)

  if (args[0] === '--batch') {
    if (args.length > 2) {
      console.error('usage: carl [--batch [fichier]] | carl "texte"')
      process.exit(1)
    }
    const raw =
      args[1] && args[1] !== '-'
        ? readFileSync(args[1], 'utf8')
        : await readStreamText(process.stdin)
    for (const texte of parseBatch(raw)) {
      const result = await classifyOne(texte)
      if (result.ok) {
        process.stdout.write(`${JSON.stringify({ texte, output: result.output })}\n`)
      } else if (result.fatal) {
        console.error(result.message)
        process.exit(1)
      } else {
        process.stdout.write(`${JSON.stringify({ texte, error: result.message })}\n`)
      }
    }
    return
  }

  let texte
  if (args.length > 0) {
    texte = args.join(' ')
  } else if (process.stdin.isTTY) {
    console.error('usage: carl "texte" | carl < message.txt | carl --batch [fichier]')
    process.exit(1)
  } else {
    texte = await readStreamText(process.stdin)
  }

  const result = await classifyOne(texte)
  if (!result.ok) {
    console.error(result.message)
    process.exit(1)
  }
  process.stdout.write(`${JSON.stringify(result.output)}\n`)
}

main().catch((cause) => {
  console.error(cause instanceof Error ? cause.message : String(cause))
  process.exit(1)
})
