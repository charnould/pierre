import dedent from 'dedent'
import type { Config } from '../../utils/_schema'

//
// ASTUCE : Pour vous assurer que le fichier de configuration est correctement
// paramétré, lancer dans votre terminal `bun pierre:config`
//

export default {
  // Doit être à identique au nom du dossier dans `assets/`
  id: 'default',

  // Le nom de la configuration telle que vous souhaitez qu'elle soit affichée
  // dans l'interface-utilisateur de PIERRE.
  display: 'PIERRE (défaut)',

  // Si vous paramétrez PIERRE de manière à ce qu'il dispose de plusieurs
  // configurations, vous pouvez choisir de n'afficher que certaines d'entre
  // elles dans l'interface. Par exemple, si vous avez une configuration pour
  // les candidats et une autre pour les équipes, vous pouvez choisir de
  // n'afficher que la configuration pour les candidats dans l'interface de
  // PIERRE.
  //
  // Si vous ne souhaitez pas utiliser cette fonctionnalité : show: []
  //
  // Ici, lorsque vous accédez à l'interface de PIERRE, vous pourrez accéder aux
  // configurations `default`, `demo_client` et `demo_team`.
  show: ['default', 'demo_client', 'demo_team'],

  // Vous pouvez communiquer des données externes à PIERRE via son URL avec le
  // paramétre de requête `data`. S'il y a plusieurs données, séparez-les par un
  // pipe (|). Ces données peuvent, après avoir été tranformées, être utilisées
  // dans un prompt. Par exemple, pour que PIERRE connaisse toujours le prénom
  // du locataire et son solde locataire.
  //
  // Ex : http://localhost:3000/?data=Luc|-7.12
  //
  // Si vous ne souhaitez pas utiliser cette fonctionnalité : custom_data: {}
  //
  // La fonction ci-après transforme les données communiquées via `data` en une
  // `string` customisable et compréhensible par un LLM.
  custom_data: {
    format: (data: string[]) => {
      return `${data[0]} a une solde locataire de ${data[1]} euros` // "Luc a un solde locataire de -7.12 euros"
    }
  },

  // Pour intégrer les conversations de PIERRE dans votre SI, vous pouvez le
  // connectez à vos API. Un webhook sera émis vers vos API à chaque message
  // adressé à PIERRE ou répondu par PIERRE. L'URL, la clef API et le format du
  // webhook sont définis ci-dessous.
  api: [
    // Si le webhook doit être adressé à plusieurs de vos API, dupliquer l'objet
    // ci-dessous.
    {
      // La clef API correspondante doit être renseignée dans vos variables
      // d'environnement. A ce jour, PIERRE autorise maximum 3 webhooks :
      // WEBHOOK_KEY_1, WEBHOOK_KEY_2 et WEBHOOK_KEY_3
      key: 'WEBHOOK_KEY_1',

      // L'URL à laquelle PIERRE envoie le webhook (ici un exemple)
      url: 'ex : https://api.ikos.com',

      // Le format des données envoyées par le webhook. Il peut notamment
      // inclure des `custom_data` permettant d'identifier le locataire (cf.
      // custom_data plus haut). Ne manipuler que l'objet retourné.
      // - custom_data: celles passée via le paramètre de requête `data`
      // - content : la question de l'utilisateur ou la réponse de PIERRE
      // - role : user (= utilisateur), assistant ou system (= PIERRE)
      format: ({ custom_data, content, role }) => {
        return {
          client_id: custom_data[0],
          date: Date.now(),
          content: content,
          role: role
        }
      }
    }
  ],

  // Les différents modèles de langage utilisés par PIERRE. Il est impératif que
  // la ou les clefs d'API correspondantes soient renseignées dans les variables
  // d'environnement.
  //
  // Voir
  // https://github.com/charnould/pierre?tab=readme-ov-file#modèles-de-langage-ou-llm
  // pour plus d'informations sur les modèles de langage utilisés par PIERRE et
  // leur fonction.
  //
  // Ci-après, une liste non-exhaustives de modèles utilisables :
  // - "cohere('command-r-plus')",
  // - "mistral('mistral-large-latest')",
  // - "mistral('mistral-small-latest')",
  // - "google('gemini-1.5-pro-latest')",
  // - "google('gemini-1.5-flash-latest')",
  // - "anthropic('claude-3-5-sonnet-20241022')",
  // - "anthropic('claude-3-5-haiku-20241022')",
  // - "openai('gpt-4o-2024-11-20')",
  // - "togetherai('meta-llama/Llama-3.3-70B-Instruct-Turbo')"
  // - "groq('llama-3.3-70b-versatile')"
  // - "groq('meta-llama/llama-4-maverick-17b-128e-instruct')"
  // - "cerebras('llama3.1-8b')"
  models: {
    // Le modèle utilisé pour augmenter/enrichir les requêtes de l'utilisateur.
    // Pour minimiser les coûts : openai('gpt-4o-mini-2024-07-18') ou
    // équivalent. Pour maximiser l'intelligence : openai('gpt-4o-2024-11-20')
    // ou équivalent.
    augment_with: "groq('llama-3.3-70b-versatile')",

    // Le modèle utlisé par le reranker qui s'assure que les éléments de
    // réponses retournés par les bases de connaissances sont pertinents. Il est
    // fortement recommandé d'utiliser `openai('gpt-4o-mini-2024-07-18')` ou un
    // modèle équivalent afin de maîtriser les coûts. Le reranker est en effet
    // consommateur de tokens.
    rerank_with: "openai('gpt-4o-mini-2024-07-18')",

    // Le modèle qui génère les réponses en s'appuyant sur les éléments les plus
    // pertinents retournés par le reranker. Pour minimiser les coûts :
    // openai('gpt-4o-mini-2024-07-18') ou équivalent. Pour maximiser
    // l'intelligence : openai('gpt-4o-2024-11-20') ou équivalent.
    answer_with: "openai('gpt-4.1-mini')"
  },

  // Le numéro de téléphone qui permet d'utiliser PIERRE via SMS. Assurez-vous
  // de bien respecter le format (`00` au début). Renseigner `null` si vous
  // n'avez pas paramétré de numéro.
  phone: '0033939070074',

  //
  // Si `false` :
  //  - PIERRE sera accessible à 100 % des visiteurs sur internet.
  //  - Il s'agit du paramétrage à renseigner pour un chatbot accessible aux
  //    candidats ou locataires.
  //
  // Si `true` :
  //  - PIERRE ne sera accessible qu'aux utilisateurs dûment habilités et
  //    connectés.
  //  - C'est le paramétrage à choisir pour restreindre l'usage - par exemple -
  //    aux collaborateurs.
  //
  // Pour vous connecter la première fois, saississez `admin@pierre-ia.org` et
  // la valeur de la variable d'environnement `AUTH_PASSWORD`, puis créer des
  // utilisateurs.
  protected: false,

  // Quelles connaissances peut utiliser PIERRE lorsqu'il génère ses réponses ?
  knowledge: {
    // `community` correspond aux connaissances en open data de PIERRE. Il
    // s'agit de connaissances générales sur les HLM. En principe, `community`
    // doit toujours être `true` pour répondre en qualité aux questions.
    community: true,

    // `proprietary` correspond aux connaissances propres à un organisme HLM,
    // qu'il ne souhaite pas partager avec `community` et qu'il gère en son nom
    // propre. Ces connaissances peuvent être :
    //   - `public`, c'est-à-dire des données que l'organisme souhaite néanmoins
    //      rendre publiques aux candidats ou locataires accédant à PIERRE (ex :
    //      les coordonnées des gardiens, agences de proximité, etc.)
    //   - `private` (ex : une procédure d'astreinte au seul usage des équipes).
    //      En toute logique, si `proprietary.private` est `true`, `protected`
    //      doit aussi être `true`.
    proprietary: { public: false, private: false }

    // Astuce : Si vous renseignez `false` pour l'ensemble des connaissances
    // ci-dessus, PIERRE se comportera comme un simple wrapper autour d'un LLM,
    // sans base de connaissances. Les réponses seront quasi instantanées, mais
    // le risque d'hallucinations important.
  },

  // Une information qui n'est pas visible par l'utilisateur, mais qui permet à
  // PIERRE de connaître son "rôle et sa voix".
  persona:
    "You are **PIERRE**, a multilingual, multichannel AI designed to support social housing applicants, tenants, and staff with their everyday questions. PIERRE is open-source, open-data, and open to community contributions. Its source code is publicly available at [pierre-ia.org](https://www.pierre-ia.org), and a quick overview of its features can be found in this [presentation](https://charnould.github.io/pierre/assets/PIERRE-Présentation.pdf). PIERRE has been cited in *'Intelligence Artificielle et logement social : les cas d’usage appliqués à la maîtrise d’ouvrage et au patrimoine'*, published in **Cahier Repère n°143** (February 2025, p.17) by [Union Sociale pour l’Habitat](https://www.union-habitat.org/centre-de-ressources/innovation-qualite-de-service/intelligence-artificielle-ia-et-logement-social).",

  // Une information qui n'est pas visible par l'utilisateur, mais qui permet à
  // PIERRE de savoir qui est son interlocuteur.
  audience:
    "The user's primary focus is on housing, with a particular interest in social housing in France.",

  // Une information qui n'est pas visible par l'utilisateur, mais qui permet à
  // PIERRE de savoir comment il doit se comporter lors des échanges. C'est ici
  // que l'on peut lui indiquer de faire des réponses plus ou moins longues.
  //
  // IMPORTANT : Il convient impérativement de conserver l'item n°3 qui vise à
  // minimiser les hallucinations et maximiser la pertinence.
  guidelines: dedent`
    
    Follow these principles to deliver helpful, accurate, and accessible responses:
    
    1. **Be Warm and Professional**
      - Begin with a friendly, respectful tone (e.g., "I'd be glad to help with that.").
      - Use inclusive, plain language appropriate for all literacy levels.
      - For emotional or urgent queries, acknowledge feelings first before providing information.
      
    2. **Clarify the Question**
      - Break complex queries into manageable parts.
      - Briefly define unfamiliar terms to support understanding.
      - If a question is ambiguous, respectfully ask for clarification before proceeding.
    
    3. **Answer Using Only the Given Reference Material**
      - Rely strictly on the **reference material below** and conversation history.
      - Do **not** make up information. If something is missing, acknowledge it honestly.
      - Avoid repeating points already addressed earlier.
    
    4. **Keep It Clear and Useful**
      - Focus on essential information and user needs.
      - Keep responses concise, well-organized, and practical.
      - Use headings, bullet points, or lists when it improves readability.
      - Include relevant resource links or contact information when available.
    
    5. **Provide Next Steps**
      - Offer clear guidance on what the user should do next.
      - Suggest relevant follow-up questions that might help the user further.
      - For complex issues, indicate when it would be appropriate to escalate to a human specialist.
    
    6. **Review for Clarity and Precision**
      - Make sure your answer is accurate, relevant, and easy to follow.
      - Remove unnecessary jargon or overly technical language.
      - For critical issues (eviction, safety concerns, legal matters), emphasize the importance of seeking official advice.
      `,

  // Le message qui s'affiche par défaut dans l'interface de PIERRE.
  greeting: [
    'Bonjour 🖐️,',
    'Je suis PIERRE, une intelligence artificielle open source, personnalisable, multicanale et plurilingue au service du mouvement HLM, de ses candidats, locataires et collaborateurs.',
    'Ma mission : répondre 24/7/365 à toutes les questions de « premier niveau » des candidats et locataires ou celles (plus complexes) des équipes.',
    "PS. Je n'ai pas connaissance à ce jour des spécificités des bailleurs."
  ],

  // Les exemples qui s'affichent par défaut dans l'interface de PIERRE.
  examples: [
    'Comment déposer mon préavis de congé pour mon logement ? Et avez-vous un modèle de courrier ?',
    "Y-a-t-il des associations d'entraide dans le cadre de violences conjugales dans le Vaucluse ?",
    'Enquête SLS, kézako + suis-je concerné ?',
    "Qu'est-ce que l'avance Loca-Pass et comment savoir si j'y suis éligible ?",
    'Je cherche un logement social dans le Cantal. Comment déposer un dossier et quel est le processus ?',
    'كيفية الاتصال بالمكتب الرئيسي لبلدية Grand Dijon Habitat؟'
  ],

  // Une mention qui s'affiche à la fin de chaque réponse de l'IA. Pour ne pas
  // afficher de mention, indiquer `null`.
  disclaimer: 'Une IA peut se tromper. Vérifiez les informations importantes.'
} as Config
