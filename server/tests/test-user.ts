import { Database } from 'bun:sqlite'

import type { User } from '../utils/_schema'
import { createUser, getStoredUser } from '../utils/handle-user'
import { datastorePaths } from '../utils/paths'

export const DEFAULT_TEST_PASSWORD = 'test-password-123'

export async function createTestUser(user: User, password = DEFAULT_TEST_PASSWORD): Promise<void> {
  const existing = await getStoredUser(user.email)
  if (existing) {
    using db = new Database(datastorePaths().database)
    const remove = db.transaction(() => {
      db.run('DELETE FROM session WHERE userId = ?', [existing.id])
      db.run('DELETE FROM account WHERE userId = ?', [existing.id])
      db.run('DELETE FROM users WHERE id = ?', [existing.id])
    })
    remove.immediate()
  }
  if (!(await createUser({ ...user, password }))) throw new Error(`Could not create ${user.email}`)
}
