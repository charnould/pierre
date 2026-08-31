import type { Config } from '../../../server/utils/_schema'

export default {
  id: 'demo',
  display: 'Démonstration',
  show: ['default', 'demo', 'zmode'],
  custom_data: {},
  api: [],
  protected: false,
  community_knowledge: true,
  greeting: [
    'Bonjour 🖐️,',
    "Je suis Eiffel, l'IA de Grand Dijon Habitat.",
    "Pour rappel, je suis une version de démonstration : mes connaissances sont donc à ce jour limitées sur Grand Dijon Habitat ; je ne connais par exemple pas les agences et les coordonnées des gardiens... On peut néanmoins me l'enseigner en quelques clics !",
    "Par ailleurs, et à des fins de démonstration, j'affiche les traces de mon raisonnement ; celles-ci peuvent, bien entendu, être affichées ou masquées selon ma configuration.",
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
    "Eiffel peut faire des erreurs et n'est affilié d'aucune façon à Grand Dijon Habitat (démonstration uniquement).",
  reasoning_display: 'full',
  reasoning_effort: 'medium'
} as Config
