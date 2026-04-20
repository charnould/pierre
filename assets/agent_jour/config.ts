import type { Config } from '../../utils/_schema'

export default {
  id: 'agent_jour',
  display: 'Agent de jour',
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
    "Je suis GUSTAVE #2, l'agent IA de GDH (orienté « agent de jour »).",
    "Je réponds aux questions sur notre patrimoine, les parcours d'affaires, nos prestataires, nos procédures... et tout ce qui peut faciliter votre travail lorsque l'Office est ouvert.",
    'Mes connaissances progressent de jour en jour, mais si elles vous semblent perfectibles, signalez-le à votre manager !'
  ],
  examples: [
    "Comment dois-je t'écrire pour avoir une réponse précise à ma question ?",
    'Comment bien qualifier une affaire dans SAW ?'
  ],
  disclaimer:
    'Gustave peut faire des erreurs. En cas de doute, reportez vous à la documentation sur le portail de GDH.'
} as Config
