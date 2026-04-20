import type { Config } from '../../utils/_schema'

export default {
  id: 'cadre_astreinte',
  custom_data: {},
  display: "Cadre d'astreinte",
  show: [
    'agent_astreinte',
    'agent_jour',
    'cadre_astreinte',
    'charge_coproprietes',
    'charge_recouvrement',
    'default'
  ],
  api: [],
  protected: true,
  knowledge: {
    community: true,
    proprietary: true
  },
  greeting: [
    'Bonjour 🖐️,',
    "Je suis GUSTAVE #2, l'agent IA de GDH (orienté « cadre d'astreinte »).",
    "À ce jour, je ne réponds qu'aux questions sur notre patrimoine et nos prestataires d'astreinte. Je suis là pour vous aider à prendre les meilleures décisions possibles dans les situations les plus fréquemment rencontrées ou prévisibles.",
    "N'hésitez pas à me détailler la situation pour que je puisse vous répondre le plus précisément possible. Si ma réponse vous semble incomplète ou imprécise, reformulez votre demande ou posez-moi une question complémentaire. Cela peut m'être utile. En cas de doute, consultez toujours le cahier de consignes d'astreintes."
  ],
  examples: [
    "Comment dois-je t'écrire pour avoir une réponse précise à ma question ?",
    'Rédige-moi un SMS pour informer nos locataires que nous allons distribuer des radiateurs',
    "Quelle est la procédure d'astreinte en cas d'appel d'un locataire pour un dégât des eaux ?",
    "Combien de bouteilles d'eau sont disponibles dans le garage n°5 ?",
    'Que faire si Gustave ne dispose pas dans le cahier des consignes des astreintes de la réponse à ma demande ?'
  ],
  disclaimer:
    'Gustave peut faire des erreurs. En cas de doute, précisez votre question ou consultez la documentation sur le portail de gestion des astreintes.'
} as Config
