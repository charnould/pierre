import { it } from 'bun:test'
import { SQL } from 'bun'
import { format } from 'date-fns'

const sql = new SQL(`sqlite:datastores/${Bun.env.SERVICE}/datastore.sqlite`)

/**
 * Test case that loads dummy/random records into the `datastore` to test the
 * `statistics` page.
 *
 * This test generates 2500 dummy/random records with random data and inserts
 * them into the `telemetry` table in the `datastore` database.
 *
 */
it('should load random records in datastore to test statistics page', async () => {
  const getRandomValue = (val) => val[Math.floor(Math.random() * val.length)]

  for (let index = 0; index < 2500; index++) {
    //
    const start = new Date(2024, 0, 1)
    const end = new Date()
    const random_date = new Date(
      start.getTime() + Math.random() * (end.getTime() - start.getTime())
    )

    await sql`
      INSERT
      OR IGNORE INTO telemetry ${sql({
        conv_id: Bun.randomUUIDv7(),
        config: getRandomValue(['locataire', 'demandeur_hlm', 'demandeur_emploi', 'collaborateur']),
        role: 'dummy',
        content: 'dummy',
        timestamp: format(random_date, "yyyy-MM-dd'T'HH:mm:ssXXX"),
        metadata: JSON.stringify({
          topics: null,
          origin: null,
          evaluation: {
            customer: {
              score: getRandomValue([null, 0, 1, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]),
              comment: null
            },
            organization: {
              score: getRandomValue([null, 0, 1, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]),
              comment: null
            },
            ai: { score: null, comment: null },
            pierre: { score: null, comment: null }
          },
          tokens: { prompt: null, completion: null, total: null }
        })
      })}
    `
  }
})
