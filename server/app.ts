import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { serveStatic } from 'hono/bun'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'

import { controller as get_ai_boot } from './controllers/ai/get.boot'
import { controller as post_ai } from './controllers/ai/post'
import { controller as post_ai_answer } from './controllers/ai/post.answer'
import {
  controller as post_ai_ui_response,
  MAX_UI_RESPONSE_BODY_BYTES
} from './controllers/ai/post.ui-response'
import { controller as post_ai_vm_release } from './controllers/ai/post.vm.release'
import {
  deleteKnowledgeSourceController,
  downloadKnowledgeSource,
  getKnowledge,
  getKnowledgeBuilds,
  MAX_KNOWLEDGE_UPLOAD_BYTES,
  patchKnowledgeSource,
  postKnowledgeBuild,
  postKnowledgeSources
} from './controllers/api/admin/knowledge'
import { controller as get_index } from './controllers/chat/get'
import { controller as post_courrier } from './controllers/courrier/post'
import { controller as post_courrier_webhook } from './controllers/courrier/post.webhook'
import { controller as delete_desktop_activity } from './controllers/desktop/activities/delete'
import { controller as get_desktop_activities } from './controllers/desktop/activities/get'
import { controller as get_desktop_activity_feed_sync } from './controllers/desktop/activities/get.feed-sync'
import { controller as patch_desktop_activity } from './controllers/desktop/activities/patch'
import { controller as post_desktop_activity } from './controllers/desktop/activities/post'
import { controller as delete_desktop_admin_user } from './controllers/desktop/admin/users/delete'
import { controller as get_desktop_admin_users } from './controllers/desktop/admin/users/get'
import { controller as patch_desktop_admin_user } from './controllers/desktop/admin/users/patch'
import { controller as post_desktop_admin_user } from './controllers/desktop/admin/users/post'
import { controller as post_desktop_admin_users_import } from './controllers/desktop/admin/users/post.import'
import {
  patch as patch_desktop_admin_user_profile,
  post as post_desktop_admin_user_profile,
  remove as delete_desktop_admin_user_profile
} from './controllers/desktop/admin/users/user-profiles'
import { controller as delete_desktop_automation } from './controllers/desktop/automations/delete'
import { controller as delete_desktop_automation_pin } from './controllers/desktop/automations/delete.pin'
import { controller as get_desktop_automations } from './controllers/desktop/automations/get'
import { controller as patch_desktop_automation } from './controllers/desktop/automations/patch'
import { controller as post_desktop_automation } from './controllers/desktop/automations/post'
import { controller as post_desktop_automation_pin } from './controllers/desktop/automations/post.pin'
import { controller as post_desktop_automation_run } from './controllers/desktop/automations/post.run'
import { controller as get_desktop_avatars } from './controllers/desktop/avatars/get'
import { controller as delete_desktop_bulk_operation } from './controllers/desktop/bulk-operations/delete'
import { controller as get_desktop_bulk_operations } from './controllers/desktop/bulk-operations/get'
import { controller as get_desktop_bulk_operation } from './controllers/desktop/bulk-operations/get.one'
import { controller as get_desktop_bulk_operation_report } from './controllers/desktop/bulk-operations/get.report'
import { controller as get_desktop_bulk_operation_reports } from './controllers/desktop/bulk-operations/get.reports'
import { controller as patch_desktop_bulk_operation } from './controllers/desktop/bulk-operations/patch'
import { controller as post_desktop_bulk_operation } from './controllers/desktop/bulk-operations/post'
import { controller as post_desktop_bulk_operation_execute } from './controllers/desktop/bulk-operations/post.execute'
import { controller as post_desktop_bulk_operation_preview_message } from './controllers/desktop/bulk-operations/post.preview-message'
import { controller as post_desktop_bulk_operation_preview_query } from './controllers/desktop/bulk-operations/post.preview-query'
import { controller as get_desktop_datastore_tables } from './controllers/desktop/datastore/get.tables'
import { controller as get_desktop_ledger } from './controllers/desktop/ledger/get'
import { controller as get_desktop_ledger_facets } from './controllers/desktop/ledger/get.facets'
import { controller as post_desktop_me_avatar } from './controllers/desktop/me/avatar/post'
import { controller as get_desktop_me } from './controllers/desktop/me/get'
import { controller as patch_desktop_me_preferences } from './controllers/desktop/me/preferences/patch'
import { controller as get_desktop_repayment_timeline } from './controllers/desktop/repayment/get.timeline'
import {
  deleteAdminChatbot as delete_desktop_admin_chatbot,
  getAdminSetup as get_desktop_admin_setup,
  getSetupFile as get_desktop_setup_file,
  putAdminSetup as put_desktop_admin_setup
} from './controllers/desktop/setup/admin'
import { controller as get_desktop_setup } from './controllers/desktop/setup/get'
import { controller as get_desktop_tickets } from './controllers/desktop/tickets/get'
import { controller as get_desktop_tickets_facets } from './controllers/desktop/tickets/get.facets'
import { controller as put_desktop_tickets } from './controllers/desktop/tickets/put'
import { controller as get_desktop_users } from './controllers/desktop/users/get'
import { controller as post_email } from './controllers/email/post'
import { controller as post_email_webhook } from './controllers/email/post.webhook'
import { controller as get_embed } from './controllers/embed/get'
import { controller as post_external_communication } from './controllers/external-communication/post'
import { controller as post_lrar } from './controllers/lrar/post'
import { controller as post_lrar_webhook } from './controllers/lrar/post.webhook'
import { controller as post_lre } from './controllers/lre/post'
import { controller as post_lre_webhook } from './controllers/lre/post.webhook'
import { controller as carl } from './controllers/models/carl'
import { controller as post_rcs } from './controllers/rcs/post'
import { controller as post_rcs_webhook } from './controllers/rcs/post.webhook'
import { controller as post_signature } from './controllers/signature/post'
import { controller as post_signature_webhook } from './controllers/signature/post.webhook'
import { controller as post_sms } from './controllers/sms/post'
import { controller as post_telemetry } from './controllers/telemetry/post'
import { MAX_MULTIPART_REQUEST_BYTES } from './utils/ai-attachments'
import { getAuth } from './utils/auth'
import {
  authenticate,
  authenticateAdministratorApi,
  authenticateOptional
} from './utils/authenticate-user'
import { authorizeAdministrator, authorizeAnyModule, authorizeModule } from './utils/authorize-role'
import { run_due_automations } from './utils/automations/run'
import { AVATAR_MAX_UPLOAD_BYTES } from './utils/avatar-image'
import { start_bulk_scheduler } from './utils/bulk/scheduler/queue'
import { refresh_stale_sms_contacts } from './utils/contacts'
import { ensureEnvAdmin } from './utils/ensure-env-admin'
import { initializeKnowledgeBuildCoordinator } from './utils/knowledge/build-coordinator'
import { SERVER_ROOT } from './utils/paths'
import { setup } from './utils/setup'
import { name, readSetupBytes } from './utils/setup-store'
import { initVmPool } from './utils/vm-pool'
import { cleanupOrphanedVms } from './utils/vm-registry'
import { emptyPage } from './views/empty'

