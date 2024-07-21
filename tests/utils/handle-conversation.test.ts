import { beforeAll, expect, it } from 'bun:test'
import { AIContext } from '../../utils/_schema'
import { db } from '../../utils/database'
import {
  get_conversation,
  get_conversations_for_review,
  save_reply,
  score_conversation
} from '../../utils/handle-conversation'

beforeAll(() => db('telemetry').query('DELETE FROM telemetry').run())

//
//
//
//
//
//
it('should insert 3 replies and get 2 conversations', async () => {
  const reply_1 = await AIContext.parseAsync({
    id: '49bead3b-5e21-4c15-aa25-c8c6ba6ea94c',
    config: '_default',
    role: 'user',
    content: 'Bonjour, qui es-tu ?',
    timestamp: new Date('2020-01-01T00:00:00.000Z').toISOString()
  })

  save_reply(reply_1, false)

  const reply_2 = await AIContext.parseAsync({
    id: '49bead3b-5e21-4c15-aa25-c8c6ba6ea94c',
    config: '_default',
    role: 'assistant',
    content: 'Je suis Pierre',
    timestamp: new Date('2020-01-01T00:00:10.000Z').toISOString()
  })

  save_reply(reply_2, false)

  expect(get_conversation(reply_2.id)).toMatchSnapshot()

  const reply_3 = await AIContext.parseAsync({
    id: '6e6f3b06-4754-4ca0-b4ff-0fb941bcb254',
    config: '_default',
    role: 'user',
    content: 'Bonjour',
    timestamp: new Date('2020-01-01T00:08:00.000Z').toISOString()
  })

  save_reply(reply_3, false)
  expect(get_conversation(reply_3.id)).toMatchSnapshot()
})

//
//
//
//
//
//
it('should score a conversation for user and reviewer', () => {
  score_conversation(
    {
      id: '49bead3b-5e21-4c15-aa25-c8c6ba6ea94c',
      scorer: 'user',
      score: 0,
      comment: null
    },
    false
  )

  score_conversation(
    {
      id: '49bead3b-5e21-4c15-aa25-c8c6ba6ea94c',
      scorer: 'reviewer',
      score: 2,
      comment: 'Réponse peu précise'
    },
    false
  )

  expect(get_conversation('49bead3b-5e21-4c15-aa25-c8c6ba6ea94c')).toMatchSnapshot()
})

//
//
//
//
//
//
it('should get all conversations', () => {
  expect(get_conversations_for_review()).toMatchSnapshot()
})
