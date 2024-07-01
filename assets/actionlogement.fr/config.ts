import type { Config } from '../../utils/_schema'

export default {
  id: 'actionlogement.fr',
  assistant: 'Assistant IA',
  context: 'The user is interested in Action Logement, a social housing company.',
  greeting: [
    'Bonjour 👋,',
    "Je suis une IA spécialisée sur les sujets du logement réglementé, à la fois open source et multilingue. Mon objectif : répondre à 100 % des questions de « premier niveau » que peut se poser un étudiant, un apprenti, un salarié, un employeur sur les offres et services d'ALI ou ALS.",
    'Pour rappel, je suis une version alpha et mes connaissances sont à ce jour limitées.',
    'Comment puis-je vous aider ?'
  ],
  examples: [
    "Qu'est ce que l'avance LOCA-PASS et comment savoir si j'y suis éligible ?",
    "Je suis saisonnier, et j'ai des problèmes pour me loger sur mon lieu de travail, Action Logement propose-t-il des aides ou solutions ?",
    "Je suis propriétaire d'un apparement et je me demandais quels étaient les avantages de la garantie VISALE",
    "C'est quoi l'Eco-PTZ ?"
  ]
} as Config
