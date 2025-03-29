import type { Config } from '../../utils/_schema'

export default {
  id: 'testing_purpose',
  custom_data: {},
  api: [],
  models: {
    embed_with: 'text-embedding-3-large',
    augment_with: "openai('gpt-4o-mini-2024-07-18')",
    rerank_with: "openai('gpt-4o-mini-2024-07-18')",
    answer_with: "openai('gpt-4o-mini-2024-07-18')"
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
