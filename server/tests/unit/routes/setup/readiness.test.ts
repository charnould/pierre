import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'

import { Hono } from 'hono'

import { getAdminSetup } from '../../../../routes/setup/admin'
import { getSetup } from '../../../../routes/setup/get'
import type { User } from '../../../../utils/_schema'
import { migrate_datastore } from '../../../../utils/datastore-migrations'
import { setDatastoreRoot, testDatastorePaths } from '../../../../utils/paths'
import {
  defaultChatbotReady,
  deleteInternalChatbot,
  writeSetup
} from '../../../../utils/setup-store'

const paths = testDatastorePaths('setup_chatbot_readiness')

function app() {
  const routed = new Hono<{ Variables: { user: User } }>()
  routed.use('*', async (c, next) => {
    c.set('user', {
      email: 'admin@example.org',
      isAdministrator: true,
      moduleIds: [],
      chatbotIds: []
    })
    await next()
  })
  routed.get('/setup', getSetup)
  routed.get('/admin/setup', getAdminSetup)
  return routed
}

beforeEach(async () => {
  setDatastoreRoot(paths.root)
  await rm(paths.root, { recursive: true, force: true })
  await mkdir(paths.root, { recursive: true })
  await migrate_datastore(paths.database)
})

afterEach(async () => {
  setDatastoreRoot(null)
  await rm(paths.root, { recursive: true, force: true })
})

describe('setup chatbot readiness routes', () => {
  it('marks chatbot ready in /setup and /admin/setup with only an internal agent configured', async () => {
    const routed = app()

    const emptySetup = (await (await routed.request('/setup')).json()) as {
      data: { chatbot: boolean }
    }
    const emptyAdmin = (await (await routed.request('/admin/setup')).json()) as {
      texts: Record<string, string | null>
      ready: Record<string, boolean>
    }
    expect(emptySetup.data.chatbot).toBe(false)
    expect(emptyAdmin.ready['chatbots/default']).toBe(false)
    expect(emptyAdmin.texts['chatbots/default']).toBeNull()
    expect(emptyAdmin.texts['chatbots/default/AGENTS.md']).toBeNull()

    await writeSetup(
      'chatbots/cadre-astreinte',
      new TextEncoder().encode(
        JSON.stringify({
          id: 'cadre-astreinte',
          display: "Cadre d'astreinte",
          community_knowledge: true,
          trace: 'collapsed',
          attachments: true,
          greetings: ["Que s'est-il passé ?"],
          examples: ['Quelle est la procédure ?'],
          disclaimer: 'Vérifiez.'
        })
      )
    )
    await writeSetup('chatbots/cadre-astreinte/AGENTS.md', new TextEncoder().encode('réfléchis'))

    expect(defaultChatbotReady()).toBeNull()

    const internalSetup = (await (await routed.request('/setup')).json()) as {
      data: { chatbot: boolean }
    }
    const internalAdmin = (await (await routed.request('/admin/setup')).json()) as {
      ready: Record<string, boolean>
    }
    expect(internalSetup.data.chatbot).toBe(true)
    expect(internalAdmin.ready['chatbots/default']).toBe(true)

    deleteInternalChatbot('cadre-astreinte')

    const afterDelete = (await (await routed.request('/setup')).json()) as {
      data: { chatbot: boolean }
    }
    expect(afterDelete.data.chatbot).toBe(false)
  })
})
