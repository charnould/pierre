import { expect, test } from 'bun:test'
import { readdir } from 'node:fs/promises'
import { Config } from '../utils/_schema'

test('check if configs parse successfully', async () => {
  const directories = await readdir('./assets')

  // Check official `config.ts` for each organization
  // (These files are git-ignored.)
  for await (const directory of directories) {
    // This test will fail in GitHub Actions because `config.ts` is not
    // committed. Therefore, it should NOT run in GitHub Actions.
    if (Bun.env.GITHUB_ACTIONS === undefined) {
      const config = (await import(`../assets/${directory}/config`)).default
      const check = Config.safeParse(config)
      expect(check.success).toBe(true)
    }
  }

  // Check `config.example.ts` in `pierre-ia.org` folder
  // (This file is committed.)
  const config = (await import('../assets/pierre-ia.org/config.example')).default
  const check = Config.safeParse(config)
  expect(check.success).toBe(true)
})
