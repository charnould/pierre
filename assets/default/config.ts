/* DÉBUT : ** NE PAS MODIFIER */
/* oxlint-disable */
import { createHuggingFace } from '@ai-sdk/huggingface'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createCerebras } from '@ai-sdk/cerebras'
import { createCohere } from '@ai-sdk/cohere'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createGroq } from '@ai-sdk/groq'
import { createMistral } from '@ai-sdk/mistral'
import { createOpenAI } from '@ai-sdk/openai'
import { createTogetherAI } from '@ai-sdk/togetherai'
import type { Config } from '../../utils/_schema'

const groq = createGroq()
const cohere = createCohere()
const openai = createOpenAI()
const mistral = createMistral()
const cerebras = createCerebras()
const anthropic = createAnthropic()
const togetherai = createTogetherAI()
const huggingface = createHuggingFace()
const google = createGoogleGenerativeAI()
/* oxlint-enable */
/* FIN : ** NE PAS MODIFIER */

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
      format: ({ custom_data, content, role }) => ({
        client_id: custom_data[0],
        date: Date.now(),
        content,
        role
      })
    }
  ],

  // Le modèle de langage utilisé par PIERRE pour générer la réponse finale.
  // Il est impératif que la clef d'API correspondantes soit renseignée dans
  // les variables d'environnement.
  //
  // Voir https://github.com/charnould/pierre?tab=readme-ov-file#modèles-de-langage-ou-llm
  // pour plus d'informations sur les modèles de langage utilisés par PIERRE et
  // leur fonction, et leurs disponibilités.
  //
  // Consulter https://ai-sdk.dev/docs/foundations/providers-and-models pour choisir
  // le modèle de langage le plus pertinent.
  //
  //
  models: {
    // Le modèle utilisé pour augmenter/enrichir les requêtes de l'utilisateur.
    // Nous recommandons `qwen/qwen3-32b` via le moteur d'inférence Groq (https://groq.com/).
    // avec les paramétrages suivants. L'objectif ici est de disposer d'un modèle
    // efficient et rapide.
    augment_with: {
      model: groq('qwen/qwen3-32b'),
      providerOptions: {
        groq: {
          reasoningFormat: 'raw',
          reasoningEffort: 'none',
          serviceTier: 'auto'
        }
      }
    },
    // Le modèle utlisé par le reranker qui s'assure que les éléments de
    // réponses retournés par les bases de connaissances sont pertinents.
    // Nous recommandons `qwen/qwen3-32b` via le moteur d'inférence Groq (https://groq.com/).
    // avec les paramétrages suivants. L'objectif ici est de disposer d'un modèle
    // efficient et rapide.
    rerank_with: {
      model: groq('qwen/qwen3-32b'),
      providerOptions: {
        groq: {
          reasoningFormat: 'raw',
          reasoningEffort: 'default',
          serviceTier: 'auto'
        }
      }
    },

    // Le modèle qui génère les réponses en s'appuyant sur les éléments les plus
    // pertinents retournés par le reranker. Il est fortement recommandé de désactiver
    // le "reasoning" lors de la génération de la réponse finale pour réduire la latence.
    answer_with: {
      model: openai('gpt-4.1-mini'),
      providerOptions: {
        openai: {
          reasoningEffort: 'none',
          reasoningSummary: null
        }
      }
    }
  },

  //
  // Si `false` :
  //  - PIERRE sera accessible à 100 % des visiteurs sur internet.
  //  - Il s'agit du paramétrage à renseigner pour un chatbot accessible aux locataires.
  //
  // Si `true` :
  //  - PIERRE ne sera accessible qu'aux utilisateurs dûment habilités et connectés.
  //  - C'est le paramétrage à choisir pour restreindre l'usage, par exemple, aux collaborateurs.
  //
  // Pour vous connecter la première fois, saisissez `admin@pierre-ia.org` et
  // la valeur de la variable d'environnement `AUTH_PASSWORD`, puis créer des
  // utilisateurs.
  protected: false,

  // Quelles connaissances peut utiliser PIERRE lorsqu'il génère ses réponses ?
  knowledge: {
    // Astuce : Si vous renseignez `false` pour l'ensemble des connaissances
    // ci-dessus, PIERRE se comportera comme un simple wrapper autour d'un LLM,
    // sans base de connaissances. Les réponses seront quasi instantanées, mais
    // le risque d'hallucinations important.

    // Il est fortement recommandé de renseigner `location` selon le format ci-dessous.
    // Cette information est injectée dans les prompts afin que l’IA sache dans quel
    // territoire se situe l’utilisateur. Sans cette précision, l’IA ne peut pas
    // déduire la localisation concernée : par exemple, à la question « Quelles
    // sont les associations d’aide au logement dans la région ? », elle ne
    // saura pas s’il s’agit de la région PACA, de l’Occitanie ou d’une autre.
    // Indiquer `null` pour ne pas fournir cette information.
    location: null, // 'Gers (32) en région Occitanie'

    // `community` correspond aux connaissances en open data de PIERRE. Il
    // s'agit de connaissances générales sur les HLM. En principe, `community`
    // doit toujours être `true` pour répondre en qualité aux questions.
    community: true,

    // `proprietary` correspond aux connaissances propres à un organisme HLM,
    // qu'il ne souhaite pas partager avec `community` et qu'il gère en son
    // nom propre.
    proprietary: false
  },
  // Le message qui s'affiche par défaut dans l'interface de PIERRE.
  greeting: [
    'Bonjour 🖐️,',
    'Je suis PIERRE, une intelligence artificielle open source, personnalisable et plurilingue au service du mouvement HLM, de ses candidats, locataires et collaborateurs.',
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
