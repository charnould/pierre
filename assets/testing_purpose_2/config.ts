import type { Config } from '../../utils/_schema'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createCerebras } from '@ai-sdk/cerebras'
import { createCohere } from '@ai-sdk/cohere'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createGroq } from '@ai-sdk/groq'
import { createMistral } from '@ai-sdk/mistral'
import { createOpenAI } from '@ai-sdk/openai'
import { createTogetherAI } from '@ai-sdk/togetherai'

const openai = createOpenAI()
const google = createGoogleGenerativeAI()
const anthropic = createAnthropic()
const mistral = createMistral()
const cohere = createCohere()
const togetherai = createTogetherAI()
const groq = createGroq()
const cerebras = createCerebras()

export default {
  id: 'testing_purpose_2',
  display: 'Test 2',
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
  answer_with: {
    model: openai('gpt-4.1-mini'),
    providerOptions: {
      openai: {
        reasoningEffort: 'minimal',
        reasoningSummary: undefined
      }
    }
  },
  phone: null,
  protected: false,
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
