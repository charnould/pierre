import { expect, test } from 'bun:test'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

import { ChatbotConfig } from '../../utils/_schema'
import { CUSTOMIZATION_DIR } from '../../utils/paths'

test('check if configs parse successfully', async () => {
  const directories = await readdir(join(CUSTOMIZATION_DIR, 'chatbots'))

  for (const directory of directories) {
    const path = join(CUSTOMIZATION_DIR, 'chatbots', directory, 'config.ts')
    if (!(await Bun.file(path).exists())) continue
    const config = (await import(`../../../customization/chatbots/${directory}/config`)).default
    const check = ChatbotConfig.safeParse(config)
    expect(check.success, directory).toBe(true)
  }
})
