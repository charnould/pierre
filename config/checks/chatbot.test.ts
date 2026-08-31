import { expect, test } from 'bun:test'
import { readdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import { Config } from '../../server/utils/_schema'

const CUSTOMIZATION_DIR = resolve(import.meta.dir, '../../customization')

test('chatbot configs parse successfully', async () => {
  const directories = await readdir(join(CUSTOMIZATION_DIR, 'chatbots'))

  for await (const directory of directories) {
    const config = (await import(`../../customization/chatbots/${directory}/config`)).default
    const check = Config.safeParse(config)

    if (check.error) {
      console.log(config)
      console.log(check.error)
      console.log(`❌ config.ts contient une ou des erreurs.`)
      console.log(`❌ Lire le message d'erreur ci-dessus.`)
    }

    expect(check.success).toBe(true)
  }
  console.log(`✅ chatbot config.ts est OK!`)
})
