import { Database } from 'bun:sqlite'
import { afterAll, beforeAll, describe, expect, it, setSystemTime } from 'bun:test'
import { rm } from 'node:fs/promises'

import { AIContext } from '../../../utils/_schema'
import { save_reply } from '../../../utils/handle-conversation'
import { setDatastoreRoot, testDatastorePaths } from '../../../utils/paths'
import { setup } from '../../../utils/setup'

const paths = testDatastorePaths('handle_conversation')
const config = (await import(`../../../../customization/chatbots/default/config`)).default

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
  it('stores a chatbot reply once with serialized metadata', async () => {
    setSystemTime(new Date('2012-12-12T12:05:00Z'))
    const context = await AIContext.parseAsync({
      conv_id: 'c1',
      config,
      role: 'assistant',
      content: 'Je suis Pierre !',
      metadata: { user: 'alice@example.org', topics: 'présentation' },
      custom_data: { raw: ['julie', '456.56'] }
    })

    await save_reply(context)
    await save_reply(context)

    using db = new Database(paths.database)
    const rows = db
      .query<
        {
          conv_id: string
          config: string
          role: string
          timestamp: string
          content: string
          metadata: string
        },
        []
      >(
        `SELECT conv_id, config, role, timestamp, content, metadata
         FROM conversations`
      )
      .all()

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      conv_id: 'c1',
      config: 'default',
      role: 'assistant',
      timestamp: '2012-12-12T12:05:00Z',
      content: 'Je suis Pierre !'
    })
    expect(JSON.parse(rows[0]!.metadata)).toMatchObject({
      user: 'alice@example.org',
      topics: 'présentation'
    })
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
