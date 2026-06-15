/**
 * Sends a webhook request with retries and exponential backoff.
 *
 * @param {Object} params - The parameters for sending the webhook.
 * @param {string} params.webhook - The URL of the webhook endpoint.
 * @param {string} params.key - The API key to include in the request headers.
 * @param {object} params.data - The payload to send in the webhook request.
 * @param {number} params.max_retries - The maximum number of retry attempts.
 * @param {number} params.delay - The initial delay between retries in milliseconds.
 * @returns {Promise<unknown>} - A promise that resolves with the response data if the webhook is sent successfully.
 * @throws {Error} - Throws an error if the maximum number of retries is reached without a successful response.
 * @todo - Add tests. Only tested manually with https://bin.webhookrelay.com/
 */
export const send_webhook = async ({
  webhook,
  key,
  data,
  max_retries,
  delay
}: {
  webhook: string
  key: string
  data: object
  max_retries: number
  delay: number
}): Promise<unknown> => {
  let attempt = 0

  while (attempt <= max_retries) {
    try {
      const response = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': key },
        body: JSON.stringify(data)
      })

      if (response.ok) {
        console.log('Webhook sent successfully')
        return await response.json()
      }
      throw new Error(`HTTP ${response.status}: ${await response.text()}`)
    } catch (error) {
      attempt++
      console.error(`Attempt ${attempt} failed for ${webhook}: ${error.message}`)

      if (attempt > max_retries) {
        console.error('Max retries reached. Webhook failed.')
        throw error
      }

      // Exponential backoff
      const wait_time = delay * 2 ** (attempt - 1)
      console.log(`Retrying in ${wait_time}ms...`)
      await Bun.sleep(wait_time)
    }
  }
}
