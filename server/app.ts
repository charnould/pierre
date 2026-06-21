import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'

import desktop_config from '../customization/desktop/config.ts'
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
import { controller as get_desktop_tickets } from './controllers/desktop/tickets/get'
import { controller as get_desktop_tickets_drafts } from './controllers/desktop/tickets/get.draft'
import { controller as get_desktop_tickets_facets } from './controllers/desktop/tickets/get.facets'
import { controller as put_desktop_tickets } from './controllers/desktop/tickets/put'
import { controller as put_desktop_tickets_drafts } from './controllers/desktop/tickets/put.draft'
import { controller as post_telemetry } from './controllers/telemetry/post'
// import { topicize, score } from "./utils/analyze-conversation";
import { authenticate } from './utils/authenticate-user'
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
  // Update knowledge database with custom content
  await run_pipeline()
  // Score conversation and assign topic with AI
  // await topicize();
  // await score();
})

// Block server-side-only files from being served over HTTP
app.get('/customization/:path{.+}/config.ts', (c) => c.notFound())
app.get('/customization/:path{.+}/AGENTS.md', (c) => c.notFound())

// Serve desktop config.ts as plain JSON
app.get('/customization/desktop/config.json', (c) => c.json(desktop_config))

// Serve widget assets (with CORS for cross-origin embedding) and customization files
app.use('/assets/*', cors())
app.use('/assets/*', serveStatic({ root: SERVER_ROOT }))
app.use('/customization/*', serveStatic({ root: CUSTOMIZATION_STATIC_ROOT }))

// AI generation routes
app.get('/c', authenticate, get_index)
app.get('/ai', authenticate, get_ai)
app.get('/ai/boot', authenticate, get_ai_boot)
app.get('/ai/skills', authenticate, get_ai_skills)
app.get('/desktop/tickets/facets', authenticate, get_desktop_tickets_facets)
app.get('/desktop/tickets/drafts', authenticate, get_desktop_tickets_drafts)
app.put('/desktop/tickets/drafts', authenticate, put_desktop_tickets_drafts)
app.put('/desktop/tickets', authenticate, put_desktop_tickets)
app.get('/desktop/tickets', authenticate, get_desktop_tickets)
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

// Catch-all route that redirects to a new conversation
app.notFound(async (c) =>
  c.redirect(
    `/c?config=${c.req.query('config')}&data=${c.req.query('data')}${c.req.query('compact') !== undefined ? '&compact' : ''}`
  )
)

// Handle errors by returning a 404 response
app.onError((_err, c) => c.notFound())

// Export the app configuration
export default { idleTimeout: 240, fetch: app.fetch }
