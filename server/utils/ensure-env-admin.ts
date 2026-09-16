import { existsSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

import { BUSINESS_MODULE_IDS } from '../../shared/modules'
import { createUser, getStoredUser } from './handle-user'
import { CUSTOMIZATION_DIR } from './paths'

export const ENV_ADMIN_EMAIL = 'admin@pierre-ia.org'

function readAuthPassword(): string {
  const password = Bun.env['AUTH_PASSWORD']
  if (!password) throw new Error('AUTH_PASSWORD is required')
  if (password.length < 8 || password.length > 128) {
    throw new Error('AUTH_PASSWORD must contain between 8 and 128 characters')
  }
  return password
}

async function listChatbotIds(): Promise<string[]> {
  return (await readdir(join(CUSTOMIZATION_DIR, 'chatbots')))
    .filter((entry) => existsSync(join(CUSTOMIZATION_DIR, 'chatbots', entry, 'config.ts')))
    .sort()
}

export async function ensureEnvAdmin(): Promise<void> {
  const existing = await getStoredUser(ENV_ADMIN_EMAIL)
  if (existing) return
  await createUser({
    email: ENV_ADMIN_EMAIL,
    password: readAuthPassword(),
    isAdministrator: true,
    moduleIds: BUSINESS_MODULE_IDS,
    chatbotIds: await listChatbotIds(),
    profileId: null
  })
}
