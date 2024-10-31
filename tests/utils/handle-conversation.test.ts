import { Database } from 'bun:sqlite'
import { afterAll, beforeAll, expect, it, setSystemTime } from 'bun:test'
import { AIContext } from '../../utils/_schema'
import { db } from '../../utils/database'
import {
  delete_conversation,
  get_conversation,
  get_conversations,
  save_reply,
  score_conversation
} from '../../utils/handle-conversation'

// This test will fail in GitHub Actions because `config.ts` (via Zod parsing)
// is not committed. Therefore, it should NOT run in GitHub Actions.
if (Bun.env.GITHUB_ACTIONS === undefined) {
  //
  //
  // Dummy replies for testing purpose
  const r_1_1 = await AIContext.parseAsync({
    conv_id: 'id_1',
    config: 'pierre-ia.org',
    role: 'user',
    content: 'Qui es-tu ?'
  })

  const r_1_2 = await AIContext.parseAsync({
    conv_id: 'id_1',
    config: 'pierre-ia.org',
    role: 'assistant',
    content: 'Je suis Pierre !'
  })

  const r_2_1 = await AIContext.parseAsync({
    conv_id: 'id_2',
    config: 'pierre-ia.org',
    role: 'user',
    content: 'Bonjour'
  })

  //
  //
  //
  //
  //
  //
  beforeAll(() => {
    const database = db('telemetry')
    if (database instanceof Database) database.query('DELETE FROM telemetry').run()
  })

  afterAll(() => {
    setSystemTime()
  })

  //
  //
  //
  //
  //
  //
  it('should insert 3 replies', async () => {
    setSystemTime(new Date('2012-12-12T12:05:00'))
    save_reply(r_1_1, false)
    setSystemTime(new Date('2012-12-12T12:10:00'))
    save_reply(r_1_2, false)
    setSystemTime(new Date('2012-12-12T12:15:00'))
    save_reply(r_2_1, false)

    const database = db('telemetry')
    if (database instanceof Database)
      expect(database.query('SELECT * FROM telemetry').all()).toMatchSnapshot()
  })

  //
  //
  //
  //
  //
  //
  it('should retrieve 2 conversations', async () => {
    // Tests
    expect(get_conversation(r_1_1.conv_id)).toMatchSnapshot()
    expect(get_conversation(r_2_1.conv_id)).toMatchSnapshot()
  })

  //
  //
  //
  //
  //
  //
  it('should score conversations', () => {
    score_conversation(
      {
        conv_id: 'id_1',
        scorer: 'customer',
        score: 1,
        comment: 'customer comment'
      },
      false
    )

    score_conversation(
      {
        conv_id: 'id_1',
        scorer: 'organization',
        score: 2,
        comment: 'organization comment'
      },
      false
    )

    score_conversation(
      {
        conv_id: 'id_1',
        scorer: 'pierre',
        score: 3,
        comment: 'pierre comment'
      },
      false
    )

    score_conversation(
      {
        conv_id: 'id_1',
        scorer: 'ai',
        score: 4,
        comment: 'ai comment'
      },
      false
    )

    expect(get_conversation('id_1')).toMatchSnapshot()

    score_conversation(
      {
        conv_id: 'id_2',
        scorer: 'ai',
        score: 5,
        comment: 'outstanding answer!'
      },
      false
    )

    expect(get_conversation('id_2')).toMatchSnapshot()
  })

  //
  //
  //
  //
  //
  //
  it('should delete a full conversation', async () => {
    delete_conversation(r_1_1.conv_id)
    expect(get_conversation(r_1_1.conv_id)).toStrictEqual([])
  })

  //
  //
  //
  //
  //
  //
  it('should retrieve all conversations', () => {
    expect(get_conversations()).toMatchSnapshot()
  })

  //
  //
  //
  //
  //
  //
  afterAll(() => setSystemTime())
}
