import type { Config } from '../../utils/_schema'

export default {
  // Doit être à la fois le nom de domaine avec extension du bailleur
  // (ex. icfhabitat.fr) et le nom du dossier dans `assets/`
  id: 'pierre-ia.org',

  // Le modèle de langage qu'utilise PIERRE pour générer les réponses.
  // Ci-dessous, des exemples non-exhaustifs de modèles utilisables
  // (il est impératif que la clef d'API correspondante soit renseignée
  // dans les variables d'environnement).
  // model: "cohere('command-r-plus')",
  // model: "mistral('mistral-large-latest')",
  // model: "mistral('mistral-small-latest')",
  // model: "google('gemini-1.5-pro-latest')",
  // model: "google('gemini-1.5-flash-latest')",
  // model: "anthropic('claude-3-5-sonnet-20241022')",
  // model: "anthropic('claude-3-5-haiku-20241022')",
  // model: "openai('gpt-4o-mini-2024-07-18')",
  // model: "openai('gpt-4o-2024-11-20')",
  model: "openai('gpt-4o-mini-2024-07-18')",

  // Le numéro de téléphone qui permet d'utiliser PIERRE via SMS.
  // Assurez-vous de bien respecter le format (`00` au début).
  phone: '0033939070074',

  // Les personnalités/habillages que PIERRE peut adopter.
  // Exemples :
  // - Lorsque l'on consulte PIERRE depuis le site internet du bailleur
  // - Lorsque l'on consulte PIERRE en agence depuis une borne d'accueil interactive
  // - Lorsque l'on consulte PIERRE et que l'on est un collaborateur (CGL, RS, RT, gardiens...)
  context: {
    // La personnalité par défaut
    // Il faut impérativement et a minima renseigner `default`.
    default: {
      // Est-ce que le contexte `default` est accessible à tous les utilisateurs ?
      //
      // Si `false` :
      //  - Le contexte sera accessible à 100 % des visiteurs sur internet.
      //  - Il s'agit du paramétrage à renseigner pour un chatbot accessible aux candidats ou locataires.
      //
      // Si `true` :
      //  - Le contexte ne sera accessible qu'aux utilisateurs dûment habilités et connectés.
      //  - C'est le paramétrage à choisir pour restreindre l'usage - par exemple - aux collaborateurs.
      protected: false,
      // Quelles connaissances peut utiliser le contexte `default` lorsqu'il génère ses réponses ?
      knowledge: {
        // `community` correspond aux connaissances en open data de PIERRE.
        // Il s'agit de connaissances générales sur les HLM. En principe, `community`
        // doit toujours être `true` pour répondre en qualité aux questions.
        community: true,

        // `self` correspond aux connaissances propres à un organisme HLM, qu'il n'a
        // pas souhaité partager avec `community` et qu'il gère en son nom propre.
        // Bien que non partagées avec `community`, ces connaissances peuvent être :
        //   - `public`. C'est-à-dire des données que l'organisme souhaite néanmoins rendre publiques aux candidats
        //      ou locataires accédant au contexte (ex : les coordonnées des gardiens, agences de proximité, etc.)
        //   - réservées aux `collaborators` (ex : une procédure d'astreinte au seul usage des équipes).
        //      En toute logique, si `self.collaborators` est `true`, `protected` doit aussi être `true`.
        self: { public: false, collaborators: false }
      },

      // Une information qui n'est pas visible par l'utilisateur,
      // mais qui permet à PIERRE de savoir dans quel contexte il
      // lui faut considérer les interactions/échanges.
      audience:
        'The user’s primary focus is on housing, with a particular interest in social housing in France.',

      // Une information qui n'est pas visible par l'utilisateur, mais qui permet
      // à PIERRE de savoir qui il est et comment se comporter.
      persona:
        "You’re PIERRE, an open-source, multilingual, and multichannel AI created to assist social housing candidates and tenants with their everyday questions. Your source code is accessible to all at https://www.pierre-ia.org, and a quick overview of PIERRE's capabilities can be found at https://charnould.github.io/pierre/assets/pierre-en-3-min.pdf.",

      // Le message qui s'affiche par défaut dans l'interface www de PIERRE.
      greeting: [
        'Bonjour 🖐️,',
        'Je suis PIERRE, une IA open source, personnalisable, multicanale et plurilingue au service du mouvement HLM, de ses candidats et locataires.',
        "Ma mission : répondre 24/7/365, sur le Web ou par SMS, à toutes les questions de « premier niveau » pour transfigurer l'expérience-client.",
        'Comment puis-je vous aider ?',
        '――――',
        "Pour rappel, je n'ai pas connaissance à ce jour des spécificités des bailleurs."
      ],

      // Les exemples qui s'affichent par défaut dans l'interface www de PIERRE.
      examples: [
        'Comment déposer mon préavis de congé pour mon logement ? Et avez-vous un modèle de courrier ?',
        "Y-a-t-il des associations proposant des logements d'urgence dans le cadre de violences conjugales dans le Vaucluse ?",
        'Enquête SLS, kézako + suis-je concerné ?',
        "Qu'est-ce que l'avance Loca-Pass et comment savoir si j'y suis éligible ?",
        'Je cherche un logement social dans le Cantal. Comment déposer un dossier et quel est le processus ?',
        'كيفية الاتصال بالمكتب الرئيسي لبلدية Plaine Commune Habitat؟'
      ]
    },

    // Une seconde personnalité.
    // Vous pouvez dupliquer cette objet pour créer autant de personnalités
    // que nécessaire. Vous pouvez nommer cette personnalité par n'importe
    // quelle chaine de caractères (ici `team`).
    team: {
      protected: true,
      knowledge: {
        community: true,
        self: { public: true, collaborators: true }
      },
      audience:
        'The user’s primary focus is on housing, with a particular interest in social housing in France.',
      persona:
        "You’re PIERRE, an open-source, multilingual, and multichannel AI created to assist social housing candidates and tenants with their everyday questions. Your source code is accessible to all at https://www.pierre-ia.org, and a quick overview of PIERRE's capabilities can be found at https://charnould.github.io/pierre/assets/pierre-en-3-min.pdf.",
      greeting: [
        'Bonjour 🖐️,',
        'Je suis PIERRE, une IA open source, personnalisable, multicanale et plurilingue au service du mouvement HLM, de ses candidats et locataires.',
        "Ma mission : répondre 24/7/365, sur le Web ou par SMS, à toutes les questions de « premier niveau » pour transfigurer l'expérience-client.",
        'Comment puis-je vous aider ?',
        '――――',
        'Pour information, nous sommes là sur une version accessible uniquement aux utilisateurs connectés.'
      ],
      examples: [
        'Comment déposer mon préavis de congé pour mon logement ? Et avez-vous un modèle de courrier ?',
        "Y-a-t-il des associations proposant des logements d'urgence dans le cadre de violences conjugales dans le Vaucluse ?",
        'Enquête SLS, kézako + suis-je concerné ?',
        "Qu'est-ce que l'avance Loca-Pass et comment savoir si j'y suis éligible ?",
        'Je cherche un logement social dans le Cantal. Comment déposer un dossier et quel est le processus ?',
        'كيفية الاتصال بالمكتب الرئيسي لبلدية Plaine Commune Habitat؟'
      ]
    },
    // Une troisième personnalité.
    en_agence: {
      protected: false,
      knowledge: {
        community: true,
        self: { public: false, collaborators: false }
      },
      audience:
        'The user’s primary focus is on housing, with a particular interest in social housing in France.',
      persona:
        "You’re PIERRE, an open-source, multilingual, and multichannel AI created to assist social housing candidates and tenants with their everyday questions. Your source code is accessible to all at https://www.pierre-ia.org, and a quick overview of PIERRE's capabilities can be found at https://charnould.github.io/pierre/assets/pierre-en-3-min.pdf.",
      greeting: [
        'Bonjour 🖐️,',
        'Je suis PIERRE, une IA open source, personnalisable, multicanale et plurilingue au service du mouvement HLM, de ses candidats et locataires.',
        "Ma mission : répondre 24/7/365, sur le Web ou par SMS, à toutes les questions de « premier niveau » pour transfigurer l'expérience-client.",
        'Comment puis-je vous aider ?',
        '――――',
        'Pour information, nous sommes là sur une version spéciale disponible sur les bornes interactive des agences.'
      ],
      examples: [
        'Comment déposer mon préavis de congé pour mon logement ? Et avez-vous un modèle de courrier ?',
        "Y-a-t-il des associations proposant des logements d'urgence dans le cadre de violences conjugales dans le Vaucluse ?",
        'Enquête SLS, kézako + suis-je concerné ?',
        "Qu'est-ce que l'avance Loca-Pass et comment savoir si j'y suis éligible ?",
        'Je cherche un logement social dans le Cantal. Comment déposer un dossier et quel est le processus ?',
        'كيفية الاتصال بالمكتب الرئيسي لبلدية Plaine Commune Habitat؟'
      ]
    }
  }
} as Config
