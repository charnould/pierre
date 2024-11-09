import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { secureHeaders } from 'hono/secure-headers'

import { randomUUIDv7 } from 'bun'
import { controller as get_ai } from './controllers/GET.ai'
import { controller as get_chats } from './controllers/GET.chats'
import { controller as get_index } from './controllers/GET.index'
import { controller as post_login } from './controllers/POST.login'
import { controller as post_review } from './controllers/POST.review'
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

// Define the routes for the application
app.get('/c/:id', get_index)
app.get('/ai/:id', get_ai)
app.post('/sms', get_ai)
app.post('/telemetry', post_telemetry)

// Provide an /eval route with authentication
app.get('/eval', (c) => c.redirect('/eval/chats'))
app.get('/eval/chats', authenticate, get_chats)
app.post('/eval/chats', authenticate, post_review)
app.post('/eval/login', post_login)

// Catch-all route that redirects to a new conversation with
// a randomly generated ID and optional query parameters
app.notFound(async (c) =>
  c.redirect(
    `/c/${randomUUIDv7()}?config=${c.req.query('config')}&context=${c.req.query('context')}`
  )
)

app.onError((_err, c) => c.notFound())

export default app
