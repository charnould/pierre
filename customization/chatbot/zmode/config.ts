import type { Config } from '../../../server/utils/_schema'

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
  reasoning_display: 'off',
  reasoning_effort: 'medium',
  reasoning_placeholders: [
    'Prise en compte de la question…',
    'Lecture de la demande…',
    'Analyse du besoin…',
    'Compréhension des attentes…',
    'Identification du contexte…',
    'Définition du périmètre…',
    'Cadrage de la réponse…',
    'Mise en structure…',
    'Organisation des éléments…',
    'Structuration des idées…',
    'Mise en cohérence des éléments…',
    'Analyse des points clés…',
    'Examen des éléments disponibles…',
    'Appréciation des enjeux…',
    "Affinage de l'analyse…",
    'Approfondissement du raisonnement…',
    'Consolidation de la réflexion…',
    'Hiérarchisation des priorités…',
    'Mise en relation des éléments…',
    'Articulation de la réponse…',
    "Construction de l'argumentation…",
    'Développement de la réponse…',
    'Précision du raisonnement…',
    'Clarification de la réponse…',
    'Synthèse des points essentiels…',
    'Formalisation des éléments…',
    'Rédaction structurée…',
    'Validation de la réponse…',
    'Contrôle de cohérence…',
    'Vérification globale…',
    'Mise au propre…',
    'Préparation de la restitution…'
  ]
} as Config
