import { expect, test } from 'bun:test'
import { readdir } from 'node:fs/promises'
import { Config } from '../../utils/_schema'

test('check if configs parse successfully', async () => {
  const directories = await readdir('./assets')

  for await (const directory of directories) {
    const config = (await import(`../../assets/${directory}/config`)).default
    const check = Config.safeParse(config)
    expect(check.success).toBe(true)
  }
})
