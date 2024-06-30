import type { Config } from '../../utils/_schema'

export default {
  id: 'actionlogement.fr',
  assistant: 'Assistant IA',
  context: 'The user is interested in Action Logement, a social housing company.',
  greeting: [
    'Bonjour 👋,',
    "Je suis une IA spécialisée sur les sujets du logement réglementé, à la fois open source et multilingue. Mon objectif : répondre à 100 % des questions de « premier niveau » que peut se poser un étudiant, un apprenti, un salarié, un employeur sur les offres et services d'ALI ou ALS.",
    'Pour rappel, je suis une version alpha et mes connaissances sont à ce jour très limitées.)',
    'Comment puis-je vous aider ?'
  ],
  examples: [
    "Comment joindre l'agence Domofrance de Pessac ?",
    'Comment déposer mon congé pour mon logement ?',
    "C'est quoi l'enquête SLS et suis-je concerné ?",
    'Je cherche un logement social dans le Cantal ?'
  ]
} as Config
