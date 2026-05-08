import type { Config } from '../../../utils/_schema'

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
  protected: true,
  community_knowledge: false,
  greeting: ["Cette configuration n'existe qu'à des fins de tests"],
  examples: [],
  disclaimer: null,
  reasoning_display: 'off',
  reasoning_effort: 'medium',
  reasoning_placeholders: [
    'Compréhension des attentes…',
    'Identification du contexte…',
    'Définition du périmètre…',
    'Cadrage de la réponse…'
  ]
} as Config
