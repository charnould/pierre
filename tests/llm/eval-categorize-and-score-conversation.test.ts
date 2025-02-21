import type { Database } from 'bun:sqlite'
import { afterAll, beforeAll, expect, it, setSystemTime } from 'bun:test'
import { AIContext } from '../../utils/_schema'
import {
  assign_topic_with_ai,
  score_conversation_with_ai
} from '../../utils/categorize-and-score-conversation'
import { db } from '../../utils/database'
import { save_reply } from '../../utils/handle-conversation'

const database = db('datastore') as Database

beforeAll(async () => {
  // Simulated responses for test cases
  database.query('DELETE FROM telemetry').run()
  setSystemTime(new Date('2012-12-12T12:05:00'))
  save_reply(
    await AIContext.parseAsync({
      conv_id: 'c1',
      config: 'pierre-ia.org',
      role: 'user',
      content: 'Qui es-tu ?',
      custom_data: { raw: [] }
    })
  )

  setSystemTime(new Date('2012-12-12T12:10:00'))
  save_reply(
    await AIContext.parseAsync({
      conv_id: 'c1',
      config: 'pierre-ia.org',
      role: 'assistant',
      content: 'Je suis Pierre !',
      custom_data: { raw: [] }
    })
  )
})

afterAll(() => setSystemTime())

it('should score conversation and assign topic with AI', async () => {
  await score_conversation_with_ai()
  await assign_topic_with_ai()

  const record = database.query("SELECT * FROM telemetry WHERE conv_id = 'c1' LIMIT 1").get()
  record.metadata = JSON.parse(record.metadata)

  expect(record.metadata.topics).toBe('chatbot')
  expect(record.metadata.evaluation.ai.score).toBeString()
  expect(record.metadata.evaluation.ai.comment).toBeString()
})
