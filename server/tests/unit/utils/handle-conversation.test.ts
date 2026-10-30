import { Database } from 'bun:sqlite'
import { afterAll, beforeAll, describe, expect, it, setSystemTime } from 'bun:test'
import { rm } from 'node:fs/promises'

import { AIContext, type ChatbotConfig } from '../../../utils/_schema'
import { save_reply } from '../../../utils/handle-conversation'
import { setDatastoreRoot, testDatastorePaths } from '../../../utils/paths'
import { setup } from '../../../utils/setup'

const paths = testDatastorePaths('handle_conversation')
const config: ChatbotConfig = {
  id: 'default',
  display: 'PIERRE',
  enabled: true,
  community_knowledge: true,
  trace: 'none',
  attachments: false,
  greetings: ['Bonjour'],
  examples: ['Question'],
  disclaimer: 'Vérifier.'
}

beforeAll(async () => {
  setDatastoreRoot(paths.root)
  await rm(paths.root, { recursive: true, force: true })
  await setup()
})

afterAll(async () => {
  setSystemTime()
  setDatastoreRoot(null)
  await rm(paths.root, { recursive: true, force: true })
})

describe('save_reply', () => {
  it('stores each turn on one conversation row', async () => {
    setSystemTime(new Date('2012-12-12T12:05:00.000Z'))
    const user = await AIContext.parseAsync({
      conv_id: 'c1',
      config,
      role: 'user',
      content: 'Bonjour',
      user_email: 'alice@example.org',
      custom_data: { raw: [] }
    })
    const assistant = await AIContext.parseAsync({
      conv_id: 'c1',
      config,
      role: 'assistant',
      content: 'Je suis Pierre !',
      user_email: 'alice@example.org',
      custom_data: { raw: ['julie', '456.56'] }
    })

    await save_reply(user)
    setSystemTime(new Date('2012-12-12T12:05:01.000Z'))
    await save_reply(assistant)
    await save_reply(assistant)

    using db = new Database(paths.database)
    const row = db
      .query<{ conv_id: string; config_id: string; user_email: string; messages: string }, []>(
        'SELECT conv_id, config_id, user_email, messages FROM conversations'
      )
      .get()
    expect(row).toMatchObject({
      conv_id: 'c1',
      config_id: 'default',
      user_email: 'alice@example.org'
    })
    const messages = JSON.parse(row!.messages) as Array<{ role: string; content: string }>
    expect(messages.map(({ role, content }) => ({ role, content }))).toEqual([
      { role: 'user', content: 'Bonjour' },
      { role: 'assistant', content: 'Je suis Pierre !' },
      { role: 'assistant', content: 'Je suis Pierre !' }
    ])
  })

  it('ignores contexts that only carry a config id', async () => {
    const context = {
      conv_id: 'c2',
      config: 'default',
      role: 'user',
      content: 'Bonjour',
      custom_data: { raw: [] }
    } as unknown as Parameters<typeof save_reply>[0]

    await save_reply(context)

    using db = new Database(paths.database)
    expect(
      db.query<{ count: number }, []>('SELECT COUNT(*) AS count FROM conversations').get()?.count
    ).toBe(1)
  })
})
