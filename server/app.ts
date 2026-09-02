import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'

import desktop_config from '../customization/desktop'
import { controller as get_admin_login } from './controllers/admin/auth/get.login'
import { controller as post_admin_login } from './controllers/admin/auth/post.login'
import { controller as get_admin_conversations } from './controllers/admin/conversations/get'
import { controller as post_admin_conversations } from './controllers/admin/conversations/post'
import { controller as get_admin_dashboard } from './controllers/admin/get.dashboard'
import { controller as get_admin_knowledge } from './controllers/admin/knowledge/get'
import { controller as post_admin_knowledge } from './controllers/admin/knowledge/post'
import { controller as get_admin_statistics } from './controllers/admin/statistics/get'
import { controller as get_admin_users } from './controllers/admin/users/get'
import { controller as post_admin_users } from './controllers/admin/users/post'
import { controller as get_ai } from './controllers/ai/get'
import { controller as get_ai_boot } from './controllers/ai/get.boot'
import { controller as get_ai_skills } from './controllers/ai/get.skills'
import { controller as post_ai_answer } from './controllers/ai/post.answer'
import { controller as post_ai_vm_release } from './controllers/ai/post.vm.release'
import { controller as get_index } from './controllers/chat/get'
import { controller as post_courrier } from './controllers/courrier/post'
import { controller as post_courrier_webhook } from './controllers/courrier/post.webhook'
import { controller as delete_desktop_activity } from './controllers/desktop/activities/delete'
import { controller as get_desktop_activities } from './controllers/desktop/activities/get'
import { controller as get_desktop_activity_feed_sync } from './controllers/desktop/activities/get.feed-sync'
import { controller as patch_desktop_activity } from './controllers/desktop/activities/patch'
import { controller as post_desktop_activity } from './controllers/desktop/activities/post'
import { controller as delete_desktop_automation } from './controllers/desktop/automations/delete'
import { controller as delete_desktop_automation_pin } from './controllers/desktop/automations/delete.pin'
import { controller as get_desktop_automations } from './controllers/desktop/automations/get'
import { controller as patch_desktop_automation } from './controllers/desktop/automations/patch'
import { controller as post_desktop_automation } from './controllers/desktop/automations/post'
import { controller as post_desktop_automation_pin } from './controllers/desktop/automations/post.pin'
import { controller as post_desktop_automation_run } from './controllers/desktop/automations/post.run'
import { controller as get_desktop_tickets } from './controllers/desktop/tickets/get'
import { controller as get_desktop_tickets_facets } from './controllers/desktop/tickets/get.facets'
import { controller as put_desktop_tickets } from './controllers/desktop/tickets/put'
import { controller as post_email } from './controllers/email/post'
import { controller as post_email_webhook } from './controllers/email/post.webhook'
import { controller as get_embed } from './controllers/embed/get'
import { controller as post_lrar } from './controllers/lrar/post'
import { controller as post_lrar_webhook } from './controllers/lrar/post.webhook'
import { controller as post_lre } from './controllers/lre/post'
import { controller as post_lre_webhook } from './controllers/lre/post.webhook'
import { controller as post_mailto } from './controllers/mailto/post'
import { controller as post_rcs } from './controllers/rcs/post'
import { controller as post_rcs_webhook } from './controllers/rcs/post.webhook'
import { controller as post_signature } from './controllers/signature/post'
import { controller as post_signature_webhook } from './controllers/signature/post.webhook'
import { controller as post_sms } from './controllers/sms/post'
import { controller as post_sms_webhook } from './controllers/sms/post.webhook'
import { controller as post_telemetry } from './controllers/telemetry/post'
// import { topicize, score } from "./utils/analyze-conversation";
import { authenticate } from './utils/authenticate-user'
import { authorize_mutation } from './utils/authorize-role'
import { run_due_automations } from './utils/automations/run'
import { refresh_stale_sms_contacts_for_service } from './utils/contacts'
import { run_pipeline } from './utils/knowledge/run-pipeline'
import { CUSTOMIZATION_STATIC_ROOT, SERVER_ROOT } from './utils/paths'
import { setup } from './utils/setup'
import { initVmPool } from './utils/vm-pool'
import { cleanupOrphanedVms } from './utils/vm-registry'

// Prepare the environment and database before starting the app:
// 1. Create necessary directories for the current service
// 2. Initialize SQLite databases
// 3. Run the knowledge pipeline (initial build on startup)
// 4. Clean up any orphaned VMs that may be running from previous sessions
await setup()
await run_pipeline()
await cleanupOrphanedVms()
await initVmPool()

const app = new Hono()

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
  refresh_stale_sms_contacts_for_service()
  // Update knowledge database with custom content
  await run_pipeline()
  // Score conversation and assign topic with AI
  // await topicize();
  // await score();
})

// Automations due-poll every minute
Bun.cron('* * * * *', async () => {
  await run_due_automations()
})

