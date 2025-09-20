import { afterAll, beforeAll, expect, it, setSystemTime } from 'bun:test'
import { SQL } from 'bun'
import { AIContext } from '../../utils/_schema'
import {
  assign_topic_with_ai,
  score_conversation_with_ai
} from '../../utils/categorize-and-score-conversation'
import { save_reply } from '../../utils/handle-conversation'

const sql = new SQL(`sqlite:datastores/${Bun.env.SERVICE}/datastore.sqlite`)

beforeAll(async () => {
  // Simulated responses for test cases
  await sql`DELETE FROM telemetry`
  setSystemTime(new Date('2012-12-12T12:05:00'))
  await save_reply(
    await AIContext.parseAsync({
      conv_id: 'c1',
      config: 'default',
      role: 'user',
      content: 'Qui es-tu ?',
      custom_data: { raw: [] }
    })
  )

  setSystemTime(new Date('2012-12-12T12:10:00'))
  await save_reply(
    await AIContext.parseAsync({
      conv_id: 'c1',
      config: 'default',
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

  const record = await sql`
    SELECT
      *
    FROM
      telemetry
    WHERE
      conv_id = 'c1'
    LIMIT
      1
  `
  record.metadata = JSON.parse(record.metadata)

  expect(record.metadata.topics).toBe('chatbot')
  expect(record.metadata.evaluation.ai.score).toBeString()
  expect(record.metadata.evaluation.ai.comment).toBeString()
})
