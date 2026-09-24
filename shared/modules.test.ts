import { describe, expect, test } from 'bun:test'

import {
  BUSINESS_MODULE_IDS,
  businessModuleForActivityContext,
  businessModuleForSkillId,
  isBusinessModuleId
} from './modules'

describe('business module registry', () => {
  test('contains stable unique ids', () => {
    expect(new Set(BUSINESS_MODULE_IDS).size).toBe(BUSINESS_MODULE_IDS.length)
    expect(isBusinessModuleId('tickets')).toBe(true)
    expect(isBusinessModuleId('chat')).toBe(false)
  })

  test('maps transversal activity and workflow contexts', () => {
    expect(businessModuleForActivityContext('tickets')).toBe('tickets')
    expect(businessModuleForActivityContext('a_qualifier')).toBe('tickets')
    expect(businessModuleForSkillId('about')).toBe('about')
    expect(businessModuleForSkillId('report')).toBe('automations')
    expect(businessModuleForSkillId('replies')).toBe('automations')
    expect(businessModuleForSkillId('repayment')).toBe('automations')
    expect(businessModuleForSkillId('unknown')).toBeNull()
  })
})
