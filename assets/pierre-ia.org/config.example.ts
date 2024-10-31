import type { Config } from '../../utils/_schema'

export default {
  // Doit être à la fois le nom de domaine avec extension du bailleur
  // (ex. icfhabitat.fr) et le nom du dossier dans `assets/`
  id: 'pierre-ia.org',

  // Le modèle de langage qu'utilise PIERRE pour générer les réponses.
  // Ci-après quelques exemples non-exhaustifs de modèles utilisables
  // (il est impératif que la clef d'API correspondante soit renseignée
  // dans les variables d'environnement).
  // - model: "cohere('command-r-plus')"
  // - model: "mistral('mistral-large-latest')"
  // - model: "mistral('mistral-small-latest')"
  // - model: "google('gemini-1.5-pro-latest')"
  // - model: "google('gemini-1.5-flash-latest')"
  // - model: "anthropic('claude-3-5-sonnet-20241022')"
  // - model: "anthropic('claude-3-5-sonnet-20240620')"
  // - model: "anthropic('claude-3-opus-20240229')"
  // - model: "anthropic('claude-3-haiku-20240307')"
  // - model: "openai('gpt-4o-mini-2024-07-18')",
  model: "openai('gpt-4o-mini-2024-07-18')",

  // Le numéro de téléphone qui permet d'utiliser PIERRE via SMS.
  // Assurez-vous de bien respecter le format (`00` au début).
  phone: '0033900000000',

  // Une information qui n'est pas visible par l'utilisateur,
  // mais qui permet à PIERRE de savoir dans quel contexte il
  // lui faut considérer les interactions/échanges.
  context: 'The user is interested in EXAMPLE, a social housing company.',

  // Une information qui n'est pas visible par l'utilisateur,
  // mais qui permet à PIERRE de savoir qui il est et comment
  // se comporter.
  persona:
    "You're LUCIEN, an artificial intelligence by EXAMPLE created to answer everyday questions from prospects and clients of EXAMPLE. Your knowledge is not yet perfect but improves over time.",

  // Le message qui s'affiche par défaut dans l'interface www de PIERRE.
  greeting: [
    'Bonjour 👋,',
    'Je suis une IA spécialisée sur les sujets du logement réglementé, à la fois open source, plurilingue et multicanale.',
    'Comment puis-je vous aider ?'
  ],

  // Les exemples qui s'affichent par défaut dans l'interface www de PIERRE.
  examples: [
    "Qu'est ce que l'avance LOCA-PASS et comment savoir si j'y suis éligible ?",
    "Je suis saisonnier, et j'ai des problèmes pour me loger sur mon lieu de travail, Action Logement propose-t-il des aides ou solutions ?",
    "Je suis propriétaire d'un apparement et je me demandais quels étaient les avantages de la garantie VISALE",
    "C'est quoi l'Eco-PTZ ?"
  ]
} as Config
