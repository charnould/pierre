import type { Config } from '../../utils/_schema'

export default {
  id: 'domofrance.fr',
  assistant: 'Assistant IA',
  context: 'The user is a client of Domofrance, a social housing company around Bordeaux in France.',
  greeting: [
    'Bonjour 👋,',
    "je suis l'IA de Domofrance et suis spécialisée dans le logement social. Mon objectif : répondre à 100 % des questions de « premier niveau » (des locataires, demandeurs ou candidats) pour rendre du temps aux équipes.",
    'Pour rappel, je suis une version alpha et mes connaissances sont à ce jour très limitées.',
    'Comment puis-je vous aider ?'
  ],
  examples: [
    "Comment joindre l'agence de Pessac ?",
    'Comment déposer mon congé pour mon logement ?',
    "C'est quoi l'enquête SLS et suis-je concerné ?",
    "Est-t-il possible d'acheter mon logement social ?"
  ]
} as Config
