import { afterAll, beforeAll, beforeEach } from 'bun:test'
import { rm } from 'node:fs/promises'

import { delete_all_users } from '../../../utils/handle-user'
import { datastorePaths } from '../../../utils/paths'
import { setup } from '../../../utils/setup'

export const use_identity_test_env = (service: string): void => {
  const originalService = Bun.env['SERVICE']
  const root = datastorePaths(service).root

  beforeAll(async () => {
    Bun.env['SERVICE'] = service
    await rm(root, { recursive: true, force: true })
    await setup()
  })

  beforeEach(async () => {
    await delete_all_users()
  })

  afterAll(async () => {
    await delete_all_users()
    if (originalService === undefined) delete Bun.env['SERVICE']
    else Bun.env['SERVICE'] = originalService
  })
}
