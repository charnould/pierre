import { Database } from 'bun:sqlite'
import { afterAll, beforeAll, expect, it, setSystemTime } from 'bun:test'
import { AIContext } from '../../utils/_schema'
import { db } from '../../utils/database'
import {
  delete_conversation,
  get_conversation,
  get_conversations_for_review,
  save_reply,
  score_conversation
} from '../../utils/handle-conversation'

//
//
//
//
//
//
beforeAll(() => {
  setSystemTime(new Date('2012-11-10T09:08:07'))
  const tdb = db('telemetry')
  if (tdb instanceof Database) tdb.query('DELETE FROM telemetry').run()
})

//
//
//
//
//
//
it('should insert 3 replies and retrieve 2 conversations', async () => {
  // id_1
  const r_1_1 = await AIContext.parseAsync({
    id: 'id_1',
    config: 'pierre-ia.org',
    role: 'user',
    content: 'Qui es-tu ?'
  })

  const r_1_2 = await AIContext.parseAsync({
    id: 'id_1',
    config: 'pierre-ia.org',
    role: 'assistant',
    content: 'Je suis Pierre !'
  })

  // id_2
  const r_2_1 = await AIContext.parseAsync({
    id: 'id_2',
    config: 'pierre-ia.org',
    role: 'user',
    content: 'Bonjour'
  })

  save_reply(r_1_1, false)
  save_reply(r_1_2, false)
  save_reply(r_2_1, false)

  // Tests
  expect(get_conversation(r_1_1.id)).toMatchSnapshot()
  expect(get_conversation(r_2_1.id)).toMatchSnapshot()
})

//
//
//
//
//
//
it('should score 2 conversations for customer + organization + external', () => {
  score_conversation(
    {
      id: 'id_1',
      scorer: 'customer',
      score: 0,
      comment: "C'est nul pour le Customer"
    },
    false
  )

  score_conversation(
    {
      id: 'id_1',
      scorer: 'organization',
      score: 1,
      comment: "C'est 1 pour l'Organzation"
    },
    false
  )

  score_conversation(
    {
      id: 'id_2',
      scorer: 'external',
      score: 2,
      comment: "C'est 2 pour l'External"
    },
    false
  )

  expect(get_conversation('id_1')).toMatchSnapshot()
  expect(get_conversation('id_2')).toMatchSnapshot()
})

//
//
//
//
//
//
it('should insert 2 replies (from 1 conversation) and delete this conversation', async () => {
  // id_3
  const r_3_1 = await AIContext.parseAsync({
    id: 'id_3',
    config: 'pierre-ia.org',
    role: 'user',
    content: 'Conv 3_1'
  })

  const r_3_2 = await AIContext.parseAsync({
    id: 'id_3',
    config: 'pierre-ia.org',
    role: 'assistant',
    content: 'Conv 3_2'
  })

  save_reply(r_3_1, false)
  save_reply(r_3_2, false)

  // Tests
  expect(get_conversation(r_3_1.id)).toMatchSnapshot()
  expect(delete_conversation(r_3_1.id)).toMatchSnapshot()
})

//
//
//
//
//
//
it('should retrieve all conversations', () => {
  expect(get_conversations_for_review()).toMatchSnapshot()
})

//
//
//
//
//
//
afterAll(() => setSystemTime())
