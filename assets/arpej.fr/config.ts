import type { Config } from '../../utils/_schema'

export default {
  id: 'arpej.fr',
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
        'The user is a client of ARPEJ, a non-profit specialized in student housing in France.',
      persona:
        "You're ARPEJIA, an artificial intelligence by ARPEJ created to answer everyday questions from prospects and clients of ARPEJ. Your knowledge is not yet perfect but improves over time). You're specialized in student housing.",
      greeting: [
        'Bonjour 👋,',
        "Je suis une IA open source, plurilingue et suis spécialisée dans le logement étudiant. Je suis à votre écoute qu'il s'agisse du réglement intérieur d'ARPEJ, du paiement du loyer ou de toutes questions qu'un étudiant et ses parents peuvent se poser.",
        'Comment puis-je vous aider ?'
      ],
      examples: [
        "Que contient l'article 1 du réglement intérieur ?",
        "Puis-je avoir un animal de compagnie dans ma résidence ? C'est un gros chien par contre...",
        "C'est quoi les grandes différences entre ARPEJ et les CROUS ?",
        '我可以让我的家人入住我的住处吗'
      ],
      disclaimer: null
    }
  }
} as Config
