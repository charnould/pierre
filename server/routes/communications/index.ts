import { Hono } from 'hono'

import { authenticate, type AuthEnv } from '../../utils/authenticate-user'
import { postEmail } from './email'
import { postExternal } from './external'
import { fake_communication_controller } from './fake'
import { postRcs } from './rcs'

export const communications = new Hono<AuthEnv>()

communications.post('/rcs', authenticate, postRcs)
communications.post('/email', authenticate, postEmail)
communications.post('/courrier', authenticate, fake_communication_controller('courrier'))
communications.post('/lrar', authenticate, fake_communication_controller('lrar'))
communications.post('/lre', authenticate, fake_communication_controller('lre'))
communications.post('/external', authenticate, postExternal)
