import { Hono } from 'hono'

import { authenticate, type AuthEnv } from '../../utils/authenticate-user'
import { getSetupFile } from './admin'
import { getSetup } from './get'

export const setup = new Hono<AuthEnv>()

setup.use('*', authenticate)
setup.get('/', getSetup)
setup.get('/:path{.+}', getSetupFile)
