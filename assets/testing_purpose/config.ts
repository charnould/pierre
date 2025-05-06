import type { Config } from '../../utils/_schema'

export default {
  id: 'testing_purpose',
  display: 'Test',
  show: ['default', 'demo_client', 'demo_team'],
  custom_data: {},
  api: [],
  models: {
    augment_with: "groq('llama-3.3-70b-versatile')",
    rerank_with: "openai('gpt-4o-mini-2024-07-18')",
    answer_with: "openai('gpt-4.1-mini')"
  },
  phone: null,
  protected: true,
  knowledge: {
    community: true,
    proprietary: { public: true, private: true }
  },
  audience: '',
  persona: '',
  greeting: [],
  examples: [],
  disclaimer: null
} as Config
