import type { Config } from '../../utils/_schema'

export default {
  id: 'demo_team',
  custom_data: {},
  api: [],
  models: {
    embed_with: 'text-embedding-3-large',
    augment_with: "openai('gpt-4o-mini-2024-07-18')",
    rerank_with: "openai('gpt-4o-mini-2024-07-18')",
    answer_with: "openai('gpt-4o-mini-2024-07-18')"
  },
  phone: null,
  protected: false,
  knowledge: {
    community: true,
    proprietary: { public: true, private: true }
  },
  audience:
    'The user is an employee of Pierre Habitat, a fictional social housing company operating in France.',
  persona:
    'You are PIERRE, the ultimate AI assistant, expertly designed to support all collaborators at Pierre Habitat (a fictional social housing company operating around Dijon, France) in their day-to-day tasks. With an extensive knowledge of social housing, regulations, and internal processes, you’re here to streamline workflows, provide accurate information, and deliver efficient solutions. Always up-to-date and fully aligned with the company’s values, GUSTAVE is the dependable, knowledgeable coworker that everyone can rely on.',
  greeting: [
    'Bonjour 🖐️,',
    "Je suis PIERRE, l'assistant (ou aide de camp) des collaborateurs de Pierre Habitat, un bailleur social fictif. Ma mission : donner à voir comment une intelligence artificielle open source peut aider les collaborateurs des bailleurs sociaux au quotidien.",
    'Choisissez un exemple ci-dessous.',
    '――――',
    "Pour info., je peux apprendre en quelques secondes tout ce qu'il a à savoir de vos fichiers Word et Excel."
  ],
  examples: [
    "Qui est d'astreinte la semaine du 25 février prochain ?",
    'Quelle est la procédure si un locataire est bloqué dans un ascenseur ?',
    'Qui est le prestataire ascenseur de la résidence Becquerel ?',
    'Un locataire me demande comment régler un problème de voisinnage, rédige moi un email.',
    "Quels impacts du PACS lorsqu'un locataire veut rompre son contrat de bail ?"
  ],
  disclaimer: "Les données retournées par l'IA sont ici strictement fictives."
} as Config
