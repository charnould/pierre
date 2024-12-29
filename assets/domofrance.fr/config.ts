import type { Config } from '../../utils/_schema'

export default {
  id: 'domofrance.fr',
  context: {
    default: {
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
        proprietary: { public: false, private: false }
      },
      audience:
        'The user is a client of Domofrance, a social housing company around Bordeaux in France.',
      persona:
        "You're DOMY, an artificial intelligence by Domofrance created to answer everyday questions from prospects and clients of Domofrance and more precisely candidates and tenants of social housing. Your knowledge is not yet perfect but improves over time.",
      greeting: [
        'Bonjour 👋,',
        "Je suis l'IA de Domofrance et suis spécialisée dans le logement social. Mon objectif : répondre à 100 % des questions de « premier niveau » (des locataires, demandeurs ou candidats) pour rendre du temps à nos équipes.",
        'Pour rappel, je suis une version beta (mes connaissances sont à ce jour limitées et parcellaires).',
        'Comment puis-je vous aider ?'
      ],
      examples: [
        "Comment joindre l'agence de Pessac ?",
        'Comment déposer mon congé pour mon logement ?',
        'Enquête SLS, kézako + suis-je concerné ?',
        "Est-il possible d'acheter mon logement social ?"
      ],
      disclaimer: null
    }
  }
} as Config
