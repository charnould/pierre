import { expect, test } from 'bun:test'
import { readdir } from 'node:fs/promises'
import { Config } from '../../utils/_schema'

test('check if configs parse successfully', async () => {
  const directories = (await readdir('assets')).filter((name) => name !== 'core')

  // Check official `config.ts` for each organization
  for await (const directory of directories) {
    const config = (await import(`../../assets/${directory}/config`)).default
    const check = Config.safeParse(config)

    if (check.error) {
      console.log(config)
      console.log(check.error)
      console.log(`❌ config.ts contient une ou des erreurs.`)
      console.log(`❌ Lire le message d'erreur ci-dessus.`)
    }

    expect(check.success).toBe(true)
  }
  console.log(`✅ config.ts est OK!`)
})
