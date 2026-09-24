import { Database } from 'bun:sqlite'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

import type { Context } from 'hono'

import { awaitKnowledgeBuild } from '../../../utils/knowledge/build-coordinator'
import { writeProfileFiles } from '../../../utils/knowledge/profile-files'
import { datastorePaths } from '../../../utils/paths'
import {
  SetupError,
  aboutReady,
  automationsReady,
  defaultChatbotReady,
  deleteInternalChatbot,
  emailReady,
  globalReady,
  internalChatbot,
  readSetupBytes,
  repaymentReady,
  ticketsReady,
  writeSetup
} from '../../../utils/setup-store'

const TEXT = new Set([
  'global',
  'email/html',
  'about/AGENTS.md',
  'automations/AGENTS.md',
  'tickets',
  'tickets/AGENTS.md',
  'repayment',
  'repayment/AGENTS.md',
  'chatbots/default',
  'chatbots/default/AGENTS.md'
])

function texts(): Record<string, string | null> {
  const db = new Database(datastorePaths().database)
  try {
    const rows = db
      .query<{ id: string; content: Uint8Array }, []>('SELECT id, content FROM setup')
      .all()
    const result: Record<string, string | null> = {}
    for (const id of TEXT) result[id] = null
    for (const row of rows) {
      if (row.id.endsWith('.png') || row.id.endsWith('.docx')) continue
      result[row.id] = new TextDecoder().decode(row.content)
    }
    return result
  } finally {
    db.close()
  }
}

function binaries(): string[] {
  const db = new Database(datastorePaths().database)
  try {
    return db
      .query<{ id: string }, []>('SELECT id FROM setup ORDER BY id')
      .all()
      .map((row) => row.id)
      .filter((id) => id.endsWith('.png') || id.endsWith('.docx') || id.endsWith('.svg'))
  } finally {
    db.close()
  }
}

export const getAdminSetup = (c: Context) =>
  c.json({
    texts: texts(),
    binaries: binaries(),
    ready: {
      global: globalReady(),
      email: emailReady(),
      'chatbots/default': defaultChatbotReady() != null,
      tickets: ticketsReady() != null,
      repayment: repaymentReady() != null,
      'about/AGENTS.md': aboutReady() != null,
      'automations/AGENTS.md': automationsReady() != null
    }
  })

const CHATBOT_SETUP = /^chatbots\/([a-z0-9][a-z0-9_-]{0,63})(?:\/AGENTS\.md)?$/

export function setupChatbotId(id: string): string | null {
  if (id === 'chatbots/icons/icon.svg') return 'default'
  const match = CHATBOT_SETUP.exec(id)
  if (!match || match[1] === 'icons') return null
  return match[1] ?? null
}

function communityKnowledge(id: string): boolean | null {
  const root = id === 'default' ? defaultChatbotReady() : internalChatbot(id)
  if (!root) return null
  return root.community_knowledge === true
}

/** Build si la base manque ou si community_knowledge change. Sinon, la consigne seule réécrit AGENTS.md. */
export async function syncChatbotKnowledge(
  chatbotId: string,
  setupId: string,
  before: boolean | null
): Promise<void> {
  const after = communityKnowledge(chatbotId)
  if (after == null) return
  const hasDb = existsSync(join(datastorePaths().knowledge, chatbotId, 'db.sqlite'))
  const flagChanged = before !== null && before !== after
  if (hasDb && !flagChanged && setupId.endsWith('/AGENTS.md')) {
    await writeProfileFiles(chatbotId)
    return
  }
  if (!hasDb || flagChanged) await awaitKnowledgeBuild('chatbot', null)
}

export const putAdminSetup = async (c: Context) => {
  const id = decodeURIComponent(c.req.path.replace(/^\/desktop\/admin\/setup\//, ''))
  if (!id || id.includes('..')) {
    return c.json({ error: { code: 'invalid', message: 'Pièce inconnue.' } }, 400)
  }
  const chatbotId = setupChatbotId(id)
  const before = chatbotId ? communityKnowledge(chatbotId) : null
  try {
    await writeSetup(id, new Uint8Array(await c.req.arrayBuffer()))
  } catch (error) {
    const message = error instanceof SetupError ? error.message : 'Enregistrement impossible.'
    return c.json({ error: { code: 'invalid', message } }, 400)
  }
  try {
    if (chatbotId) await syncChatbotKnowledge(chatbotId, id, before)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Enregistrement impossible.'
    return c.json({ error: { code: 'invalid', message } }, 400)
  }
  return c.json({ data: { id } })
}

export const deleteAdminChatbot = (c: Context) => {
  const id = c.req.param('id') ?? ''
  try {
    deleteInternalChatbot(id)
  } catch (error) {
    const message = error instanceof SetupError ? error.message : 'Suppression impossible.'
    return c.json({ error: { code: 'invalid', message } }, 400)
  }
  return c.json({ data: { id } })
}

export const getSetupFile = (c: Context) => {
  const id = decodeURIComponent(c.req.path.replace(/^\/desktop\/setup\//, ''))
  const content = readSetupBytes(id)
  if (!content) return c.json({ error: { code: 'not_found', message: 'Pièce absente.' } }, 404)
  const type = id.endsWith('.docx')
    ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    : id.endsWith('.svg')
      ? 'image/svg+xml'
      : id.endsWith('.png')
        ? 'image/png'
        : 'application/octet-stream'
  const copy = new ArrayBuffer(content.byteLength)
  new Uint8Array(copy).set(content)
  return new Response(new Blob([copy]), { headers: { 'content-type': type } })
}
