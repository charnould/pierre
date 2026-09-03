import { describe, expect, it } from 'bun:test'

import {
  assertCanonicalSkillId,
  assertMatchingSkillConfig,
  SkillRequestError
} from '../../../utils/skill-config'
import {
  getConversationUploadsMountPath,
  getConversationUploadsPath,
  getUploadsPath
} from '../../../utils/smolvm'

const CONV_ID = '0198f1a0-7b6c-7000-8000-000000000001'

describe('skill config request boundary', () => {
  it.each(['ticket.answer-ticket', 'automation.report', 'skill-2'])(
    'accepts canonical skill ID %s',
    (skillId) => {
      expect(assertCanonicalSkillId(skillId)).toBe(skillId)
    }
  )

  it.each(['', '..', '../answer', 'answer/child', '/answer', 'Answer', 'answer..child'])(
    'rejects non-canonical skill ID %s',
    (skillId) => {
      expect(() => assertCanonicalSkillId(skillId)).toThrow(SkillRequestError)
    }
  )

  it('rejects a config whose declared ID does not match its directory ID', () => {
    expect(() =>
      assertMatchingSkillConfig('ticket.answer-ticket', { id: 'ticket.summarize-ticket' })
    ).toThrow(
      expect.objectContaining({
        code: 'skill_not_found',
        status: 404
      })
    )
  })

  it('keeps stable uploads contained under the configured service root', () => {
    const previousService = Bun.env['SERVICE']
    Bun.env['SERVICE'] = '_skill_path_test'
    try {
      expect(getUploadsPath('ticket.answer-ticket')).toEndWith(
        '/datastores/_skill_path_test/uploads/ticket.answer-ticket'
      )
      expect(getConversationUploadsPath('ticket.answer-ticket', CONV_ID)).toEndWith(
        `/datastores/_skill_path_test/uploads/ticket.answer-ticket/${CONV_ID}`
      )
      expect(getConversationUploadsMountPath(CONV_ID)).toBe(`/knowledge/_uploads/${CONV_ID}`)
      expect(() => getUploadsPath('../escape')).toThrow('Resolved path escapes its root')
      expect(() => getConversationUploadsPath('ticket.answer-ticket', '../escape')).toThrow(
        'conv_id must be a canonical UUID'
      )
    } finally {
      if (previousService === undefined) delete Bun.env['SERVICE']
      else Bun.env['SERVICE'] = previousService
    }
  })
})
