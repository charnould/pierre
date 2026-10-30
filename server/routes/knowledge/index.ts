import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'

import { authenticateAdministratorApi, type AuthEnv } from '../../utils/authenticate-user'
import { authorizeAdministrator } from '../../utils/authorize-role'
import {
  deleteKnowledgeSourceController,
  getKnowledge,
  getKnowledgeBuilds,
  MAX_KNOWLEDGE_UPLOAD_BYTES,
  patchKnowledgeSource,
  postKnowledgeBuild,
  postKnowledgeSources
} from './handlers'

export const knowledge = new Hono<AuthEnv>()

knowledge.use('*', authenticateAdministratorApi, authorizeAdministrator)
knowledge.get('/', getKnowledge)
knowledge.post(
  '/sources',
  bodyLimit({
    maxSize: MAX_KNOWLEDGE_UPLOAD_BYTES + 64 * 1024,
    onError: (c) =>
      c.json({ error: { code: 'file_too_large', message: 'Le fichier dépasse 100 Mo.' } }, 413)
  }),
  postKnowledgeSources
)
knowledge.patch('/sources/:id', patchKnowledgeSource)
knowledge.delete('/sources/:id', deleteKnowledgeSourceController)
knowledge.get('/builds', getKnowledgeBuilds)
knowledge.post('/builds', postKnowledgeBuild)