// Prepare the environment and database before starting the app:
// 1. Create necessary datastore directories
// 2. Initialize SQLite databases
// 3. Run the knowledge pipeline (initial build on startup)
// 4. Clean up any orphaned VMs that may be running from previous sessions
await setup()
await ensureEnvAdmin()
const auth = getAuth()
await start_bulk_scheduler()
await initializeKnowledgeBuildCoordinator()
await cleanupOrphanedVms()
await initVmPool()

const app = new Hono()
const authorizeTickets = authorizeModule('tickets')
const authorizeRepayment = authorizeModule('repayment')
const authorizeAutomations = authorizeModule('automations')
const authorizeBulk = authorizeModule('bulk')
const authorizeTicketsData = authorizeAnyModule('tickets', 'automations')
const authorizeLedgerData = authorizeAnyModule('repayment', 'bulk')
const avatarBodyLimit = bodyLimit({
  maxSize: AVATAR_MAX_UPLOAD_BYTES + 64 * 1024,
  onError: (c) =>
    c.json({ error: { code: 'avatar_too_large', message: 'Avatar upload is too large' } }, 413)
})
const adminCsvBodyLimit = bodyLimit({
  maxSize: 1024 * 1024 + 64 * 1024,
  onError: (c) =>
    c.json({ error: { code: 'invalid_file', message: 'Le fichier CSV dépasse 1 Mo.' } }, 413)
})
const knowledgeBodyLimit = bodyLimit({
  maxSize: MAX_KNOWLEDGE_UPLOAD_BYTES + 64 * 1024,
  onError: (c) =>
    c.json({ error: { code: 'file_too_large', message: 'Le fichier dépasse 100 Mo.' } }, 413)
})
const aiMultipartBodyLimit = bodyLimit({
  maxSize: MAX_MULTIPART_REQUEST_BYTES,
  onError: (c) =>
    c.json(
      { error: { code: 'attachments_too_large', message: 'Multipart request is too large' } },
      413
    )
})
const aiUiResponseBodyLimit = bodyLimit({
  maxSize: MAX_UI_RESPONSE_BODY_BYTES,
  onError: (c) =>
    c.json({ error: { code: 'ui_response_too_large', message: 'UI response is too large' } }, 413)
})

