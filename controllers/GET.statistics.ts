import { table } from 'arquero'
import type { Context } from 'hono'
import _ from 'lodash'
import { z } from 'zod'
import { db } from '../utils/database'
import { view } from '../views/statistics'

/**
 * Controller function to handle GET requests for statistics.
 *
 * This function parses query parameters from the request context,
 * retrieves statistical data based on the parsed options, and
 * returns an HTML response with the data and options.
 *
 * @param {Context} c - The request context containing query parameters.
 */
export const controller = async (c: Context) => {
  try {
    // Parse query parameters
    const options = StatisticOptions.parse({
      window: c.req.query('window'),
      color: c.req.query('color'),
      facet: c.req.query('facet'),
      action: c.req.query('action')
    })

    // Case 1: User wants to visualize data in Pierre
    if (options.action === 'visualize') {
      const data = get_data(options)
      return c.html(view(data, options))
    }

    // Case 2: User wants to download its data
    if (options.action === 'download') {
      c.header('Content-Disposition', 'attachment; filename=pierre-ia.org.csv')
      c.header('Content-Type', 'text/csv')
      const csv = generate_csv()
      return c.text(csv)
    }
  } catch (e) {
    console.log(e)
    throw new Error('Error on statistics webpage', e)
  }
}

/**
 * Schema for validating statistic options.
 *
 * @property {string} window - The time window for the statistics.
 *                             Must be one of 'last_1h', 'last_24h', 'last_30d', 'last_365d'.
 *                             Defaults to 'last_30d' if not provided.
 *
 * @property {string} color - The color scheme for the statistics.
 *                            Must be one of 'user_score', 'org_score', 'profile', 'topic', 'user'.
 *                            Defaults to 'ai_score' if not provided.
 *
 * @property {string | null} facet - The facet for the statistics.
 *                                   Must be one of 'user_score', 'org_score', 'profile', 'topic', 'user'.
 *                                   Can be null. Defaults to null if not provided.
 *
 * @property {string} action - The action to be performed with the statistics.
 *                             Must be one of 'visualize', 'download'.
 *                             Defaults to 'visualize' if not provided.
 */
const StatisticOptions = z.object({
  window: z.enum(['last_1h', 'last_24h', 'last_30d', 'last_365d']).catch('last_30d'),
  color: z
    .enum(['user', 'user_score', 'org_score', 'ai_score', 'config', 'topic'])
    .catch('ai_score'),
  facet: z
    .enum(['user', 'user_score', 'org_score', 'ai_score', 'config', 'topic'])
    .nullable()
    .catch(null),
  action: z.enum(['visualize', 'download']).catch('visualize')
})

export type StatisticOptions = z.infer<typeof StatisticOptions>

/**
 * Retrieves statistical data based on the provided options.
 *
 * @param {StatisticOptions} options - The options to configure the data retrieval.
 * @returns {string} - A JSON string representing the processed statistical data.
 *
 * The function performs the following steps:
 * 1. Defines the minimum date to query based on the provided time window.
 * 2. Queries the database for telemetry data with timestamps greater than the defined limit date.
 * 3. Groups the data by `conv_id` and selects the earliest timestamp for each group.
 * 4. Processes each item to extract and format relevant information, including:
 *    - `last_1h`: Time in HH:MM format.
 *    - `last_24h`: Hour in HH format.
 *    - `last_30d`: Date in YYYY-MM-DD format.
 *    - `last_365d`: Year and month in YYYY-MM format.
 *    - `user_score`: Customer evaluation score or 'Non noté' if null.
 *    - `org_score`: Organization evaluation score or 'Non noté' if null.
 *    - `ia_score`: PIERRE own evaluation score or 'Non noté' if null.
 *    - `topic`: PIERRE own topic evaluation.
 *    - `user`: who the user is.
 * 5. Omits certain fields from the final result.
 * 6. Returns the processed result as a JSON string.
 */
export const get_data = (options: StatisticOptions): string => {
  // Define min date to query
  const now = new Date()
  const limit_date = (
    options.window === 'last_1h'
      ? new Date(now.getTime() - 60 * 60 * 1000)
      : options.window === 'last_24h'
        ? new Date(now.getTime() - 24 * 60 * 60 * 1000)
        : options.window === 'last_30d'
          ? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          : new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
  ).toISOString()

  const data = db('datastore')
    .prepare('SELECT * FROM telemetry WHERE timestamp > $limit ORDER BY timestamp ;')
    .all({ $limit: limit_date })

  const result = _.chain(data)
    .groupBy('conv_id')
    .mapValues((group) => _.minBy(group, 'timestamp'))
    .map((item) => {
      const timestamp = new Date(item.timestamp)
      const last_1h = timestamp.toISOString().slice(11, 16)
      const last_24h = `${timestamp.toISOString().slice(11, 13)}h`
      const last_30d = timestamp.toISOString().slice(0, 10)
      const last_365d = timestamp.toISOString().slice(0, 7)

      const metadata = JSON.parse(item.metadata)

      const topic = metadata.topics

      const user = metadata.user

      const user_score =
        metadata.evaluation.customer?.score === null
          ? 'Non noté'
          : String(metadata.evaluation.customer?.score)

      const org_score =
        metadata.evaluation.organization?.score === null
          ? 'Non noté'
          : String(metadata.evaluation.organization?.score)

      const ai_score =
        metadata.evaluation.ai?.score === null ? 'Non noté' : String(metadata.evaluation.ai?.score)
      return _.omit(
        {
          ...item,
          last_1h,
          last_24h,
          last_30d,
          last_365d,
          user,
          user_score,
          org_score,
          ai_score,
          topic
        },
        ['metadata', 'content', 'role', 'timestamp']
      )
    })
    .toArray()
    .value()

  return JSON.stringify(result)
}

/**
 * Generates a CSV file from the data retrieved from the 'datastore' database.
 *
 * The function performs the following steps:
 * 1. Executes a SQL query to select all columns from the 'telemetry' table,
 *    along with extracting 'cus_score' and 'org_score' from the 'metadata' JSON field.
 * 2. Maps the retrieved data to a result object containing arrays of specific fields.
 * 3. Converts the result object to a CSV format and returns it.
 *
 * @returns {string} The generated CSV content as a string.
 */
export const generate_csv = () => {
  const data = db('datastore')
    .prepare(
      `
      SELECT
        *,
        json_extract(metadata, '$.evaluation.cus.score') AS cus_score,
        json_extract(metadata, '$.evaluation.org.score') AS org_score,
        json_extract(metadata, '$.evaluation.ai.score') AS ai_score,
        json_extract(metadata, '$.topics') AS topic
      FROM telemetry;
      `
    )
    .all()

  // prettier-ignore
  const result = {
      conversation      : _.map(data, 'conv_id'),
      horodatage        : _.map(data, 'timestamp'),
      role              : _.map(data, 'role'),
      configuration     : _.map(data, 'config'),
      thematique        : _.map(data, 'topic'),
      score_utilisateur : _.map(data, 'cus_score'),
      score_organisme   : _.map(data, 'org_score'),
      score_ia          : _.map(data, 'ai_score'),
      message           : _.map(data, 'content')
    }

  return table(result).toCSV()
}
