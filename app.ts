import { randomUUIDv7 } from 'bun'
import type { Serve } from 'bun'
import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { secureHeaders } from 'hono/secure-headers'

import { controller as get_admin } from './controllers/GET.admin'
import { controller as get_ai } from './controllers/GET.ai'
import { controller as get_conversations } from './controllers/GET.conversations'
import { controller as get_encyplopedia } from './controllers/GET.encyclopedia'
import { controller as get_index } from './controllers/GET.index'
import { controller as get_login } from './controllers/GET.login'
import { controller as get_statistics } from './controllers/GET.statistics'
import { controller as get_users } from './controllers/GET.users'
import { controller as post_conversation } from './controllers/POST.conversations'
import { controller as post_login } from './controllers/POST.login'
import { controller as post_telemetry } from './controllers/POST.telemetry'
import { controller as post_users } from './controllers/POST.users'
import { authenticate } from './utils/authenticate-user'

const app = new Hono()

// Configure the secure headers for the app
// This allows other websites to iframe PIERRE
// TODO: This should be modified to allow only a few trusted domains
app.use(
  secureHeaders({
    contentSecurityPolicy: { frameAncestors: ['*'] },
    crossOriginResourcePolicy: false
  })
)

// Serve static files from the assets directory
// Except for the config.ts file, which should return a 404 or redirect
app.get('/assets/:domain/config.ts', (c) => c.notFound())
app.use('/assets/*', serveStatic({ root: './' }))

// prettier-ignore
// biome-ignore format: readability
// biome-ignore lint: readability
{
  // AI generation routes
  app.get('/c/:id'            , authenticate, get_index)
  app.get('/ai/:id'                         , get_ai) // TODO: need to check for auth?
  app.post('/telemetry'                     , post_telemetry)
  app.post('/sms'                           , get_ai)
  
  // Admin routes
  app.get('/a'                , authenticate, get_admin)
  app.get('/a/users'          , authenticate, get_users)
  app.get('/a/statistics'     , authenticate, get_statistics)
  app.get('/a/encyclopedia'   , authenticate, get_encyplopedia)
  app.get('/a/conversations'  , authenticate, get_conversations)
  app.post('/a/conversations' , authenticate, post_conversation)
  app.post('/a/users'         , authenticate, post_users)
  app.get('/a/login'                        , get_login)
  app.post('/a/login'                       , post_login)
}

// Catch-all route that redirects to a new conversation with
// a randomly generated ID and optional query parameters
app.notFound(async (c) =>
  c.redirect(
    `/c/${randomUUIDv7()}?config=${c.req.query('config')}&context=${c.req.query('context')}`
  )
)

app.onError((_err, c) => c.notFound())

export default { idleTimeout: 240, fetch: app.fetch } satisfies Serve
