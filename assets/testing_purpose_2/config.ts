import { createAnthropic } from '@ai-sdk/anthropic'
import { createCerebras } from '@ai-sdk/cerebras'
import { createCohere } from '@ai-sdk/cohere'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createGroq } from '@ai-sdk/groq'
import { createMistral } from '@ai-sdk/mistral'
import { createOpenAI } from '@ai-sdk/openai'
import { createTogetherAI } from '@ai-sdk/togetherai'
import type { Config } from '../../utils/_schema'

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
  models: {
    augment_with: {
      model: groq('qwen/qwen3-32b'),
      providerOptions: {
        groq: {
          reasoningFormat: 'raw',
          reasoningEffort: 'default',
          serviceTier: 'auto'
        }
      }
    },
    rerank_with: {
      model: groq('qwen/qwen3-32b'),
      providerOptions: {
        groq: {
          reasoningFormat: 'raw',
          reasoningEffort: 'default',
          serviceTier: 'auto'
        }
      }
    },
    answer_with: {
      model: openai('gpt-4.1-mini'),
      providerOptions: {
        openai: {
          reasoningEffort: 'none',
          reasoningSummary: null
        }
      }
    }
  },
  protected: false,
  knowledge: {
    community: false,
    proprietary: false
  },
  audience: '',
  persona: '',
  guidelines: '',
  greeting: ["Cette configuration n'existe qu'à des fins de tests"],
  examples: [],
  disclaimer: null
} as Config
