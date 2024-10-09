import { readdir } from 'node:fs/promises'
import { SMS } from './_schema'

export const parse_incoming_sms = async (data) => {
  // Read all directories in `./assets`
  // and for each get `config.ts`
  const directories = await readdir('./assets')

  const configs = await Promise.all(
    directories.map(async (directory) => {
      const config = await import(`../assets/${directory}/config`)
      return config.default
    })
  )

  // For each `config.ts`, find the right one (= contains the right Whatsapp phone number)
  // and build a simple and useful object
  for (const config of configs) {
    if (config && config.phone === data.to.number) {
      return SMS.parse({
        role: 'user',
        config: config.id,
        // `+` breaks conv_id when used in an URL
        conv_id: `sms-with-${data.from.number.replace('+', '')}`,
        phone: data.to.number,
        to: data.from.number,
        content: data.message.text.trim()
      })
    }
  }

  return null
}
