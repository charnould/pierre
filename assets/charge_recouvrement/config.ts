import type { Config } from '../../utils/_schema'

export default {
  id: 'charge_recouvrement',
  display: 'Chargé de recouvrement',
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
    "Je suis GUSTAVE #2, l'agent IA de GDH (orienté « chargé de recouvrement »).",
    'Je réponds aux questions du mieux possible afin d’accompagner les chargés de recouvrement dans leurs missions, notamment le suivi des impayés, la gestion des relances amiables et contentieuses, l’analyse des situations, la mise en place de plans d’apurement, ainsi que la coordination avec les différents interlocuteurs. Mes connaissances s’améliorent continuellement, mais elles peuvent varier selon le profil et le contexte dans lesquels j’interviens.',
    'Si mes connaissances vous semblent perfectibles, signalez-le à votre manager !'
  ],
  examples: [
    "Comment dois-je t'écrire pour avoir une réponse précise à ma question ?",
    "Qu'est ce que la commission de surendettement des particuliers ?",
    'Quels dispositifs pour prévenir les expulsions ?',
    "Qu'est ce que la procédure de rétablissement personnel ?"
  ],
  disclaimer:
    'Gustave peut faire des erreurs. En cas de doute, reportez vous à la documentation sur le portail de GDH.'
} as Config
