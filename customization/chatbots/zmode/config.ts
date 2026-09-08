import type { ChatbotConfig } from '../../../server/utils/_schema'

export default {
  id: 'zmode',
  display: 'Z-Mode',
  show: ['default', 'demo', 'zmode'],
  custom_data: {},
  api: [],
  protected: false,
  // community_knowledge à false : le chatbot ne s'appuie que sur des connaissances générales,
  // sans accès à des données spécifiques ou réglementaires.
  community_knowledge: false,
  greeting: [
    'Bonjour 🖐️,',
    "Je suis PIERRE, je fonctionne ici en mode « wrapper LLM » (c'est-à-dire comme lorsque vous utilisez ChatGPT ou Claude), je réponds à partir de connaissances générales, sans accès à des données officielles ou spécifiques de votre organisme.",
    'Pour des informations précises ou réglementaires, utilisez un profil connecté à des sources fiables.'
  ],
  examples: [
    'Rédige un court poème « à la Rimbaud » faisant l’éloge des HLM',
    'Imagine une journée typique dans la vie d’un gardien d’immeuble',
    'Donne-moi des idées pour mieux vivre avec ses voisins en logement social'
  ],
  disclaimer: 'Une IA peut se tromper. Vérifiez les informations importantes.',
  trace: 'none',
  attachments: true,
  reasoning_effort: 'medium'
} satisfies ChatbotConfig
