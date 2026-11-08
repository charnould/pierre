import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'

import { authenticate, type AuthEnv } from '../../utils/authenticate-user'
import { authorizeAdministrator } from '../../utils/authorize-role'
import { deleteAdminChatbot, getAdminSetup, putAdminSetup } from '../setup/admin'
import { verifyRepaymentMessage } from '../setup/messages'
import { getConversation, listConversations, putConversationReview } from './conversations'
import { sendTestEmail } from './email-test'
import { getLlmUsage, getRun, listRuns } from './llm-runs'
import { getProviders, putProviders } from './providers'
import { createUser } from './users/create'
import { importUsers } from './users/import'
import { listUsers } from './users/list'
import { patchUser } from './users/patch'
import {
  patch as patchProfile,
  post as createProfile,
  remove as deleteProfile
} from './users/profiles'
import { deleteUser } from './users/remove'

export const admin = new Hono<AuthEnv>()

admin.use('*', authenticate, authorizeAdministrator)
admin.get('/providers', getProviders)
admin.put('/providers', putProviders)
admin.post('/providers/email/test', sendTestEmail)
admin.get('/setup', getAdminSetup)
admin.post('/setup/repayment/messages/verify', verifyRepaymentMessage)
admin.delete('/setup/chatbots/:id', deleteAdminChatbot)
admin.put('/setup/:path{.+}', putAdminSetup)
admin.get('/conversations', listConversations)
admin.get('/conversations/:convId', getConversation)
admin.put('/conversations/:convId/review', putConversationReview)
admin.get('/llm-usage', getLlmUsage)
admin.get('/llm-runs', listRuns)
admin.get('/llm-runs/:id', getRun)
admin.get('/users', listUsers)
admin.post('/users', createUser)
admin.post(
  '/users/import',
  bodyLimit({
    maxSize: 1024 * 1024 + 64 * 1024,
    onError: (c) =>
      c.json({ error: { code: 'invalid_file', message: 'Le fichier CSV dépasse 1 Mo.' } }, 413)
  }),
  importUsers
)
admin.post('/users/profiles', createProfile)
admin.patch('/users/profiles/:id', patchProfile)
admin.delete('/users/profiles/:id', deleteProfile)
admin.patch('/users/:email', patchUser)
admin.delete('/users/:email', deleteUser)
