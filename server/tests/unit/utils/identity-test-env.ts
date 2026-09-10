import { afterAll, beforeAll, beforeEach } from 'bun:test'
import { rm } from 'node:fs/promises'

import { deleteAllUsers } from '../../../utils/handle-user'
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
    await deleteAllUsers()
  })

  afterAll(async () => {
    await deleteAllUsers()
    if (originalService === undefined) delete Bun.env['SERVICE']
    else Bun.env['SERVICE'] = originalService
  })
}
