import { afterAll, beforeAll, beforeEach } from 'bun:test'
import { rm } from 'node:fs/promises'

import { deleteAllUsers } from '../../../utils/handle-user'
import { setDatastoreRoot, testDatastoreRoot } from '../../../utils/paths'
import { setup } from '../../../utils/setup'

export const use_identity_test_env = (label: string): void => {
  const root = testDatastoreRoot(label)

  beforeAll(async () => {
    setDatastoreRoot(root)
    await rm(root, { recursive: true, force: true })
    await setup()
  })

  beforeEach(async () => {
    await deleteAllUsers()
  })

  afterAll(async () => {
    await deleteAllUsers()
    await rm(root, { recursive: true, force: true })
    setDatastoreRoot(null)
  })
}
