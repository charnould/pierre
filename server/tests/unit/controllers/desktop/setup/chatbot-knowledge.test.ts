import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'

import { syncChatbotKnowledge } from '../../../../../controllers/desktop/setup/admin'
import { migrate_datastore } from '../../../../../utils/datastore-migrations'
import { listKnowledgeBuilds } from '../../../../../utils/knowledge/catalog'
import { setDatastoreRoot, testDatastorePaths } from '../../../../../utils/paths'
import { writeSetup } from '../../../../../utils/setup-store'

const paths = testDatastorePaths('chatbot-knowledge')
const id = 'cadre_astreinte'

const chatbot = (community_knowledge: boolean) =>
  new TextEncoder().encode(
    JSON.stringify({
      id,
      display: 'Cadre astreinte',
      community_knowledge,
      reasoning_effort: 'medium',
      trace: 'none',
      attachments: false,
      greetings: ['Bonjour'],
      examples: ['Question'],
      disclaimer: 'Vérifier.'
    })
  )

beforeAll(() => {
  setDatastoreRoot(paths.root)
})

afterAll(() => {
  setDatastoreRoot(null)
})

beforeEach(async () => {
  await rm(paths.root, { recursive: true, force: true })
  await mkdir(paths.files, { recursive: true })
  await mkdir(paths.knowledge, { recursive: true })
  await migrate_datastore(paths.database)
})

describe('chatbot knowledge sync', () => {
  it('builds sqlite when the agent becomes complete, then rewrites only the consigne', async () => {
    await writeSetup(`chatbots/${id}`, chatbot(false))
    await syncChatbotKnowledge(id, `chatbots/${id}`, null)
    expect(await Bun.file(join(paths.knowledge, id, 'db.sqlite')).exists()).toBe(false)

    await writeSetup(`chatbots/${id}/AGENTS.md`, new TextEncoder().encode('Consigne astreinte.'))
    await syncChatbotKnowledge(id, `chatbots/${id}/AGENTS.md`, null)
    expect(await Bun.file(join(paths.knowledge, id, 'db.sqlite')).exists()).toBe(true)
    expect(await Bun.file(join(paths.knowledge, id, 'AGENTS.md')).text()).toContain(
      'Consigne astreinte.'
    )
    const builds = listKnowledgeBuilds().length

    await writeSetup(`chatbots/${id}/AGENTS.md`, new TextEncoder().encode('Consigne mise à jour.'))
    await syncChatbotKnowledge(id, `chatbots/${id}/AGENTS.md`, false)
    expect(listKnowledgeBuilds()).toHaveLength(builds)
    expect(await Bun.file(join(paths.knowledge, id, 'AGENTS.md')).text()).toBe(
      'Consigne mise à jour.'
    )

    await Bun.write(join(paths.knowledge, id, 'AGENTS.md'), 'laisse')
    await syncChatbotKnowledge(id, `chatbots/${id}`, false)
    expect(await Bun.file(join(paths.knowledge, id, 'AGENTS.md')).text()).toBe('laisse')
  }, 60_000)
})
