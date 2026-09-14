import { Database } from 'bun:sqlite'
import { afterAll, beforeAll, describe, expect, it, setSystemTime } from 'bun:test'
import { rm } from 'node:fs/promises'

import { AIContext } from '../../../utils/_schema'
import {
  delete_conversation,
  get_conversation,
  get_conversations,
  save_reply,
  save_topic,
  score_conversation
} from '../../../utils/handle-conversation'
import { datastorePaths } from '../../../utils/paths'
import { setup } from '../../../utils/setup'

const TEST_SERVICE = '_test_handle_conversation'
const ORIGINAL_SERVICE = Bun.env['SERVICE']
const TEST_PATHS = datastorePaths(TEST_SERVICE)
const config = (await import(`../../../../customization/chatbots/default/config`)).default

// Simulated responses for test cases
const c1_r1 = await AIContext.parseAsync({
  conv_id: 'c1',
  config: config,
  role: 'user',
  content: 'Qui es-tu ?',
  custom_data: { raw: ['julie', '456.56'] }
})

const c1_r2 = await AIContext.parseAsync({
  conv_id: 'c1',
  config: config,
  role: 'assistant',
  content: 'Je suis Pierre !',
  custom_data: { raw: ['julie', '456.56'] }
})

const c2_r1 = await AIContext.parseAsync({
  conv_id: 'c2',
  config: config,
  role: 'user',
  content: 'Bonjour',
  custom_data: { raw: ['julie', '456.56'] }
})

beforeAll(async () => {
  Bun.env['SERVICE'] = TEST_SERVICE
  await rm(TEST_PATHS.root, { recursive: true, force: true })
  await setup()
  using db = new Database(TEST_PATHS.database)
  db.run('DELETE FROM conversations')
})
afterAll(async () => {
  setSystemTime()
  if (ORIGINAL_SERVICE === undefined) delete Bun.env['SERVICE']
  else Bun.env['SERVICE'] = ORIGINAL_SERVICE
  await rm(TEST_PATHS.root, { recursive: true, force: true })
})

//
//
describe('test SQLite3 conversation CRUD operations', async () => {
  it('should insert 3 replies', async () => {
    setSystemTime(new Date('2012-12-12T12:05:00'))
    await save_reply(c1_r1)

    setSystemTime(new Date('2012-12-12T12:10:00'))
    await save_reply(c1_r2)

    setSystemTime(new Date('2012-12-12T12:15:00'))
    await save_reply(c2_r1)

    expect(await get_conversations()).toMatchSnapshot()
  })

  it('should get 2 conversations', async () => {
    expect(await get_conversation(c1_r1.conv_id)).toMatchSnapshot()
    expect(await get_conversation(c2_r1.conv_id)).toMatchSnapshot()
  })

  it('should have score', async () => {
    await score_conversation({
      conv_id: 'c1',
      scorer: 'customer',
      score: 1,
      comment: 'customer_comment'
    })

    await score_conversation({
      conv_id: 'c1',
      scorer: 'organization',
      score: 2,
      comment: 'organization_comment'
    })

    await score_conversation({
      conv_id: 'c1',
      scorer: 'ai',
      score: 3,
      comment: 'ai_comment'
    })

    expect(await get_conversation('c1')).toMatchSnapshot()

    await score_conversation({
      conv_id: 'c2',
      scorer: 'ai',
      score: 3,
      comment: 'ai_comment'
    })

    expect(await get_conversation('c2')).toMatchSnapshot()
  })

  it('should save topic', async () => {
    await save_topic({ conv_id: 'c1', topic: 'multiple' })
    expect(await get_conversation('c1')).toMatchSnapshot()
  })

  it('should delete full conversation', async () => {
    await delete_conversation(c1_r1.conv_id)
    expect(await get_conversation(c1_r1.conv_id)).toStrictEqual([])
  })

  it('should retrieve all conversations', async () => {
    expect(await get_conversations()).toMatchSnapshot()
  })
})
