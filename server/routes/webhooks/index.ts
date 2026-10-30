import { Hono } from 'hono'

import { fake_webhook_controller } from '../communications/fake'
import { receiveEmailWebhook } from './email'
import { receiveRcsWebhook } from './rcs'

export const receiveCourrierWebhook = fake_webhook_controller('courrier')

export const webhooks = new Hono()

webhooks.post('/rcs', receiveRcsWebhook)
webhooks.post('/email', receiveEmailWebhook)
webhooks.post('/courrier', receiveCourrierWebhook)
webhooks.post('/lrar', fake_webhook_controller('lrar'))
webhooks.post('/lre', fake_webhook_controller('lre'))
