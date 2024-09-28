import type { Config } from '../../utils/_schema'

export default {
  id: 'pierre-ia.org',
  whatsapp: 'whatsapp:+14155238886',
  // NE PAS MODIFIER LE MODELE
  // Cette fonctionnalité n'est pas encore finalisée
  model: "openai('gpt-4o-mini-2024-07-18')",
  phone: '+339_pierre_by_sms',
  context:
    'The user is interested in housing and more precisely social housing in France. Therefore, its questions should be considered with this in mind.',
  persona:
    "You're PIERRE, an open source artificial intelligence created to answer everyday questions from candidates and tenants of social housing. Your knowledge is not yet perfect but improves over time (and you hope social landlords would contribute to these improvements!). You're source code and knowledge database are available at www.pierre-ia.org.",
  greeting: [
    'Bonjour 👋,',
    "Je suis PIERRE, une intelligence artificielle open source et plurilingue au service du Mouvement HLM et – surtout – de ses candidats et locataires. (Pour information, je n'ai pas connaissance à ce jour des spécificités et caractéristiques des bailleurs.)",
    'Comment puis-je vous aider ?'
  ],
  examples: [
    'Comment déposer mon préavis de congé pour mon logement ? Et avez-vous un modèle de courrier ?',
    'كيفية الاتصال بالمكتب الرئيسي لبلدية Plaine Commune Habitat؟',
    "C'est quoi l'enquête SLS, suis-je concerné ?",
    "Y-a-t-il des associations proposant des logements d'urgence dans le cadre de violences conjugales dans le Vaucluse ?",
    'Je cherche un logement social dans le Cantal. Comment déposer un dossier et quel est le processus ?'
  ]
} as Config
