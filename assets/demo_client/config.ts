import type { Config } from '../../utils/_schema'

export default {
  id: 'demo_client',
  display: 'Locataire',
  show: ['default', 'demo_client', 'demo_team'],
  custom_data: {},
  api: [],
  protected: false,
  knowledge: {
    community: true,
    proprietary: false
  },
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
