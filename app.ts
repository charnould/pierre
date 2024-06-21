import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import { secureHeaders } from 'hono/secure-headers'

import { v7 as uuid } from 'uuid' // time-sortable
import clients from './config/pierre'
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

app.notFound((c) => {
  const config_id = c.req.query('config') || 'default'
  const config = clients.config.find((c) => c.config === config_id)
  if (config !== undefined) return c.redirect(`/c/${uuid()}?config=${config.config}`)
  return c.redirect(`/c/${uuid()}?config=default`)
})

app.onError((err, c) => {
  console.log(err)
  return c.notFound()
})

export default app
