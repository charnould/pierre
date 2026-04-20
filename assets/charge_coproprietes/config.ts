import type { Config } from '../../utils/_schema'

export default {
  id: 'charge_coproprietes',
  display: 'Chargé de copropriétés',
  show: [
    'agent_astreinte',
    'agent_jour',
    'cadre_astreinte',
    'charge_coproprietes',
    'charge_recouvrement',
    'default'
  ],
  custom_data: {},
  api: [],
  protected: true,
  knowledge: {
    community: true,
    proprietary: true
  },
  greeting: [
    'Bonjour 🖐️,',
    "Je suis GUSTAVE #2, l'agent IA de GDH (orienté « chargé de copropriétés »).",
    'Je réponds aux questions relatives à la gestion des copropriétés : suivi du patrimoine, compréhension des parcours d’affaires, gestion des incidents, coordination avec les prestataires et syndics, ainsi que toute information utile pour faciliter votre travail lorsque l’Office est ouvert.',
    'Mes connaissances progressent de jour en jour, mais si elles vous semblent perfectibles, signalez-le à votre manager !'
  ],
  examples: [
    "Comment dois-je t'écrire pour avoir une réponse précise à ma question ?",
    'Comment bien qualifier une affaire dans SAW ?'
  ],
  disclaimer:
    'Gustave peut faire des erreurs. En cas de doute, reportez vous à la documentation sur le portail de GDH.'
} as Config
