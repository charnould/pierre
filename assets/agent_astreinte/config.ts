import type { Config } from '../../utils/_schema'

export default {
  id: 'agent_astreinte',
  display: "Agent d'astreinte",
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
    "Je suis GUSTAVE #2, l'agent IA de GDH (orienté « agent d'astreinte »).",
    "À ce jour, je ne réponds qu'aux questions sur notre patrimoine, nos prestataires et tout ce qui peut aider nos collaborateurs d'astreinte à prendre les meilleures décisions possibles.",
    'Comme je dis souvent : je ne sais pas réparer une chaudière, mais je sais où trouver les radiateurs à prêter aux locataires. 😉'
  ],
  examples: [
    "Comment dois-je t'écrire pour avoir une réponse précise à ma question ?",
    'Rédige-moi un SMS pour informer nos locataires que nous allons distribuer des radiateurs',
    "Quelle est la procédure d'astreinte en cas d'appel d'un locataire pour un dégât des eaux ?",
    "Combien de bouteilles d'eau sont disponibles dans le garage n°5 ?",
    "Il y a actuellement une coupure d'électricité dans les parties communes de l'îlot Franche-Comté, quelle est la procédure ?",
    'Plus de chauffage à la résidence Hyacinthe Vincent : quelle est la procédure ?'
  ],
  disclaimer:
    'Gustave peut faire des erreurs. En cas de doute, précisez votre question ou consultez la documentation sur le portail de gestion des astreintes.'
} as Config
