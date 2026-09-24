import { describe, expect, it } from 'bun:test'

import { setDatastoreRoot, testDatastorePaths } from '../../../utils/paths'
import { assertCanonicalSkillId, SkillRequestError } from '../../../utils/skill-config'
import {
  getConversationUploadsMountPath,
  getConversationUploadsPath,
  getUploadsPath
} from '../../../utils/smolvm'

const CONV_ID = '0198f1a0-7b6c-7000-8000-000000000001'

describe('skill config request boundary', () => {
  it.each(['about', 'report', 'replies', 'repayment'])(
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

  it('keeps stable uploads contained under the datastore root', () => {
    const paths = testDatastorePaths('skill_path')
    setDatastoreRoot(paths.root)
    try {
      expect(getUploadsPath('ticket.answer-ticket')).toBe(
        `${paths.root}/uploads/ticket.answer-ticket`
      )
      expect(getConversationUploadsPath('ticket.answer-ticket', CONV_ID)).toBe(
        `${paths.root}/uploads/ticket.answer-ticket/${CONV_ID}`
      )
      expect(getConversationUploadsMountPath(CONV_ID)).toBe(`/knowledge/_uploads/${CONV_ID}`)
      expect(() => getUploadsPath('../escape')).toThrow('Resolved path escapes its root')
      expect(() => getConversationUploadsPath('ticket.answer-ticket', '../escape')).toThrow(
        'conv_id must be a canonical UUID'
      )
    } finally {
      setDatastoreRoot(null)
    }
  })
})
