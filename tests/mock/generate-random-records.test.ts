import { it } from 'bun:test'
import { format } from 'date-fns'
import { db } from '../../utils/database'

/**
 * Test case that loads dummy/random records into the `datastore` to test the
 * `performance` page.
 *
 * This test generates 2500 dummy/random records with random data and inserts
 * them into the `telemetry` table in the `datastore` database.
 *
 */
it('should load random records in datastore to test performance page', () => {
  const getRandomValue = (val) => val[Math.floor(Math.random() * val.length)]

  for (let index = 0; index < 2500; index++) {
    //
    const start = new Date(2024, 0, 1)
    const end = new Date()
    const random_date = new Date(
      start.getTime() + Math.random() * (end.getTime() - start.getTime())
    )

    db('datastore')
      .prepare(
        'INSERT OR IGNORE INTO telemetry (conv_id, config, role, content, timestamp, metadata) VALUES (?, ?, ?, ?, ?, ?)'
      )
      .run(
        Bun.randomUUIDv7(),
        'dummy',
        'dummy',
        'dummy',
        format(random_date, "yyyy-MM-dd'T'HH:mm:ssXXX"),
        JSON.stringify({
          topics: null,
          origin: null,
          evaluation: {
            customer: { score: getRandomValue([null, 0, 1, 2, 3]), comment: null },
            organization: { score: getRandomValue([0, 1, 2]), comment: null },
            ai: { score: null, comment: null },
            pierre: { score: null, comment: null }
          },
          tokens: { prompt: null, completion: null, total: null }
        })
      )
  }
})
