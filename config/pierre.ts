import type { Config } from '../utils/_schema'

export default {
  config: [
    {
      config: 'default',
      keywords: null,
      greeting:
        'Bonjour 👋, je suis PIERRE, une intelligence artificielle (en formation) au service du mouvement HLM ! Comment puis-je vous aider ?',
      examples: [
        'Vous pouvez me poser des questions sur les charges locatives, sur le préavis de congé, sur les nuisances sonores, le Ministre ou encore le secteur HLM en général.'
      ]
    },

    {
      config: 'actionlogement',
      keywords: null,
      greeting:
        "Bonjour 👋, je suis une IA spécialisée sur les sujets du logement réglementé. Mon objectif : répondre à 100 % des questions de « premier niveau » que peut se poser un étudiant, un apprenti, un salarié, un employeur sur les offres et services d'ALI ou ALS.",
      examples: [
        "Logement saisonnier, LOCA-PASS, PTZ, MOBILI-JEUNE, aides en tous genres : libre à vous de m'interroger sur les aides et dispositifs Action Logement !",
        "Action Logement n'est pas affiliée à PIERRE (il s'agit d'une démonstration). Par ailleurs, ma base de connaissances est limitée, certaines réponses peuvent donc ne pas être satisfaisantes."
      ]
    },

    {
      config: 'domofrance',
      keywords: 'Domofrance',
      greeting:
        "Bonjour 👋, je suis l'IA de Domofrance et suis spécialisée dans le logement social. Mon objectif : répondre à 100 % des questions de « premier niveau » (des locataires, demandeurs ou candidats) pour rendre du temps aux équipes.",
      examples: [
        "N'hésitez pas à m'interroger sur les horaires du service-client, sur « Vivant » (le nouveau plan stratégique de Domofrance) ou encore la filiale ExterrA...",
        "Domofrance n'est pas affiliée à PIERRE (il s'agit d'une démonstration). Par ailleurs, ma base de connaissances est limitée, certaines réponses peuvent donc ne pas être satisfaisantes."
      ]
    },

    {
      config: 'arpej',
      keywords: 'ARPEJ',
      greeting:
        "Bonjour 👋, Je suis une IA multilingue et suis spécialisée dans le logement étudiant. Je suis à votre écoute qu'il s'agisse du réglement intérieur d'ARPEJ, du paiement du loyer ou de toutes questions qu'un étudiant et ses parents peuvent se poser.",
      examples: [
        'Ask me something in english to try my language skills!',
        "ARPEJ n'est pas affiliée à PIERRE (il s'agit d'une démonstration). Par ailleurs, ma base de connaissances est limitée, certaines réponses peuvent donc ne pas être satisfaisantes."
      ]
    },
    {
      config: 'plainecommunehabitat',
      keywords: '"Plaine Commune Habitat"',
      greeting:
        "Bonjour 👋, Je suis l'IA multilingue de Plaine Commune Habitat et suis là pour répondre aux questions des locataires HLM. Comment puis-je vous aider aujourd'hui ?",
      examples: [
        'Ask me something in arabic to try my language skills!',
        "Plaine Commune Habitat n'est pas affiliée à PIERRE (il s'agit d'une démonstration). Par ailleurs, ma base de connaissances est limitée, certaines réponses peuvent donc ne pas être satisfaisantes."
      ]
    }
  ] as Config[]
}
