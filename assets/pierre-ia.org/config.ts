import type { Config } from '../../utils/_schema'

//
// ASTUCE
// Pour vous assurer que le fichier de configuration est correctement
// paramétré, lancer dans votre terminal `bun test:config`
//

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
  // model: "openai('gpt-4o-2024-11-20')",
  model: "openai('gpt-4o-mini-2024-07-18')",

  // Le numéro de téléphone qui permet d'utiliser PIERRE via SMS.
  // Assurez-vous de bien respecter le format (`00` au début).
  // Renseigner `null` si vous n'avez pas paramétré de numéro.
  phone: '0033939070074',

  // Les personnalités et habillages que PIERRE peut adopter.
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
      //
      // Pour vous connecter la première fois, saississez `admin@pierre-ia.org` et la valeur de
      // la variable d'environnement `AUTH_PASSWORD`, puis créer des utilisateurs.
      protected: false,

      // Quelles connaissances peut utiliser le contexte
      // `default` lorsqu'il génère ses réponses ?
      knowledge: {
        // `community` correspond aux connaissances en open data de PIERRE.
        // Il s'agit de connaissances générales sur les HLM. En principe, `community`
        // doit toujours être `true` pour répondre en qualité aux questions.
        community: true,

        // `proprietary` correspond aux connaissances propres à un organisme HLM, qu'il
        // ne souhaite pas partager avec `community` et qu'il gère en son nom propre.
        // Ces connaissances peuvent être :
        //   - `public`, c'est-à-dire des données que l'organisme souhaite néanmoins
        //      rendre publiques aux candidats ou locataires accédant au contexte
        //      (ex : les coordonnées des gardiens, agences de proximité, etc.)
        //   - `private` (ex : une procédure d'astreinte au seul usage des équipes).
        //      En toute logique, si `proprietary.private` est `true`, `protected`
        //      doit aussi être `true`.
        proprietary: { public: false, private: false }
      },

      // Une information qui n'est pas visible par l'utilisateur,
      // mais qui permet à PIERRE de savoir dans quel contexte il
      // lui faut considérer les interactions/échanges.
      audience:
        'The user’s primary focus is on housing, with a particular interest in social housing in France.',

      // Une information qui n'est pas visible par l'utilisateur, mais qui permet
      // à PIERRE de savoir qui il est et comment se comporter.
      persona:
        "You’re PIERRE, an open-source, multilingual, and multichannel AI created to assist social housing candidates, tenants and employees with their everyday questions. Your source code is accessible to all at https://www.pierre-ia.org, and a quick overview of PIERRE's capabilities can be found at https://charnould.github.io/pierre/assets/PIERRE-Présentation.pdf.",

      // Le message qui s'affiche par défaut dans l'interface www de PIERRE.
      greeting: [
        'Bonjour 🖐️,',
        'Je suis PIERRE, une IA open source, personnalisable, multicanale et plurilingue au service du mouvement HLM, de ses candidats, locataires et collaborateurs.',
        "Ma mission : répondre 24/7/365, sur le Web ou par SMS, à toutes les questions de « premier niveau » pour transfigurer l'expérience-client, ou des questions plus complexe pour améliorer l'expérience-collaborateur.",
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
        'كيفية الاتصال بالمكتب الرئيسي لبلدية Grand Dijon Habitat؟'
      ],

      // Une mention qui s'affiche à la fin de chaque réponse de l'IA.
      // Pour ne pas afficher de mention, indiquer `null`.
      disclaimer: 'Une IA peut se tromper. Vérifiez les informations importantes.'
    },

    // Une seconde personnalité.
    // Vous pouvez dupliquer cette objet pour créer autant de personnalités
    // que nécessaire. Vous pouvez nommer cette personnalité par n'importe
    // quelle chaine de caractères (ici `team`). A l'inverse, vous pouvez
    // supprimer `team` et plus bas `en_agence` si vous n'avez pas usage
    // de personnalités complémentaires.
    team: {
      protected: false,
      knowledge: {
        community: true,
        proprietary: { public: true, private: true }
      },
      audience:
        'The user is an employee of Pierre Habitat, a fictional social housing company operating in France.',
      persona:
        'You are PIERRE, the ultimate AI assistant, expertly designed to support all collaborators at Pierre Habitat (a fictional social housing company operating around Dijon, France) in their day-to-day tasks. With an extensive knowledge of social housing, regulations, and internal processes, you’re here to streamline workflows, provide accurate information, and deliver efficient solutions. Always up-to-date and fully aligned with the company’s values, GUSTAVE is the dependable, knowledgeable coworker that everyone can rely on.',
      greeting: [
        'Bonjour 🖐️,',
        "Je suis PIERRE, l'assistant des collaborateurs de Pierre Habitat, un bailleur social fictif.",
        'Ma mission : donner à voir comment une IA peut aider les collaborateurs des bailleurs sociaux au quotidien.',
        'Choisissez un exemple ci-dessous.',
        '――――',
        "Pour info., je peux apprendre en quelques secondes tout ce qu'il a à savoir de vos fichiers Word et Excel."
      ],
      examples: [
        "Qui est d'astreinte la semaine du 25 février prochain ?",
        'Quelle est la procédure si un locataire est bloqué dans un ascenseur ?',
        'Qui est le prestataire ascenseur de la résidence Becquerel ?',
        'Un locataire me demande comment régler un problème de voisinnage, rédige moi un email.',
        "Quels impacts du PACS lorsqu'un locataire veut rompre son contrat de bail ?"
      ],
      disclaimer: "Les données retournées par l'IA sont ici strictement fictives."
    },
    //
    // Une troisième personnalité.
    en_agence: {
      protected: true,
      knowledge: {
        community: true,
        proprietary: { public: false, private: false }
      },
      audience:
        'The user’s primary focus is on housing, with a particular interest in social housing in France.',
      persona:
        "You’re PIERRE, an open-source, multilingual, and multichannel AI created to assist social housing candidates, tenants and employees with their everyday questions. Your source code is accessible to all at https://www.pierre-ia.org, and a quick overview of PIERRE's capabilities can be found at https://charnould.github.io/pierre/assets/PIERRE-Présentation.pdf.",
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
        'كيفية الاتصال بالمكتب الرئيسي لبلدية Grand Dijon Habitat؟'
      ],
      disclaimer: null
    }
  }
} as Config
