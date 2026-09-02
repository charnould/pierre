import { Database } from 'bun:sqlite'
import { afterAll, afterEach, beforeAll, beforeEach } from 'bun:test'
import { mkdir, rm } from 'node:fs/promises'

import { user_destinataire } from '../../../utils/activities/rows'
import { datastorePaths } from '../../../utils/paths'
import { setup } from '../../../utils/setup'

const TEST_SERVICE = '_test_activites_svc'
const ORIGINAL_SERVICE = Bun.env['SERVICE']
const TEST_PATHS = datastorePaths(TEST_SERVICE)
const DATASTORE_ROOT = TEST_PATHS.root
export const DATASTORE_PATH = TEST_PATHS.database

export const ALICE = 'alice@exemple.fr'
export const BOB = 'bob@exemple.fr'
export const CLAIRE = 'claire@exemple.fr'
export const JEAN = 'jean.dupont@exemple.fr'
export const CAROL = 'carol@exemple.fr'
export const ADMIN = 'admin@exemple.fr'
export const CDUBOIS = 'cdubois@example.org'

export const user = (email: string) => user_destinataire(email)

export const mention = (email: string, lu = false, boost: string | null = null) => ({
  destinataire: user(email),
  lu,
  boost
})

export const seed_users = (...emails: string[]) => {
  const db = new Database(DATASTORE_PATH)
  for (const email of emails) {
    db.run(
      `INSERT OR IGNORE INTO users (config, email, role, password_hash) VALUES ('{}', ?, 'user', 'x')`,
      [email]
    )
  }
  db.close()
}

export const insert_repayment_activity = (
  type: 'repayment_phase_change' | 'repayment_assignment' | 'repayment_tag_change' | 'action',
  id_locataire: string,
  date_creation: string,
  contenu: Record<string, unknown>
) => {
  const db = new Database(DATASTORE_PATH)
  const action = type === 'action'
  const event =
    contenu['etat'] === 'fait' ? 'completed' : contenu['etat'] === 'ignore' ? 'ignored' : 'created'
  const state = action && typeof contenu['etat'] === 'string' ? contenu['etat'] : null
  const storedContent = action
    ? { ...contenu, cree_par: user(ALICE), cree_le: date_creation }
    : contenu
  db.run(
    `INSERT INTO activites (
       date_creation, rattachement, auteur, id_locataire, type, statut, mentions, contenu,
       thread_id, event, state, revision
     ) VALUES (?, ?, ?, ?, ?, 'logged', '[]', ?, ?, ?, ?, ?)`,
    [
      date_creation,
      `repayment:${id_locataire}`,
      user(ALICE),
      id_locataire,
      type,
      JSON.stringify(storedContent),
      action ? crypto.randomUUID() : null,
      action ? event : null,
      state,
      action ? 1 : null
    ]
  )
  db.close()
}

export function use_activities_test_env() {
  beforeAll(() => {
    Bun.env['SERVICE'] = TEST_SERVICE
  })

  afterAll(async () => {
    if (ORIGINAL_SERVICE === undefined) delete Bun.env['SERVICE']
    else Bun.env['SERVICE'] = ORIGINAL_SERVICE
    await rm(DATASTORE_ROOT, { recursive: true, force: true })
  })

  beforeEach(async () => {
    await mkdir(DATASTORE_ROOT, { recursive: true })
    await setup()
  })

  afterEach(async () => {
    await rm(DATASTORE_ROOT, { recursive: true, force: true })
  })
}
