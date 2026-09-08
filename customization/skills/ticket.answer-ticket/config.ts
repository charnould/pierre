import type { SkillConfig } from '../../../server/utils/_schema'

export default {
  id: 'ticket.answer-ticket',
  display: '',
  protected: true,
  community_knowledge: true,
  reasoning_effort: 'low',
  trace: 'expanded'
} satisfies SkillConfig
