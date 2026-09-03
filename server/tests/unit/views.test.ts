import { expect, test } from 'bun:test'

import type { Reply } from '../../utils/_schema'
import { view as conversations_view } from '../../views/admin.conversations'

test('admin conversations render Markdown with Bun', () => {
  const conversation = {
    content: '**important**',
    metadata: {
      evaluation: {
        organization: { comment: null, score: null }
      }
    }
  } as unknown as Reply

  expect(String(conversations_view([], [conversation]))).toContain('<strong>important</strong>')
})