// Configure the secure headers for the app.
// This allows other websites to iframe PIERRE
app.use(
  secureHeaders({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: {
      // TODO: This should be modified to allow only a few trusted domains
      frameAncestors: ["'self'", 'http://localhost:*', '*']
    }
  })
)

// Cronjob
// Runs every day at 4:00 AM
Bun.cron('0 4 * * *', async () => {
  refresh_stale_sms_contacts()
})

// Automations due-poll every minute
Bun.cron('* * * * *', async () => {
  await run_due_automations()
})

// Serve PIERRE assets (with CORS for cross-origin embedding) and branding
app.use('/assets/*', cors())
app.use('/assets/*', serveStatic({ root: SERVER_ROOT }))
app.get('/branding/icons/:file', (c) => {
  const file = c.req.param('file')
  const id =
    file === 'icon.svg'
      ? 'chatbots/icons/icon.svg'
      : file === 'apple-touch-icon.png'
        ? 'chatbots/icons/apple-touch-icon.png'
        : file === 'icon-192.png'
          ? 'chatbots/icons/icon-192.png'
          : file === 'icon-512.png'
            ? 'chatbots/icons/icon-512.png'
            : null
  if (!id) return c.notFound()
  const bytes = readSetupBytes(id)
  if (!bytes) return c.notFound()
  const copy = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(copy).set(bytes)
  const type = file.endsWith('.svg') ? 'image/svg+xml' : 'image/png'
  return new Response(new Blob([copy]), { headers: { 'content-type': type } })
})
app.get('/branding/manifest.webmanifest', (c) => {
  return c.json({
    short_name: name(),
    name: name(),
    id: '/',
    start_url: '/',
    display: 'standalone',
    icons: [
      { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: 'icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }
    ]
  })
})

// Better Auth owns the /auth namespace. Its admin API remains server-only.
app.all('/auth/admin/*', (c) => c.notFound())
app.all('/auth/*', (c) => auth.handler(c.req.raw))

// Public chatbot and AI generation routes
app.get('/', get_index)
app.post('/ai', aiMultipartBodyLimit, authenticateOptional, post_ai)
app.get('/ai/boot', authenticate, get_ai_boot)
app.get('/desktop/activities', authenticate, get_desktop_activities)
app.get('/desktop/activity-feed/sync', authenticate, get_desktop_activity_feed_sync)
app.post('/desktop/activities', authenticate, post_desktop_activity)
app.patch('/desktop/activities/:id', authenticate, patch_desktop_activity)
app.delete('/desktop/activities/:id', authenticate, delete_desktop_activity)
app.get('/desktop/automations', authenticate, authorizeAutomations, get_desktop_automations)
app.post('/desktop/automations', authenticate, authorizeAutomations, post_desktop_automation)
app.patch('/desktop/automations/:id', authenticate, authorizeAutomations, patch_desktop_automation)
app.delete(
  '/desktop/automations/:id',
  authenticate,
  authorizeAutomations,
  delete_desktop_automation
)
app.post(
  '/desktop/automations/:id/run',
  authenticate,
  authorizeAutomations,
  post_desktop_automation_run
)
app.post(
  '/desktop/automations/:id/pin',
  authenticate,
  authorizeAutomations,
  post_desktop_automation_pin
)
app.delete(
  '/desktop/automations/:id/pin',
  authenticate,
  authorizeAutomations,
  delete_desktop_automation_pin
)
app.post(
  '/desktop/bulk-operations/preview-query',
  authenticate,
  authorizeBulk,
  post_desktop_bulk_operation_preview_query
)
app.post(
  '/desktop/bulk-operations/preview-message',
  authenticate,
  authorizeBulk,
  post_desktop_bulk_operation_preview_message
)
app.get('/desktop/bulk-operations', authenticate, authorizeBulk, get_desktop_bulk_operations)
app.post('/desktop/bulk-operations', authenticate, authorizeBulk, post_desktop_bulk_operation)
app.get(
  '/desktop/bulk-operations/:id/reports/:executionId',
  authenticate,
  authorizeBulk,
  get_desktop_bulk_operation_report
)
app.get(
  '/desktop/bulk-operations/:id/reports',
  authenticate,
  authorizeBulk,
  get_desktop_bulk_operation_reports
)
app.get('/desktop/bulk-operations/:id', authenticate, authorizeBulk, get_desktop_bulk_operation)
app.patch('/desktop/bulk-operations/:id', authenticate, authorizeBulk, patch_desktop_bulk_operation)
app.delete(
  '/desktop/bulk-operations/:id',
  authenticate,
  authorizeBulk,
  delete_desktop_bulk_operation
)
app.post(
  '/desktop/bulk-operations/:id/execute',
  authenticate,
  authorizeBulk,
  authorizeAdministrator,
  post_desktop_bulk_operation_execute
)
app.get('/desktop/tickets/facets', authenticate, authorizeTickets, get_desktop_tickets_facets)
app.put('/desktop/tickets', authenticate, authorizeTickets, put_desktop_tickets)
app.get('/desktop/tickets/meta', authenticate, authorizeTicketsData, get_desktop_tickets)
app.get('/desktop/tickets', authenticate, authorizeTickets, get_desktop_tickets)
app.get('/desktop/ledger/facets', authenticate, authorizeRepayment, get_desktop_ledger_facets)
app.get('/desktop/ledger/meta', authenticate, authorizeLedgerData, get_desktop_ledger)
app.get('/desktop/ledger', authenticate, authorizeRepayment, get_desktop_ledger)
app.get(
  '/desktop/repayment/timeline',
  authenticate,
  authorizeRepayment,
  get_desktop_repayment_timeline
)
app.get('/desktop/datastore/tables', authenticate, get_desktop_datastore_tables)
app.get('/desktop/users', authenticate, get_desktop_users)
app.get('/desktop/me', authenticate, get_desktop_me)
app.get('/desktop/setup', authenticate, get_desktop_setup)
app.get('/desktop/setup/*', authenticate, get_desktop_setup_file)
app.get('/desktop/admin/setup', authenticate, authorizeAdministrator, get_desktop_admin_setup)
app.put('/desktop/admin/setup/*', authenticate, authorizeAdministrator, put_desktop_admin_setup)
app.delete(
  '/desktop/admin/setup/chatbots/:id',
  authenticate,
  authorizeAdministrator,
  delete_desktop_admin_chatbot
)
app.get('/desktop/admin/users', authenticate, authorizeAdministrator, get_desktop_admin_users)
app.post('/desktop/admin/users', authenticate, authorizeAdministrator, post_desktop_admin_user)
app.post(
  '/desktop/admin/users/profiles',
  authenticate,
  authorizeAdministrator,
  post_desktop_admin_user_profile
)
app.patch(
  '/desktop/admin/users/profiles/:id',
  authenticate,
  authorizeAdministrator,
  patch_desktop_admin_user_profile
)
app.delete(
  '/desktop/admin/users/profiles/:id',
  authenticate,
  authorizeAdministrator,
  delete_desktop_admin_user_profile
)
app.patch(
  '/desktop/admin/users/:email',
  authenticate,
  authorizeAdministrator,
  patch_desktop_admin_user
)
app.delete(
  '/desktop/admin/users/:email',
  authenticate,
  authorizeAdministrator,
  delete_desktop_admin_user
)
app.post(
  '/desktop/admin/users/import',
  authenticate,
  authorizeAdministrator,
  adminCsvBodyLimit,
  post_desktop_admin_users_import
)
app.get('/api/admin/knowledge', authenticateAdministratorApi, authorizeAdministrator, getKnowledge)
app.post(
  '/api/admin/knowledge/sources',
  knowledgeBodyLimit,
  authenticateAdministratorApi,
  authorizeAdministrator,
  postKnowledgeSources
)
app.patch(
  '/api/admin/knowledge/sources/:id',
  authenticateAdministratorApi,
  authorizeAdministrator,
  patchKnowledgeSource
)
app.delete(
  '/api/admin/knowledge/sources/:id',
  authenticateAdministratorApi,
  authorizeAdministrator,
  deleteKnowledgeSourceController
)
app.get(
  '/api/admin/knowledge/sources/:id/download',
  authenticateAdministratorApi,
  authorizeAdministrator,
  downloadKnowledgeSource
)
app.get(
  '/api/admin/knowledge/builds',
  authenticateAdministratorApi,
  authorizeAdministrator,
  getKnowledgeBuilds
)
app.post(
  '/api/admin/knowledge/builds',
  authenticateAdministratorApi,
  authorizeAdministrator,
  postKnowledgeBuild
)
app.patch('/desktop/me/preferences', authenticate, patch_desktop_me_preferences)
app.post('/desktop/me/avatar', authenticate, avatarBodyLimit, post_desktop_me_avatar)
app.get('/desktop/avatars/:email', authenticate, get_desktop_avatars)
app.post('/rcs', authenticate, post_rcs)
app.post('/sms', authenticate, post_sms)
app.post('/email', authenticate, post_email)
app.post('/communications/external', authenticate, post_external_communication)
app.post('/courrier', authenticate, post_courrier)
app.post('/lrar', authenticate, post_lrar)
app.post('/lre', authenticate, post_lre)
app.post('/signature', authenticate, post_signature)
app.post('/webhook/rcs', post_rcs_webhook)
app.post('/webhook/email', post_email_webhook)
app.post('/webhook/courrier', post_courrier_webhook)
app.post('/webhook/lrar', post_lrar_webhook)
app.post('/webhook/lre', post_lre_webhook)
app.post('/webhook/signature', post_signature_webhook)
app.post('/ai/answer', aiMultipartBodyLimit, authenticateOptional, post_ai_answer)
app.post('/ai/ui-response', aiUiResponseBodyLimit, post_ai_ui_response)
app.post('/ai/vm/release', authenticateOptional, post_ai_vm_release)

// Caddy calls /up. Telemetry is posted by the desktop app.
app.get('/up', (c) => c.text('ok'))
app.post('/telemetry', post_telemetry)

// PIERRE embed shell (modal isolated from host page CSS/DOM)
app.get('/embed', get_embed)
app.use(
  '/api/models/carl',
  cors({ origin: '*', allowMethods: ['POST', 'OPTIONS'], allowHeaders: ['Content-Type'] })
)
app.post('/api/models/carl', carl)

// Catch-all 404 except static assets and communication JSON
app.notFound(async (c) => {
  if (c.req.path.startsWith('/assets/')) return c.text('Not Found', 404)
  if (c.req.path.startsWith('/communications/')) {
    return c.json(
      {
        error: {
          code: 'not_found',
          message: 'Communication endpoint not found'
        }
      },
      404
    )
  }

  return c.html(emptyPage(), 404)
})

// Handle errors by returning a 404 response
app.onError((_err, c) => c.notFound())

// Export the app configuration
export default { idleTimeout: 240, fetch: app.fetch }
