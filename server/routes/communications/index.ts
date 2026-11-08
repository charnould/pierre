import { Hono } from 'hono'

import { authenticate, type AuthEnv } from '../../utils/authenticate-user'
import { postEmail } from './email'
import { postExternal } from './external'
import { postMaileva } from './maileva'
import { postRcs } from './rcs'

export const communications = new Hono<AuthEnv>()

communications.post('/rcs', authenticate, postRcs)
communications.post('/email', authenticate, postEmail)
communications.post('/courrier', authenticate, postMaileva('courrier'))
communications.post('/lrar', authenticate, postMaileva('lrar'))
communications.post('/lre', authenticate, postMaileva('lre'))
communications.post('/ere', authenticate, postMaileva('ere'))
communications.post('/external', authenticate, postExternal)
