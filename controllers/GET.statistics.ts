import { table } from 'arquero'
import { SQL } from 'bun'
import type { Context } from 'hono'
import _ from 'lodash'
import { z } from 'zod'
import { view } from '../views/admin.statistics'

const sql = new SQL(`sqlite:datastores/${Bun.env.SERVICE}/datastore.sqlite`)

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
      const data = await get_data(options)
      return c.html(view(data, options))
    }

    // Case 2: User wants to download its data
    if (options.action === 'download') {
      c.header('Content-Disposition', 'attachment; filename=pierre-ia.org.csv')
      c.header('Content-Type', 'text/csv')
      const csv = await generate_csv()
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
 * Retrieves and processes telemetry statistics based on the specified time window.
 *
 * Queries the telemetry database for records newer than the calculated limit date,
 * groups them by conversation ID, and extracts the earliest record per group.
 * For each record, formats timestamps for different time windows, parses metadata,
 * and extracts evaluation scores and topics. Returns a JSON string of the processed results,
 * omitting sensitive fields.
 *
 * @param options - The options specifying the statistics window (e.g., 'last_1h', 'last_24h', 'last_30d', 'last_365d').
 * @returns A promise that resolves to a JSON string containing the processed statistics.
 */
export const get_data = async (options: StatisticOptions): Promise<string> => {
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

  const data = await sql`
    SELECT
      *
    FROM
      telemetry
    WHERE
      timestamp > ${limit_date}
    ORDER BY
      timestamp;
  `

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
 * Generates a CSV string containing telemetry statistics.
 *
 * This function queries the telemetry database for conversation data,
 * extracts relevant fields including scores and topics from the metadata,
 * and formats the results into a CSV string.
 *
 * @returns {Promise<string>} A promise that resolves to the generated CSV string.
 *
 */
export const generate_csv = async (): Promise<string> => {
  const data = await sql`
    SELECT
      *,
      json_extract (metadata, '$.evaluation.cus.score') AS cus_score,
      json_extract (metadata, '$.evaluation.org.score') AS org_score,
      json_extract (metadata, '$.evaluation.ai.score') AS ai_score,
      json_extract (metadata, '$.topics') AS topic
    FROM
      telemetry;
  `

  // prettier-ignore
  const result = {
		conversation: _.map(data, "conv_id"),
		horodatage: _.map(data, "timestamp"),
		role: _.map(data, "role"),
		configuration: _.map(data, "config"),
		thematique: _.map(data, "topic"),
		score_utilisateur: _.map(data, "cus_score"),
		score_organisme: _.map(data, "org_score"),
		score_ia: _.map(data, "ai_score"),
		message: _.map(data, "content"),
	};

  return table(result).toCSV()
}
