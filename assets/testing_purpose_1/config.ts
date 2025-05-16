import type { Config } from '../../utils/_schema'

export default {
  id: 'testing_purpose_1',
  display: 'Test 1',
  show: [
    'demo_client',
    'demo_team',
    'default',
    'testing_purpose_1',
    'testing_purpose_2',
    'fake_profil'
  ],
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
    community: false,
    proprietary: { public: false, private: false }
  },
  audience: '',
  persona: '',
  guidelines: '',
  greeting: ["Cette configuration n'existe qu'à des fins de tests"],
  examples: [],
  disclaimer: null
} as Config
