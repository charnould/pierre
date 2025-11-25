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
  id: 'demo_team',
  display: 'Collaborateur',
  show: ['default', 'demo_client', 'demo_team'],
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
    community: true,
    proprietary: true
  },
  greeting: [
    'Bonjour 🖐️,',
    "Je suis PIERRE, l'assistant (ou aide de camp) des collaborateurs de Pierre Habitat, un bailleur social fictif. Ma mission : donner à voir comment une intelligence artificielle open source peut aider les collaborateurs des bailleurs sociaux au quotidien.",
    'Choisissez un exemple ci-dessous.',
    "Pour info., je peux apprendre en quelques secondes tout ce qu'il a à savoir de vos fichiers Word et Excel."
  ],
  examples: [
    'Quelle est la procédure si un locataire est bloqué dans un ascenseur ?',
    'Qui est le prestataire ascenseur de la résidence Pierre ?',
    'Un locataire me demande comment régler un problème de voisinnage, rédige moi un email.',
    "Quels impacts du PACS lorsqu'un locataire veut rompre son contrat de bail ?"
  ],
  disclaimer: "Les données retournées par l'IA sont ici strictement fictives."
} as Config
