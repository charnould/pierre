import { Hono } from 'hono'
import { basicAuth } from 'hono/basic-auth'
import { serveStatic } from 'hono/bun'
import { HTTPException } from 'hono/http-exception'
import { secureHeaders } from 'hono/secure-headers'

import { controller as get_ai } from './controllers/GET.ai'
import { controller as get_index } from './controllers/GET.index'
import { controller as get_review } from './controllers/GET.review'
import { controller as post_review } from './controllers/POST.review'

const app = new Hono()

// To allow other websites to iframe Pierre
// Must be modified to allow only a few domains
app.use(
  secureHeaders({
    contentSecurityPolicy: { frameAncestors: ['*'] },
    crossOriginResourcePolicy: false
  })
)

app.use('/assets/*', serveStatic({ root: './' }))

app.get('/ai/:id', get_ai)
app.get('/c/:id', get_index)
app.post('/review', post_review)
app.get(
  '/review',
  basicAuth({
    username: Bun.env.USERNAME as string,
    password: Bun.env.PASSWORD as string
  }),
  get_review
)

app.notFound(async (c) => {
  const baseurl = `/c/${crypto.randomUUID()}?config=`
  try {
    await import(`./assets/${c.req.query('config')}/config`)
    return c.redirect(baseurl + c.req.query('config'))
  } catch {
    return c.redirect(`${baseurl}_default`)
  }
})

app.onError((err, c) => {
  if (err instanceof HTTPException) return err.getResponse()
  console.log(err)
  return c.notFound()
})

export default app
