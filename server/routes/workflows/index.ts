import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'

import { MAX_MULTIPART_REQUEST_BYTES } from '../../utils/ai-attachments'
import { authenticate, type AuthEnv } from '../../utils/authenticate-user'
import { generateWorkflow } from './generate'

export const workflows = new Hono<AuthEnv>()

workflows.post(
  '/',
  bodyLimit({
    maxSize: MAX_MULTIPART_REQUEST_BYTES,
    onError: (c) =>
      c.json(
        { error: { code: 'attachments_too_large', message: 'Multipart request is too large' } },
        413
      )
  }),
  authenticate,
  generateWorkflow
)
