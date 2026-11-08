import { Hono } from 'hono'

import { receiveEmailWebhook } from './email'
import { receiveRcsWebhook } from './rcs'

export const webhooks = new Hono()

webhooks.post('/rcs', receiveRcsWebhook)
webhooks.post('/email', receiveEmailWebhook)
