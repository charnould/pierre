import type { Database } from 'bun:sqlite'
import { afterAll, beforeAll, describe, expect, it, setSystemTime } from 'bun:test'
import { AIContext } from '../../../utils/_schema'
import { db } from '../../../utils/database'
import {
  delete_conversation,
  get_conversation,
  get_conversations,
  save_reply,
  save_topic,
  score_conversation
} from '../../../utils/handle-conversation'

// Simulated responses for test cases
const c1_r1 = await AIContext.parseAsync({
  conv_id: 'c1',
  config: 'default',
  role: 'user',
  content: 'Qui es-tu ?',
  custom_data: { raw: ['julie', '456.56'] }
})

const c1_r2 = await AIContext.parseAsync({
  conv_id: 'c1',
  config: 'default',
  role: 'assistant',
  content: 'Je suis Pierre !',
  custom_data: { raw: ['julie', '456.56'] }
})

const c2_r1 = await AIContext.parseAsync({
  conv_id: 'c2',
  config: 'default',
  role: 'user',
  content: 'Bonjour',
  custom_data: { raw: ['julie', '456.56'] }
})

const database = db('datastore') as Database
beforeAll(() => database.query('DELETE FROM telemetry').run())
afterAll(() => setSystemTime())

describe('test SQLite3 conversation CRUD operations', () => {
  it('should insert 3 replies', async () => {
    setSystemTime(new Date('2012-12-12T12:05:00'))
    save_reply(c1_r1)

    setSystemTime(new Date('2012-12-12T12:10:00'))
    save_reply(c1_r2)

    setSystemTime(new Date('2012-12-12T12:15:00'))
    save_reply(c2_r1)

    expect(database.query('SELECT * FROM telemetry').all()).toMatchSnapshot()
  })

  it('should get 2 conversations', async () => {
    expect(get_conversation(c1_r1.conv_id)).toMatchSnapshot()
    expect(get_conversation(c2_r1.conv_id)).toMatchSnapshot()
  })

  it('should save score', () => {
    score_conversation({
      conv_id: 'c1',
      scorer: 'customer',
      score: 1,
      comment: 'customer_comment'
    })

    score_conversation({
      conv_id: 'c1',
      scorer: 'organization',
      score: 2,
      comment: 'organization_comment'
    })

    score_conversation({
      conv_id: 'c1',
      scorer: 'ai',
      score: 3,
      comment: 'ai_comment'
    })

    expect(get_conversation('c1')).toMatchSnapshot()

    score_conversation({
      conv_id: 'c2',
      scorer: 'ai',
      score: 3,
      comment: 'ai_comment'
    })

    expect(get_conversation('c2')).toMatchSnapshot()
  })

  it('should save topic', () => {
    save_topic({ conv_id: 'c1', topic: 'multiple' })
    expect(get_conversation('c1')).toMatchSnapshot()
  })

  it('should delete full conversation', async () => {
    delete_conversation(c1_r1.conv_id)
    expect(get_conversation(c1_r1.conv_id)).toStrictEqual([])
  })

  it('should retrieve all conversations', () => {
    expect(get_conversations()).toMatchSnapshot()
  })
})
