import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { secureHeaders } from 'hono/secure-headers'

import { controller as get_ai } from './controllers/GET.ai'
import { controller as get_index } from './controllers/GET.index'
import { controller as post_telemetry } from './controllers/POST.telemetry'

const app = new Hono()

// To allow other websites to iframe Pierre
// Must be modified to allow only a few domains
app.use(secureHeaders({ contentSecurityPolicy: { frameAncestors: ['*'] } }))

app.use('/assets/*', serveStatic({ root: './' }))

app.get('/ai/:id', get_ai)
app.get('/c/:id', get_index)
app.post('/c/:id/telemetry', post_telemetry)

app.notFound(async (c) => {
  try {
    await import(`./assets/${c.req.query('config')}/config`)
    return c.redirect(`/c/${crypto.randomUUID()}?config=${c.req.query('config')}`)
  } catch {
    return c.redirect(`/c/${crypto.randomUUID()}?config=_default`)
  }
})

app.onError((_err, c) => c.notFound())

export default app
