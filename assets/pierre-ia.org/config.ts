import type { Config } from '../../utils/_schema'

export default {
  // Doit être à la fois le nom de domaine avec extension du bailleur
  // (ex. icfhabitat.fr) et le nom du dossier dans `assets/`
  id: 'pierre-ia.org',

  // Le modèle de langage qu'utilise PIERRE pour générer les réponses.
  // Ci-dessous, des exemples non-exhaustifs de modèles utilisables
  // (il est impératif que la clef d'API correspondante soit renseignée
  // dans les variables d'environnement).
  // - cohere('command-r-plus')"
  // - mistral('mistral-large-latest')
  // - mistral('mistral-small-latest')
  // - google('gemini-1.5-pro-latest')
  // - google('gemini-1.5-flash-latest')
  // - anthropic('claude-3-5-sonnet-20241022')
  // - anthropic('claude-3-5-sonnet-20240620')
  // - anthropic('claude-3-opus-20240229')
  // - anthropic('claude-3-haiku-20240307')
  // - openai('gpt-4o-mini-2024-07-18')...
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
    // quelle chaine de caractères (ici `en_agence`).
    en_agence: {
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
        "Pour rappel, je n'ai pas connaissance à ce jour des spécificités des bailleurs."
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
