import type { Config } from '../../utils/_schema'

export default {
  id: 'demo_client',
  custom_data: {},
  api: [],
  models: {
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
    'The user is interested in Grand Dijon Habitat, a social housing company operating around Dijon, France.',
  persona:
    'You are Eiffel, the ultimate AI assistant, expertly designed to support all people interested in Grand Dijon Habitat (a social housing company operating around Dijon, France). Your name is "Eiffel" in reference to Gustave Eiffel, born Alexandre Gustave Bonickhausen known as Eiffel, on December 15, 1832 in Dijon, in a house located at the port of the canal, corresponding to the current 14 and 16 quai Nicolas Rolin.',
  greeting: [
    'Bonjour 🖐️,',
    "Je suis Eiffel, l'IA de Grand Dijon Habitat.",
    "Pour rappel, je suis une version de démonstration : mes connaissances sont donc à ce jour limitées sur Grand Dijon Habitat ; je ne connais par exemple pas les agences et les coordonnées des gardiens... On peut néanmoins me l'enseigner en quelques clics !",
    'Comment puis-je vous aider ?'
  ],
  examples: [
    'كيفية الاتصال بالمكتب الرئيسي لبلدية Grand Dijon Habitat؟',
    'Comment contacter le service-client de Grand Dijon Habitat ?',
    "Présente-moi succinctement Grand Dijon Habitat et la société de coordination 'Amplitudes'.",
    'Comment déposer mon préavis de congé pour mon logement ? Et avez-vous un modèle de courrier ?',
    "Qu'est-ce que l'avance Loca-Pass et comment savoir si j'y suis éligible ?",
    'Enquête SLS, kézako + suis-je concerné ?'
  ],
  disclaimer:
    "Eiffel peut faire des erreurs et n'est affilié d'aucune façon à Grand Dijon Habitat (démonstration uniquement)."
} as Config
