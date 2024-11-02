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
import { authenticate } from './utils/authenticate-reviewer'

const app = new Hono()

// To allow other websites to iframe PIERRE.
// TODO: Must be modified to allow only a few domains?
app.use(
  secureHeaders({
    contentSecurityPolicy: { frameAncestors: ['*'] },
    crossOriginResourcePolicy: false
  })
)

// Static files
// Important: `./assets/:domain/config.ts` MUST return 404/redirect
// (indeed it might contain some user credentials).
// All others files in `assets/` is statically served.
app.get('/assets/:domain/config.ts', (c) => c.notFound())
app.use('/assets/*', serveStatic({ root: './' }))

// Routes
app.get('/c/:id', get_index)
app.get('/ai/:id', get_ai)
app.post('/sms', get_ai)
app.post('/telemetry', post_telemetry)

app.get('/eval', (c) => c.redirect('/eval/chats'))
app.get('/eval/chats', authenticate, get_chats)
app.post('/eval/chats', authenticate, post_review)
app.post('/eval/login', post_login)

// Catch-all + Not found
app.notFound(async (c) =>
  c.redirect(
    `/c/${randomUUIDv7()}?config=${c.req.query('config')}&scenario=${c.req.query('scenario')}`
  )
)

// Error
app.onError((_err, c) => c.notFound())

export default app
