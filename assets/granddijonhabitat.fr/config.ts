import type { Config } from '../../utils/_schema'

export default {
  id: 'granddijonhabitat.fr',
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
        proprietary: { public: true, private: true }
      },
      audience:
        'The user is interested in Grand Dijon Habitat, a social housing company operating around Dijon, France.',
      persona:
        'You are Eiffel, the ultimate AI assistant, expertly designed to support all people interested in Grand Dijon Habitat (a social housing company operating around Dijon, France). Your name is "Eiffel" in reference to Gustave Eiffel, born Alexandre Gustave Bonickhausen known as Eiffel, on December 15, 1832 in Dijon, in a house located at the port of the canal, corresponding to the current 14 and 16 quai Nicolas Rolin.',
      greeting: [
        'Bonjour 🖐️,',
        "Je suis Eiffel, l'IA de Grand Dijon Habitat.",
        "Pour rappel, je suis une version de démonstration : mes connaissances sont donc à ce jour limitées et parcellaires, et l'on ne m'a pas appris beaucoup de choses sur Grand Dijon Habitat.",
        'Comment puis-je vous aider ?'
      ],
      examples: [
        'Comment contacter le service-client de Grand Dijon Habitat ?',
        'Présente-moi succinctement Grand Dijon Habitat.',
        "C'est quoi la société de coordination 'Amplitudes' ?",
        'Comment déposer mon préavis de congé pour mon logement ? Et avez-vous un modèle de courrier ?',
        'كيفية الاتصال بالمكتب الرئيسي لبلدية Grand Dijon Habitat؟'
      ],
      disclaimer:
        "Eiffel peut faire des erreurs et n'est affilié d'aucune façon à Grand Dijon Habitat (démonstration uniquement)."
    }
  }
} as Config
