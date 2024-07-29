import type { Config } from "../../utils/_schema";

export default {
  id: "_default",
  assistant: "PIERRE (assistant IA)",
  context: "The user is interested in housing, and their questions should be considered with this in mind.",
  greeting: [
    "Bonjour 👋,",
    "Je suis Pierre, une intelligence artificielle open source et plurilingue au service du Mouvement HLM. (Pour rappel, je suis une version alpha et mes connaissances sont à ce jour très limitées.)",
    "Comment puis-je vous aider ?",
  ],
  examples: [
    "Comment déposer mon préavis de congé pour mon logement ? Et avez-vous un modèle de courrier ?",
    "C'est quoi l'enquête SLS, suis-je concerné ?",
    "Je cherche un logement social dans le Cantal. Comment déposer un dossier et quel est le processus ?",
    "كيفية الاتصال بالمكتب الرئيسي لبلدية Plaine Commune Habitat؟",
    "Y-a-t-il des associations pour m'aider à trouver un logement d'urgence dans le cadre de violences conjugales dans le Vaucluse ? J'habite à Carpentras...",
  ],
} as Config;
