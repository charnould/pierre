import { Database } from 'bun:sqlite'
import { join } from 'node:path'

import { isPromptId } from '../../../shared/prompts'
import { chatbotInstructions } from '../chatbot-config'
import { SERVER_ROOT } from '../paths'
import { skillPrompt } from '../setup-store'
import { getKnowledgePath } from '../smolvm'

/** Consigne figée et fichiers du profil. Pas de date, pas de payload de workflow. */
export async function writeProfileFiles(profileId: string): Promise<void> {
  const dir = getKnowledgePath(profileId)
  let raw = (
    isPromptId(profileId) ? (skillPrompt(profileId) ?? '') : chatbotInstructions(profileId)
  ).trim()
  const dbPath = join(dir, 'db.sqlite')
  if (raw.includes('<!-- KNOWLEDGE_SCHEMA_HERE -->') && (await Bun.file(dbPath).exists())) {
    const db = new Database(dbPath, { readonly: true })
    try {
      const row = db.query<{ content: string }, []>('SELECT content FROM _readme').get()
      raw = raw.replace('<!-- KNOWLEDGE_SCHEMA_HERE -->', row?.content?.trim() ?? '')
    } finally {
      db.close()
    }
  }
  await Bun.write(join(dir, 'AGENTS.md'), raw)
  if (profileId !== 'report') return
  const example = Bun.file(join(SERVER_ROOT, 'utils/automations/report-example.html'))
  if (await example.exists()) await Bun.write(join(dir, 'example.html'), example)
}
