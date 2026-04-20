/* DÉBUT : ** NE PAS MODIFIER */
import type { Config } from '../../utils/_schema'
/* FIN : ** NE PAS MODIFIER */

export default {
  id: 'demo_team',
  display: 'Collaborateur',
  show: ['default', 'demo_client', 'demo_team'],
  custom_data: {},
  api: [],
  protected: false,
  knowledge: {
    community: true,
    proprietary: true
  },
  greeting: [
    'Bonjour 🖐️,',
    "Je suis PIERRE, l'assistant (ou aide de camp) des collaborateurs de Pierre Habitat, un bailleur social fictif. Ma mission : donner à voir comment une intelligence artificielle open source peut aider les collaborateurs des bailleurs sociaux au quotidien.",
    'Choisissez un exemple ci-dessous.',
    "Pour info., je peux apprendre en quelques secondes tout ce qu'il a à savoir de vos fichiers Word et Excel."
  ],
  examples: [
    'Quelle est la procédure si un locataire est bloqué dans un ascenseur ?',
    'Qui est le prestataire ascenseur de la résidence Pierre ?',
    'Un locataire me demande comment régler un problème de voisinnage, rédige moi un email.',
    "Quels impacts du PACS lorsqu'un locataire veut rompre son contrat de bail ?"
  ],
  disclaimer: "Les données retournées par l'IA sont ici strictement fictives."
} as Config
