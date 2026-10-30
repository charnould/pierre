import type { Context } from 'hono'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { serveStatic } from 'hono/bun'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { secureHeaders } from 'hono/secure-headers'

import { account } from './routes/account'
import { activities } from './routes/activities'
import { admin } from './routes/admin'
import { automations } from './routes/automations'
import { bulk } from './routes/bulk'
import { classifyCarl } from './routes/carl'
import { chat } from './routes/chat'
import { communications } from './routes/communications'
import { datastore } from './routes/datastore'
import { knowledge } from './routes/knowledge'
import { ledger } from './routes/ledger'
import { publicRoutes } from './routes/public'
import { repayment } from './routes/repayment'
import { setup } from './routes/setup'
import { postTelemetry } from './routes/telemetry'
import { tickets } from './routes/tickets'
import { webhooks } from './routes/webhooks'
import { workflows } from './routes/workflows'
import { getAuth } from './utils/auth'
import { SERVER_ROOT } from './utils/paths'
import { name, readSetupBytes } from './utils/setup-store'
import { emptyPage } from './views/empty'

const wantsDocument = (c: Context) =>
  c.req.header('sec-fetch-dest') === 'document' ||
  (c.req.header('accept') ?? '').includes('text/html')

const jsonError = (c: Context, status: 404 | 500, code: 'not_found' | 'internal_error') =>
  c.json(
    {
      error: {
        code,
        message: status === 404 ? 'Not found' : 'Internal Server Error'
      }
    },
    status
  )

export const handleError = (err: Error, c: Context) => {
  if (err instanceof HTTPException) return err.getResponse()
  console.error(err)
  if (c.req.path.startsWith('/assets/') || wantsDocument(c)) {
    return c.text('Internal Server Error', 500)
  }
  return jsonError(c, 500, 'internal_error')
}

const smallJsonLimit = bodyLimit({
  maxSize: 64 * 1024,
  onError: (c) =>
    c.json({ error: { code: 'body_too_large', message: 'Request body is too large' } }, 413)
})

export const createApp = () => {
  const app = new Hono()

  app.use(
    secureHeaders({
      crossOriginResourcePolicy: false,
      contentSecurityPolicy: {
        frameAncestors: ["'self'", 'http://localhost:*', '*']
      }
    })
  )

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
  app.get('/branding/manifest.webmanifest', (c) =>
    c.json({
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
  )

  app.all('/auth/admin/*', (c) => c.notFound())
  app.all('/auth/*', (c) => getAuth().handler(c.req.raw))

  app.route('/', publicRoutes)
  app.route('/', account)
  app.route('/activities', activities)
  app.route('/automations', automations)
  app.route('/bulk', bulk)
  app.route('/tickets', tickets)
  app.route('/ledger', ledger)
  app.route('/repayment', repayment)
  app.route('/datastore', datastore)
  app.route('/setup', setup)
  app.route('/admin', admin)
  app.route('/knowledge', knowledge)
  app.route('/communications', communications)
  app.route('/webhooks', webhooks)
  app.route('/chat', chat)
  app.route('/workflows', workflows)
  app.post('/telemetry', smallJsonLimit, postTelemetry)
  app.use(
    '/carl',
    cors({ origin: '*', allowMethods: ['POST', 'OPTIONS'], allowHeaders: ['Content-Type'] })
  )
  app.post('/carl', smallJsonLimit, classifyCarl)
  app.get('/up', (c) => c.text('ok'))

  app.notFound((c) => {
    if (c.req.path.startsWith('/assets/')) return c.text('Not Found', 404)
    if (wantsDocument(c)) return c.html(emptyPage(), 404)
    return jsonError(c, 404, 'not_found')
  })
  app.onError(handleError)

  return app
}
