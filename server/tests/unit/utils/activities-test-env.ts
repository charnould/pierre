import { Database } from 'bun:sqlite'
import { afterAll, afterEach, beforeAll, beforeEach } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'

import { user_destinataire } from '../../../utils/activities/rows'
import { datastorePaths, setDatastoreRoot, testDatastorePaths } from '../../../utils/paths'
import { setup } from '../../../utils/setup'
import { createTestUser } from '../../test-user'

const TEST_PATHS = testDatastorePaths('activites')
export const DATASTORE_PATH = TEST_PATHS.database

export const ALICE = 'alice@exemple.fr'
export const BOB = 'bob@exemple.fr'
export const CLAIRE = 'claire@exemple.fr'
export const JEAN = 'jean.dupont@exemple.fr'
export const ADMIN = 'admin@exemple.fr'
export const CDUBOIS = 'cdubois@example.org'

export const user = (email: string) => user_destinataire(email)

export const mention = (email: string, motif?: 'mention' | 'assignation') => ({
  destinataire: user(email),
  ...(motif ? { motif } : {})
})

export const seed_users = async (...emails: string[]): Promise<void> => {
  for (const email of emails) {
    await createTestUser({
      email,
      isAdministrator: false,
      moduleIds: [],
      chatbotIds: []
    })
  }
}

export const insert_repayment_activity = (
  type:
    | 'case.group_changed'
    | 'case.bucket_changed'
    | 'case.assignee_changed'
    | 'case.tags_changed'
    | 'task.created',
  id_locataire: string,
  date_creation: string,
  contenu: Record<string, unknown>
) => {
  const db = new Database(datastorePaths().database)
  const action = type === 'task.created'
  db.run(
    `INSERT INTO activites (
       date_creation, rattachement, auteur, id_locataire, type, mentions, contenu,
       thread_id, revision
     ) VALUES (?, ?, ?, ?, ?, '[]', ?, ?, ?)`,
    [
      date_creation,
      `repayment:${id_locataire}`,
      user(ALICE),
      id_locataire,
      type,
      JSON.stringify(contenu),
      action ? Bun.randomUUIDv7() : null,
      action ? 1 : null
    ]
  )
  db.close()
}

export function use_activities_test_env(label = 'activites') {
  const paths = testDatastorePaths(label)
  beforeAll(() => {
    setDatastoreRoot(paths.root)
  })

  afterAll(async () => {
    setDatastoreRoot(null)
    await rm(paths.root, { recursive: true, force: true })
  })

  beforeEach(async () => {
    await rm(paths.root, { recursive: true, force: true })
    await mkdir(paths.root, { recursive: true })
    await setup()
  })

  afterEach(async () => {
    await rm(paths.root, { recursive: true, force: true })
  })

  return paths
}
