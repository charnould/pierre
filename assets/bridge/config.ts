/* DÉBUT : ** NE PAS MODIFIER */
/* oxlint-disable */
import { createHuggingFace } from '@ai-sdk/huggingface'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createCerebras } from '@ai-sdk/cerebras'
import { createCohere } from '@ai-sdk/cohere'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createGroq } from '@ai-sdk/groq'
import { createMistral } from '@ai-sdk/mistral'
import { createOpenAI } from '@ai-sdk/openai'
import { createTogetherAI } from '@ai-sdk/togetherai'
import type { Config } from '../../utils/_schema'

const groq = createGroq()
const cohere = createCohere()
const openai = createOpenAI()
const mistral = createMistral()
const cerebras = createCerebras()
const anthropic = createAnthropic()
const togetherai = createTogetherAI()
const huggingface = createHuggingFace()
const google = createGoogleGenerativeAI()
/* oxlint-enable */
/* FIN : ** NE PAS MODIFIER */

export default {
  id: 'bridge',
  display: 'bridge',
  show: [],
  custom_data: {},
  api: [],
  models: {
    augment_with: {
      model: groq('qwen/qwen3-32b'),
      providerOptions: {
        groq: {
          reasoningFormat: 'raw',
          reasoningEffort: 'none',
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
    location: null,
    community: true,
    proprietary: false
  },
  greeting: [],
  examples: [],
  disclaimer: null
} as Config
