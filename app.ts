import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { secureHeaders } from 'hono/secure-headers'

import { controller as get_admin } from './controllers/GET.admin'
import { controller as get_ai } from './controllers/GET.ai'
import { controller as get_conversations } from './controllers/GET.conversations'
import { controller as get_index } from './controllers/GET.index'
import { controller as get_knowledge } from './controllers/GET.knowledge'
import { controller as get_login } from './controllers/GET.login'
import { controller as get_statistics } from './controllers/GET.statistics'
import { controller as get_users } from './controllers/GET.users'
import { controller as post_conversation } from './controllers/POST.conversations'
import { controller as post_knowledge } from './controllers/POST.knowledge'
import { controller as post_login } from './controllers/POST.login'
import { controller as post_users } from './controllers/POST.users'
// import { topicize, score } from "./utils/analyze-conversation";
import { authenticate } from './utils/authenticate-user'
import { run_pipeline } from './utils/knowledge/run-pipeline'
import { setup } from './utils/setup'

// Prepare the environment and database before starting the app:
// 1. Create necessary directories for the current service
// 2. Initialize SQLite databases
await setup()

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

// Serve static files from the assets directory
// Except for the config.ts file, which should return a 404 or redirect
app.get('/assets/:domain/config.ts', (c) => c.notFound())
app.use('/assets/*', serveStatic({ root: './' }))

// AI generation routes
app.get('/c', authenticate, get_index)
app.get('/ai', authenticate, get_ai)

// Admin routes
app.get('/a/login', get_login)
app.get('/a', authenticate, get_admin)
app.get('/a/users', authenticate, get_users)
app.get('/a/knowledge', authenticate, get_knowledge)
app.get('/a/statistics', authenticate, get_statistics)
app.get('/a/conversations', authenticate, get_conversations)

app.post('/a/login', post_login)
app.post('/a/users', authenticate, post_users)
app.post('/a/knowledge', authenticate, post_knowledge)
app.post('/a/conversations', authenticate, post_conversation)

// Catch-all route that redirects to a new conversation
app.notFound(async (c) =>
  c.redirect(`/c?config=${c.req.query('config')}&data=${c.req.query('data')}`)
)

// Handle errors by returning a 404 response
app.onError((_err, c) => c.notFound())

// Export the app configuration
export default { idleTimeout: 240, fetch: app.fetch }
