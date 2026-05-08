import type { Config } from '../../../utils/_schema'

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
