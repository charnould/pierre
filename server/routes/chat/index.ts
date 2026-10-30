import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'

import { MAX_MULTIPART_REQUEST_BYTES } from '../../utils/ai-attachments'
import {
  type AppEnv,
  authenticate,
  authenticateOptional,
  type AuthEnv
} from '../../utils/authenticate-user'
import { getChatConfig } from './config'
import { postChat } from './post'
import { releaseChatSession } from './release'
import { MAX_UI_RESPONSE_BODY_BYTES, postChatResponse } from './responses'

export const chat = new Hono<AppEnv>()
const protectedChat = new Hono<AuthEnv>()

chat.post(
  '/',
  bodyLimit({
    maxSize: MAX_MULTIPART_REQUEST_BYTES,
    onError: (c) =>
      c.json(
        { error: { code: 'attachments_too_large', message: 'Multipart request is too large' } },
        413
      )
  }),
  authenticateOptional,
  postChat
)
protectedChat.get('/config', authenticate, getChatConfig)
chat.post(
  '/responses',
  bodyLimit({
    maxSize: MAX_UI_RESPONSE_BODY_BYTES,
    onError: (c) =>
      c.json({ error: { code: 'ui_response_too_large', message: 'UI response is too large' } }, 413)
  }),
  postChatResponse
)
protectedChat.delete('/sessions/:conversationId', authenticate, releaseChatSession)
chat.route('/', protectedChat)