// Block server-side-only files from being served over HTTP
app.get('/customization/:path{.+}/config.ts', (c) => c.notFound())
app.get('/customization/:path{.+}/AGENTS.md', (c) => c.notFound())

// Serve desktop config.ts as plain JSON
app.get('/customization/desktop/config.json', (c) => c.json(desktop_config))

// Serve PIERRE assets (with CORS for cross-origin embedding) and customization files
app.use('/assets/*', cors())
app.use('/assets/*', serveStatic({ root: SERVER_ROOT }))
app.use('/customization/*', serveStatic({ root: CUSTOMIZATION_STATIC_ROOT }))

// AI generation routes
app.get('/c', authenticate, get_index)
app.get('/ai', authenticate, get_ai)
app.get('/ai/boot', authenticate, get_ai_boot)
app.get('/ai/skills', authenticate, get_ai_skills)
app.get('/desktop/activities', authenticate, get_desktop_activities)
app.get('/desktop/activity-feed/sync', authenticate, get_desktop_activity_feed_sync)
app.post('/desktop/activities', authenticate, authorize_mutation, post_desktop_activity)
app.patch('/desktop/activities/:id', authenticate, authorize_mutation, patch_desktop_activity)
app.delete('/desktop/activities/:id', authenticate, authorize_mutation, delete_desktop_activity)
app.get('/desktop/automations', authenticate, get_desktop_automations)
app.post('/desktop/automations', authenticate, authorize_mutation, post_desktop_automation)
app.patch('/desktop/automations/:id', authenticate, authorize_mutation, patch_desktop_automation)
app.delete('/desktop/automations/:id', authenticate, authorize_mutation, delete_desktop_automation)
app.post(
  '/desktop/automations/:id/run',
  authenticate,
  authorize_mutation,
  post_desktop_automation_run
)
app.post(
  '/desktop/automations/:id/pin',
  authenticate,
  authorize_mutation,
  post_desktop_automation_pin
)
app.delete(
  '/desktop/automations/:id/pin',
  authenticate,
  authorize_mutation,
  delete_desktop_automation_pin
)
app.get('/desktop/tickets/facets', authenticate, get_desktop_tickets_facets)
app.put('/desktop/tickets', authenticate, authorize_mutation, put_desktop_tickets)
app.get('/desktop/tickets', authenticate, get_desktop_tickets)
app.post('/rcs', authenticate, authorize_mutation, post_rcs)
app.post('/sms', authenticate, authorize_mutation, post_sms)
app.post('/email', authenticate, authorize_mutation, post_email)
app.post('/mailto', authenticate, authorize_mutation, post_mailto)
app.post('/courrier', authenticate, authorize_mutation, post_courrier)
app.post('/lrar', authenticate, authorize_mutation, post_lrar)
app.post('/lre', authenticate, authorize_mutation, post_lre)
app.post('/signature', authenticate, authorize_mutation, post_signature)
app.post('/webhook/rcs', post_rcs_webhook)
app.post('/webhook/sms', post_sms_webhook)
app.post('/webhook/email', post_email_webhook)
app.post('/webhook/courrier', post_courrier_webhook)
app.post('/webhook/lrar', post_lrar_webhook)
app.post('/webhook/lre', post_lre_webhook)
app.post('/webhook/signature', post_signature_webhook)
app.post('/ai/answer', authenticate, post_ai_answer)
app.post('/ai/vm/release', authenticate, post_ai_vm_release)

// Admin routes
app.get('/a/login', get_admin_login)
app.get('/a', authenticate, get_admin_dashboard)
app.get('/a/users', authenticate, get_admin_users)
app.get('/a/knowledge', authenticate, get_admin_knowledge)
app.get('/a/statistics', authenticate, get_admin_statistics)
app.get('/a/conversations', authenticate, get_admin_conversations)

app.post('/a/login', post_admin_login)
app.post('/a/users', authenticate, post_admin_users)
app.post('/a/knowledge', authenticate, post_admin_knowledge)
app.post('/a/conversations', authenticate, post_admin_conversations)

// Health check route for Kamal proxy + Telemetry endpoint
app.get('/up', (c) => c.text('ok'))
app.post('/telemetry', post_telemetry)

// PIERRE embed shell (modal isolated from host page CSS/DOM)
app.get('/embed', get_embed)

// Catch-all route that redirects to a new conversation
app.notFound(async (c) => {
  if (c.req.path.startsWith('/assets/')) return c.text('Not Found', 404)

  return c.redirect(
    `/c?config=${c.req.query('config')}&data=${c.req.query('data')}${c.req.query('compact') !== undefined ? '&compact' : ''}`
  )
})

// Handle errors by returning a 404 response
app.onError((_err, c) => c.notFound())

// Export the app configuration
export default { idleTimeout: 240, fetch: app.fetch }
