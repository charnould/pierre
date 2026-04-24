import type { Config } from '../../utils/_schema'

export default {
  id: 'skill_answer',
  display: 'Répondre à une question',
  show: [],
  custom_data: {},
  api: [],
  protected: true,
  knowledge: {
    community: true,
    proprietary: true
  },
  greeting: [],
  examples: [],
  disclaimer: ''
} as Config
