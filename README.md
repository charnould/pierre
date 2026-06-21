# PIERRE – Agent IA HLM open source

> [!IMPORTANT]
> PIERRE est actuellement en version `0.40.x` (consulter les [releases](https://github.com/charnould/pierre/releases)) **(documentation à remanier suite au passage en `0.40.x`)**. La **qualité de la base de connaissances est estimée à `20 %`** — elle s'améliore en continu grâce aux contributions du mouvement HLM. En cas de difficultés, créer une `issue` ou envoyer un email à charnould@pierre-ia.org.
>
> PIERRE ne connaît pas les spécificités de votre organisme (taille du parc, coordonnées des agences, procédures internes…). **Ces éléments peuvent lui être enseignés en quelques secondes.**

## Qu'est-ce que PIERRE ?

PIERRE est un **agent IA open source** et **plurilingue** au service du mouvement HLM, de ses candidats, locataires et collaborateurs.

Plus concrètement, PIERRE c'est à la fois :

1. Un **agent IA open source** qui répond 24/7/365 aux questions de premier niveau des locataires et demandeurs HLM, et épaule au quotidien les collaborateurs des bailleurs sociaux (processus, données patrimoniales, aide à la rédaction, etc.).

2. Une **base de connaissances** en **open data** ([consultation](./knowledge/community)), utilisable indépendamment de l'agent IA et indispensable à toute [IA agentique](https://fr.wikipedia.org/wiki/Intelligence_artificielle_agentique).

## Sommaire

<!-- toc -->

- [Les bases de connaissances de PIERRE](#les-bases-de-connaissances-de-pierre)
  - [Deux bases, deux usages](#deux-bases-deux-usages)
  - [Pourquoi c'est important ?](#pourquoi-cest-important)
  - [Contribuer à la base de connaissances communautaire](#contribuer-%C3%A0-la-base-de-connaissances-communautaire)
    - [Qu'est-ce que contribuer à la base de connaissances communautaire ?](#quest-ce-que-contribuer-%C3%A0-la-base-de-connaissances-communautaire)
    - [Thématiques couvertes par la base de connaissances communautaire](#th%C3%A9matiques-couvertes-par-la-base-de-connaissances-communautaire)
    - [Comment y contribuer concrètement ?](#comment-y-contribuer-concr%C3%A8tement)
- [Enrichir votre instance de PIERRE avec vos connaissances propriétaires](#enrichir-votre-instance-de-pierre-avec-vos-connaissances-propri%C3%A9taires)
- [Architecture et fonctionnement technique](#architecture-et-fonctionnement-technique)
  - [Sécurité, confidentialité & RGPD](#s%C3%A9curit%C3%A9-confidentialit%C3%A9--rgpd)
  - [Contribuer au code source](#contribuer-au-code-source)
  - [Technologies](#technologies)
  - [Vue d'ensemble technique](#vue-densemble-technique)
  - [Isolation par conversation : les smolVMs](#isolation-par-conversation--les-smolvms)
  - [Le flux de streaming (NDJSON)](#le-flux-de-streaming-ndjson)
  - [Déploiement : Kamal + Docker](#d%C3%A9ploiement--kamal--docker)
  - [Modèles de langage (BYOK)](#mod%C3%A8les-de-langage-byok)
  - [Télémétrie](#t%C3%A9l%C3%A9m%C3%A9trie)
  - [Les coûts associés à l'usage de PIERRE](#les-co%C3%BBts-associ%C3%A9s-%C3%A0-lusage-de-pierre)
- [Comment déployer PIERRE ?](#comment-d%C3%A9ployer-pierre)
  - [Prérequis](#pr%C3%A9requis)
  - [Faire héberger PIERRE (le plus simple)](#faire-h%C3%A9berger-pierre-le-plus-simple)
  - [Héberger PIERRE (self-hosting)](#h%C3%A9berger-pierre-self-hosting)
    - [Faire fonctionner PIERRE en local en 5 minutes](#faire-fonctionner-pierre-en-local-en-5-minutes)
    - [Déployer pour la première fois PIERRE sur un serveur de production](#d%C3%A9ployer-pour-la-premi%C3%A8re-fois-pierre-sur-un-serveur-de-production)
    - [Redéployer PIERRE sur un serveur de production](#red%C3%A9ployer-pierre-sur-un-serveur-de-production)
    - [Déployer et redéployer PIERRE sur un serveur de tests](#d%C3%A9ployer-et-red%C3%A9ployer-pierre-sur-un-serveur-de-tests)
- [Modifier et paramétrer PIERRE (self-hosting)](#modifier-et-param%C3%A9trer-pierre-self-hosting)
  - [Modifier l'interface de l'agent IA](#modifier-linterface-de-lagent-ia)
  - [Modifier la personnalité de l'agent IA](#modifier-la-personnalit%C3%A9-de-lagent-ia)
    - [Demander à l'agent IA de citer ses sources](#demander-%C3%A0-lagent-ia-de-citer-ses-sources)
  - [Installer PIERRE sur votre site web](#installer-pierre-sur-votre-site-web)
    - [Via une fenêtre modale](#via-une-fen%C3%AAtre-modale)
    - [Via une iframe](#via-une-iframe)
- [Administrer PIERRE avec une interface graphique](#administrer-pierre-avec-une-interface-graphique)
  - [Ajouter des connaissances depuis l'interface](#ajouter-des-connaissances-depuis-linterface)
  - [Automatiser l'upload des connaissances via cURL](#automatiser-lupload-des-connaissances-via-curl)
- [Application desktop Windows et macOS (alpha/not-prod-ready)](#application-desktop-windows-et-macos-alphanot-prod-ready)
- [Licence](#licence)

<!-- tocstop -->

# Les bases de connaissances de PIERRE

PIERRE n'est pas seulement un agent IA branché sur un modèle de langage. Son intérêt vient d'abord de ses **bases de connaissances** : un ensemble de documents structurés qu'un agent peut lire, comparer et citer pour répondre aux questions des locataires, demandeurs et collaborateurs.

Cette base est volontairement simple : ce sont des fichiers lisibles, versionnables et améliorables. Plus ils sont clairs, plus PIERRE répond juste.

## Deux bases, deux usages

PIERRE distingue deux familles de connaissances :

| Base                   | Contenu                                                                                                                                                | Usage                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| **Base communautaire** | Connaissances utiles à l'ensemble du mouvement HLM : demande de logement social, SLS, charges, vie du bail, associations, histoire du logement social… | Mutualiser un socle commun, améliorable par tous.                       |
| **Base propriétaire**  | Données propres à un organisme : procédures internes, coordonnées d'agences, politiques locales, consignes métier, données patrimoniales…              | Adapter PIERRE à votre contexte sans publier vos informations internes. |

## Pourquoi c'est important ?

Un modèle de langage généraliste ne connaît ni vos agences, ni vos règles internes, ni vos arbitrages locaux. PIERRE devient utile lorsqu'il peut accéder à des documents fiables, à jour et compréhensibles.

Concrètement, enrichir la base de connaissances (communautaire ou propriétaire) permet à PIERRE de répondre à des questions comme :

- "Quel service contacter pour une réclamation de charges ?"
- "Quelle est notre procédure interne en cas de trouble du voisinage ?"
- "Comment expliquer simplement le supplément de loyer de solidarité ?"
- "Quel modèle de courrier utiliser dans cette situation ?"

## Contribuer à la base de connaissances communautaire

### Qu'est-ce que contribuer à la base de connaissances communautaire ?

La base de connaissances (consultable [ici](https://github.com/charnould/pierre/tree/master/knowledge/)) est le **coeur de l'intelligence de PIERRE**. Ce n'est ni plus ni moins que des fichiers texte transformés. Par exemple, [ce fichier](./knowledge/global/Vie%20du%20bail/Les%20enquêtes-locataires.md) contient tout ce que sait PIERRE sur les enquêtes locataires.

Ce document peut être incomplet ou imprécis — **c'est tout l'enjeu que de l'améliorer**, car c'est lui qu'utilise PIERRE pour répondre aux questions sur ces sujets.

Contribuer à la base de connaissances, c'est donc simplement : (1) améliorer le contenu des fichiers existants et (2) créer des fichiers sur les thématiques manquantes.

### Thématiques couvertes par la base de connaissances communautaire

La base de connaissances — co-construite avec les bailleurs — couvre plusieurs thématiques :

- `Connaissances générales` : connaissances génériques applicables sur tout le territoire (ex : comment gérer un trouble du voisinage ? qu'est-ce que les charges locatives ?).
- `Spécificités locales` : connaissances spécifiques à un territoire donné (ex : les associations d'hébergement d'urgence dans l'Ain, les structures d'aide contre les violences conjugales dans l'Eure).
- `Organismes HLM` : connaissances relatives à un organisme en particulier (ex : qu'est-ce que Grand Dijon Habitat et quelles sont les coordonnées de ses agences ?).
- `Wikipédia` : connaissances importées de Wikipédia (ex : l'histoire du logement social).

### Comment y contribuer concrètement ?

1. Consulter la [base de connaissances](https://github.com/charnould/pierre/tree/master/knowledge/).
2. Si vous identifiez un manque, une imprécision ou une erreur : envoyer un email à charnould@pierre-ia.org ou créer une `issue` sur GitHub (pour les connaisseurs).

Au fur et à mesure de l'amélioration de la base de connaissances, la pertinence de PIERRE s'améliore automatiquement et profite à l'ensemble du mouvement HLM.

# Enrichir votre instance de PIERRE avec vos connaissances propriétaires

Il y a deux façons d'enrichir une instance de PIERRE avec vos données propriétaires : (i) via l'interface d'administration ou (ii) [programmatiquement via cURL](#automatiser-lupload-via-curl). PIERRE accepte aujourd'hui les fichiers Word, Excel et Markdown ; les autres formats ne sont pas gérés à ce stade.

Pour que l'ingestion fonctionne correctement, les fichiers doivent être accompagnés d'un `_metadata.xlsx`. Ce fichier indique à PIERRE comment importer chaque document et quels profils-utilisateurs peuvent y accéder.

Le détail opérationnel est volontairement conservé dans un guide dédié : [préparer vos documents pour PIERRE](./docs/guides/prepare-your-docs/index.md). C'est le document à transmettre aux équipes-métier avant une première campagne d'alimentation documentaire.

# Architecture et fonctionnement technique

## Sécurité, confidentialité & RGPD

PIERRE est pensé pour être hébergé sur l'infrastructure choisie par l'organisme HLM ou par **pierre-ia.org**. Les données propriétaires, les contenus extraits et les conversations sont uniquement stockés sur l'instance déployée. Lorsqu'un utilisateur interroge PIERRE, le contenu nécessaire à la réponse peut être transmis au modèle de langage configuré/choisi par l'organisme.

Les questions RGPD, DPO, localisation des données, rôles de responsabilité et traitements associés sont détaillés dans la note dédiée : [Data Protection Officer](./docs/guides/data-protection-officer/index.md).

## Contribuer au code source

Pour contribuer au code source, créer une `issue` dans GitHub et suivre les us et coutumes des projets open source. Les `releases` de PIERRE [sont consultables ici](https://github.com/charnould/pierre/releases).

## Technologies

| Composant                   | Technologie                                                                               |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| Runtime                     | [Bun](https://bun.sh) (MIT)                                                               |
| Framework                   | [Hono](https://hono.dev) (MIT)                                                            |
| Agent IA (« Harness »)      | [Pi](https://pi.dev) (MIT)                                                                |
| Isolation des conversations | [smol machines](https://smolmachines.com/), micro-VMs via KVM (Apache-2.0)                |
| Base de données             | SQLite via `bun:sqlite` (Public Domain)                                                   |
| Déploiement                 | [Kamal](https://kamal-deploy.org) (MIT) via [Docker](https://www.docker.com) (Apache-2.0) |
| LLM                         | BYOK — OpenAI / OpenAI-compatible / Anthropic                                             |

## Vue d'ensemble technique

L'application sert l'interface web, isole chaque conversation dans une micro-VM, monte la base de connaissances autorisée dans cette VM, puis laisse l'agent explorer les fichiers utiles avant de répondre.

Contrairement à un simple chatbot qui injecte un contexte fixe dans un LLM, PIERRE **raisonne, explore et lit des fichiers de façon autonome**. C'est cette capacité — lire dynamiquement les bonnes sources plutôt que tout envoyer aveuglément — qui lui permet de travailler sur des bases de connaissances importantes et de répondre à des questions complexes nécessitant de « raisonnner ».

```
Navigateur / Widget / Apps              VPS (production)
--------------------------              ----------------------------------------

                                        +-- Docker container ------------------+
+----------+   GET /ai                  |                                      |
|          | -------------------------> |  Hono (Bun)                          |
|  Client  |                            |    |                                 |
|          | <------------------------- |    |-- authenticate                  |
+----------+   NDJSON stream            |    |-- parse AIContext               |
               {t:"response", d:{...}}  |    |-- save user message (SQLite)    |
               {type:"reset"}            |    |-- streamChatAnswer()            |
               {t:"done", d:{...}}      |         |                            |
                                        |         v                            |
                                        |    streamCopilot()                   |
                                        |         |                            |
                                        +---------+----------------------------+
                                                  |
                                                  | JSONL stdin/stdout
                                                  v
                                        +-- smolVM (micro-VM) ----------------+
                                        |                                     |
                                        |  Pi                                 |
                                        |  (RPC mode)                         |
                                        |         |                           |
                                        |         |-- lit /knowledge/**       |
                                        |         |-- appelle le LLM (BYOK)   |
                                        |         |-- génére la réponse       |
                                        |                                     |
                                        |  /knowledge (volume monté)          |
                                        |  |-- Vie du bail/                   |
                                        |  |-- Charges locatives/             |
                                        |  |-- Données propriétaires          |
                                        |  |-- ...                            |
                                        +-------------------------------------+
```

## Isolation par conversation : les smolVMs

C'est une particularité important de l'architecture de PIERRE pour du « privacy by design ».

**Chaque conversation active dispose de sa propre micro-VM isolée** (via [smol machines](https://smolmachines.com/)). Concrètement :

1. À l'arrivée d'un premier message, PIERRE crée une micro-VM légère.
2. La base de connaissance applicable est **montée en lecture** à l'intérieur de la VM.
3. **Pi** est démarré en mode RPC (stdin/stdout JSONL) à l'intérieur de cette VM.
4. Un processus hôte (`PiRpcClient`) communique avec Pi via les flux stdin/stdout du sous-processus.
5. La conversation se déroule : Pi lit `AGENTS.md` (instructions système) et les fichiers de la base de connaissances, raisonne, et répond.
6. Après **30 minutes d'inactivité**, la VM est automatiquement détruite.

```
  Serveur hôte
  +------------------------------------------------------------------------------+
  |                                                                              |
  |   vm-registry (Map<convId, VmEntry>)                                         |
  |                                                                              |
  |   conversation_abc  -->  smolVM "conversation_abc"   PiRpcClient (stdin/stdout)   |
  |   conversation_def  -->  smolVM "conversation_def"   PiRpcClient (stdin/stdout)   |
  |   conversation_xyz  -->  smolVM "conversation_xyz"   PiRpcClient (stdin/stdout)   |
  |                                                                              |
  |   [timer 30min inactivité -> destroyVm()]                                    |
  |   [cleanup orphelins au démarrage]                                           |
  +------------------------------------------------------------------------------+
```

**Pourquoi cette approche ?**

| Propriété                      | Sans smolVM                | Avec smolVM                         |
| ------------------------------ | -------------------------- | ----------------------------------- |
| Isolation des conversations    | ✗ Contexte partagé         | ✓ VM étanche par conv.              |
| Fichiers accessibles à l'agent | Injectés manuellement      | Montés nativement dans `/knowledge` |
| Sécurité des écritures         | Aucune garantie            | Écritures bloquées hors `/tmp/`     |
| Session persistante            | Reconstituée à chaque tour | Conservée nativement dans Pi        |

## Le flux de streaming (NDJSON)

PIERRE ne retourne pas une réponse monolithique — il **streame** la réponse en temps réel vers le client. Le protocole utilisé est le **NDJSON** (Newline-Delimited JSON) : chaque événement est une ligne JSON terminée par `\n`.

```
Pi (VM)                 streamCopilot()           Navigateur
     |                         |                        |
     |  agent_start            |                        |
     | --------------------->  |                        |
     |  text_delta "Bon"       |   {t:"response",       |
     | --------------------->  | --  d:{content:"Bon"}} >
     |  text_delta "jour"      |   {t:"response",       |
     | --------------------->  | --  d:{content:"jour"}}>
     |  tool_start             |   {t:"reset"}          |
     | --------------------->  | ---------------------> |
     |  tool_start             |                        |
     | --------------------->  |   (log only)           |
     |  tool_result            |                        |
     | --------------------->  |   (log only)           |
     |  text_delta "Voici…"    |   {t:"response",       |
     | --------------------->  | --  d:{content:"…"}}  >|
     |  agent_end              |   {t:"done",           |
     | --------------------->  | --  d:{content:"…"}}  >|
```

## Déploiement : Kamal + Docker

PIERRE se déploie en une commande grâce à [**Kamal**](https://kamal-deploy.org/) qui orchestre Docker sur le VPS.

```
Machine locale                          VPS
--------------                          -------------------------------------

                                        +-- Kamal proxy (SSL/TLS + HTTP/2) --+
$ bun prod:deploy                       |   ^                                |
     |                                  |   | :443                           |
     |-- docker build (amd64)           |   |                                |
     |-- push -> registry local :5555   |   v                                |
     |-- kamal deploy ----------------> |  Docker container (PIERRE)         |
                                        |   |-- Bun runtime                  |
                                        |   |-- smolvm binary                |
                                        |   |-- /dev/kvm (nested virt.)      |
                                        |   |-- volume datastores/ (SQLite)  |
                                        +------------------------------------+
```

Kamal gère :

- Le **build Docker** en `amd64`
- Un **registry Docker local** sur le VPS (port `5555`)
- Le **proxy SSL automatique** (via Let's Encrypt) avec un timeout de 600s pour les longues requêtes IA
- Le **déploiement sans interruption** (_zero-downtime_) par swap de containers
- La **persistance des données** : le volume `datastores/` survit aux redéploiements

Il est possible de déployer **plusieurs instances** sur un même VPS (ex : production + staging).

## Modèles de langage (BYOK)

PIERRE fonctionne sur le principe du **« Bring Your Own LLM Key/Model »** : vous choisissez et fournissez votre propre modèle.

La configuration se fait dans `.env.production` :

```bash
AI_TYPE=openai
AI_BASE_URL=https://…
AI_MODEL=gpt-5.4
AI_API_KEY=sk-…
```

## Télémétrie

Afin de mesurer l'usage de PIERRE et comprendre quelles fonctionnalités sont utilisées, **chaque instance de PIERRE envoie automatiquement et silencieusement un ping anonyme à `pierre-ia.org`** à chaque interaction. Ce ping contient uniquement l'URL de l'instance (`HOST`) et le type d'événement — **aucune donnée personnelle, aucun contenu de conversation, rien**.

## Les coûts associés à l'usage de PIERRE

Déployer PIERRE sur un serveur génère des coûts :

- La location d'un serveur (VPS) : ~€45 par mois  
  Nul besoin de GPU, mais le serveur doit **impérativement** proposer la _nested virtualisation_.
- L'usage d'un LLM : environ $2,50 (_in_) et $15 (_out_) / MTokens

# Comment déployer PIERRE ?

## Prérequis

Avant de déployer PIERRE, vérifier que vous disposez de :

| Prérequis         | Détail                                                                   |
| ----------------- | ------------------------------------------------------------------------ |
| **Serveur**       | Linux, virtualisation imbriquée activée (`/dev/kvm` exposé au container) |
| **Ports ouverts** | `80` (HTTP) et `443` (HTTPS)                                             |
| **Accès SSH**     | Clef ou mot de passe                                                     |
| **Clé API LLM**   | OpenAI, Anthropic ou tout provider compatible OpenAI API                 |

> [!IMPORTANT]
> La **nested virtualisation** (virtualisation imbriquée) est la seule contrainte matérielle de PIERRE **(nul besoin de GPU)**. Elle est indispensable pour que les smolVMs puissent s'exécuter à l'intérieur du container Docker. La plupart des VPS la proposent en option ou nativement.

## Faire héberger PIERRE (le plus simple)

Si vous ne souhaitez pas gérer l'infrastructure, le projet PIERRE propose une **offre d'hébergement managé** :

- Déploiement clé en main sur serveur dédié
- Mises à jour automatiques (dernière version en permanence)
- Suivi et monitoring inclus
- Hébergement chez [Hetzner](https://www.hetzner.com/legal/legal-notice/) (Falkenstein, Allemagne - ISO 27001)
- Aucune compétence technique requise côté bailleur

Adresser un email à charnould@pierre-ia.org pour en savoir plus.

## Héberger PIERRE (self-hosting)

### Faire fonctionner PIERRE en local en 5 minutes

Les instructions ci-après sont valables sous **macOS** et **Windows** (via WSL — [sous-système Windows pour Linux](https://learn.microsoft.com/fr-fr/windows/wsl/install)).

1. Installer `Bun` (≥ `1.3.13`) et vérifier sa bonne installation ([instructions](https://bun.sh/docs/installation)).
2. Installer `SQLite3` et vérifier sa bonne installation ([instructions](https://www.sqlite.org/download.html)).
3. Installer `smol machines` (micro-VM isolées) et vérifier sa bonne installation ([instructions](https://smolmachines.com/)).
4. Forker/cloner le présent dépôt.
5. Lancer `bun install` dans votre terminal pour installer les dépendances.
6. Renommer le fichier `.env.example` en `.env.production` et le compléter.
7. Lancer `bun dev` pour démarrer PIERRE.
8. PIERRE est accessible à http://localhost:3000.

### Déployer pour la première fois PIERRE sur un serveur de production

Pour déployer PIERRE sur un serveur, il est indispensable d'être parvenu à le faire fonctionner en local.

1. Installer `Docker Desktop` et le lancer ([instructions](https://www.docker.com/products/docker-desktop/)). `Docker` gérera la conteneurisation.
2. Lancer `gem install kamal` pour installer `Kamal` (≥`2.11.0`) qui gérera le déploiement ([instructions](https://kamal-deploy.org/docs/installation/)).
3. Disposer d'un VPS et être en capacité de s'y connecter via `ssh` (avec une clef ou mot de passe). Les ports `80` (`http`) et `443` (`https`) doivent impérativement être ouverts.
4. Finaliser les modifications du fichier `.env.production` que vous avez créé précédemment.
5. Saisir dans votre terminal `bun prod:setup`.
6. PIERRE est accessible à l'adresse URL de votre serveur (prévoir quelques minutes pour la génération des certificats SSL).
7. Étapes suivantes (optionnelles et décrites ci-dessous) :  
   – Créer une seconde instance (de tests) de PIERRE sur le même serveur  
   – Personnaliser PIERRE  
   – Afficher PIERRE sur votre site internet, extranet-locataire ou intranet

### Redéployer PIERRE sur un serveur de production

PIERRE — et notamment sa base de connaissances — évolue régulièrement et suit la convention `semver`. Pour le mettre à jour :

1. Saisir `bun pierre:version` pour connaître la dernière version disponible.
2. Consulter les [releases](https://github.com/charnould/pierre/releases) pour connaître les modifications et éventuels _breaking changes_.
3. Mettre à jour votre fork/clone.
4. Saisir `bun pierre:config` pour vous assurer que `config.ts` est correctement paramétré.
5. Saisir `bun prod:deploy` dans votre terminal pour redéployer.

### Déployer et redéployer PIERRE sur un serveur de tests

Pour tester en conditions réelles les mises à jour et nouveautés de PIERRE, le plus simple est de **déployer une seconde instance** de PIERRE sur votre serveur de production.

1. Dupliquer `.env.production` en `.env.staging` et le modifier (a priori uniquement `SERVICE` et `HOST`).
2. Lancer `bun staging:setup` pour déployer la première fois.
3. Lancer `bun staging:deploy` pour redéployer.

# Modifier et paramétrer PIERRE (self-hosting)

> [!NOTE]
> Dans les instructions ci-dessous, nous considérons un bailleur social fictif nommé `Pierre Habitat` dont le site institutionnel est accessible à `pierre-habitat.fr` et qui a déployé sa propre version de PIERRE à l'adresse/IP `180.81.82.83`.

## Modifier l'interface de l'agent IA

<img src="docs/assets/images/personnalisation-de-pierre.webp" height="400">

1. Dans le répertoire `./customization/chatbot`, supprimer tous les répertoires à l'exception de `default` (vous pouvez modifier ou dupliquer `default`).
2. Créer une icône `system.svg` et remplacer la précédente dans `default`. Cette icône est celle qui apparaît dans l'interface de l'agent IA (au-dessus de « Bonjour 👋 »).
3. [Générer les icônes](https://www.pwabuilder.com/imageGenerator) qui permettront d'ajouter votre agent IA sur l'écran d'accueil des smartphones de vos utilisateurs et remplacer celles dans le dossier `icons` (les icônes Windows ne sont pas nécessaires). Conserver la structure du répertoire et le nommage des fichiers (automatique).
4. Modifier `config.ts` :  
   – `id` avec le nom exact du répertoire  
   – `greeting` qui est le message d'accueil de votre agent IA  
   – `examples` qui sont les exemples proposés après votre message d'accueil  
   – `disclaimer` qui est le message s'affichant après chaque réponse générée (ex : _Une IA peut se tromper, vérifier les informations._).
5. Modifier dans `manifest.json` :  
   – `short_name` par le nom souhaité de votre agent IA  
   – `start_url` par `https://180.81.82.83/?config=default` (ou par le nom du répertoire que vous avez créé)
6. Votre chatbot personnalisé est disponible à http://localhost:3000/?config=PIERRE-habitat.

> [!TIP]
> Pour vous assurer que `config.ts` est correctement paramétré, notamment lors des montées de version qui peuvent en modifier la structure, lancer `bun pierre:config`.

## Modifier la personnalité de l'agent IA

Si vous avez personnalisé visuellement votre agent IA (_cf._ supra), il affiche bien les icônes et les salutations de votre organisme, mais **il ne se présente pas encore comme l'agent IA de votre organisme** (essayez en lui demandant qui il est !). Pour modifier cela, modifier `AGENTS.md` (préférez l'anglais). Ce fichier suit la convention standard des systèmes agentiques : Pi le lit depuis son répertoire de travail (`/knowledge`) au démarrage de chaque VM.

### Demander à l'agent IA de citer ses sources

Pour que l'agent IA cite systématiquement ses sources dans ses réponses, ajouter dans `AGENTS.md` une instruction explicite (not working).

## Installer PIERRE sur votre site web

> [!IMPORTANT]
> Pour installer PIERRE sur votre site internet, il est indispensable de disposer d'une version fonctionnelle de PIERRE installée sur un VPS.

### Via une fenêtre modale

```html
<script crossorigin="anonymous" src="https://180.81.82.83/assets/dist/js/widget.js"></script>
<p
  id="pierre-ia"
  data-url="https://180.81.82.83"
  data-configuration="default"
  style="
        right: 20px;
        bottom: 20px;
        color: #000;
        font-size: 30px;
        font-weight: bold;
        padding: 2px 12px;
        background-color: #fff;
        border-radius: 8px;
        border: 4px solid black;
        box-shadow: 2px 2px 6px #00000080;"
>
  iA?
</p>
```

avec :

- `iA?` : le nom d'affichage du bouton (libre à vous de le modifier)
- `style` : le style CSS du bouton (libre à vous de le modifier)
- `180.81.82.83` dans l'URL du script le domaine/IP du serveur où le script est accessible
- `data-url` : le domaine/IP (sans slash de fin) du serveur où PIERRE est accessible
- `data-configuration` : `default` ou le nom du répertoire que vous avez créé plus tôt dans `./customization/chatbot` (_cf._ supra).

### Via une iframe

```html
<iframe
  id="PIERRE"
  title="PIERRE - l'IA de Mouvement HLM"
  style="..."
  width="450"
  height="620"
  src="http://180.81.82.83/?config=default"
>
</iframe>
```

avec :

- `style` : le style CSS de l'iframe (libre à vous de le modifier)
- `src` : l'URL d'accès à PIERRE

# Administrer PIERRE avec une interface graphique

Si vous hébergez PIERRE :

1. Rendez-vous à l'adresse https://180.81.82.83/a (à remplacer par votre domaine/IP).
2. Saisir (la première fois) `admin@pierre-ia.org` et le mot de passe contenu dans la variable d'environnement `AUTH_PASSWORD`.
3. Vous pouvez désormais créer autant d'utilisateurs que nécessaire (n'oubliez pas de transmettre les mots de passe !) qui pourront modifier les utilisateurs ou l'encyclopédie, consulter les conversations ou les statistiques.

## Ajouter des connaissances depuis l'interface

Depuis la page `Encyclopédie`, un administrateur peut ajouter les documents propriétaires de l'organisme. Cette action alimente la base de connaissances utilisée par PIERRE pour répondre selon vos procédures, vos coordonnées et vos consignes locales.

Avant le premier import, transmettre aux équipes concernées le guide [préparer vos documents pour PIERRE](./docs/guides/prepare-your-docs/index.md). Il détaille les formats acceptés, la structure attendue des fichiers Word/Excel/Markdown et le rôle du fichier `_metadata.xlsx`.

1. Se connecter à https://180.81.82.83/a, puis cliquer sur `Encyclopédie`.
2. Télécharger `_metadata.xlsx`, le compléter **scrupuleusement** et le ré-uploader avec les fichiers associés.
3. **Indispensable** : [Configurer](https://github.com/charnould/pierre/blob/master/assets/default/config.ts#L188) `config.ts` de manière à permettre l'utilisation des connaissances `proprietary` et le protéger s'il utilise des données privées.
4. Toutes les nuits aux alentours de 4h du matin, la base de connaissances est automatiquement reconstruite.

## Automatiser l'upload des connaissances via cURL

Cette option permet d'automatiser/programmer le processus d'upload documentaire — particulièrement utile si vos données changent souvent ou quotidiennement (ex : présence des collaborateurs).

```bash
curl -X POST https://URL/a/knowledge \
  -H "Authorization: Bearer AUTH_BEARER" \
  -H "Authorization-Context: cli" \
  -H "Accept: application/json" \
  -F "service=pierre" \
  -F "files[]=@Carnet du patrimoine.docx" \
  -F "files[]=@Cahier de consignes.xlsx"
```

avec :

- `URL` : l'URL de votre instance de PIERRE
- `AUTH_BEARER` : la variable d'environnement `AUTH_BEARER`
- `service` : la variable d'environnement `SERVICE`
- `files[]` : le ou les fichiers à uploader

> [!NOTE]
> La présence sur le serveur de `_metadata.xlsx` est toujours **indispensable**.

# Application desktop Windows et macOS (alpha/not-prod-ready)

PIERRE dispose d'une application desktop (Windows et macOS) [téléchargeable ici](https://github.com/charnould/pierre/releases/latest). Un lien de téléchargement est également disponible depuis la page d'accueil de l'interface d'administration.

> [!NOTE]
> **macOS** — Lors du premier lancement, macOS peut afficher un avertissement de sécurité car l'application n'est pas notarisée par Apple. Si vous voyez le message _"pierre est endommagé et ne peut pas être ouvert"_, exécutez la commande suivante dans le Terminal, puis relancez l'application :
>
> ```bash
> sudo xattr -rd com.apple.quarantine /Applications/pierre.app
> ```
>
> Vous pouvez également faire un clic droit sur l'application > **Ouvrir**, puis confirmer dans la boîte de dialogue, ou aller dans **Réglages système > Confidentialité et sécurité** et cliquer sur **Ouvrir quand même**.

> [!NOTE]
> **Windows** — Lors du premier lancement, Windows SmartScreen peut afficher _"Windows a protégé votre ordinateur"_. Cliquer sur **Informations complémentaires**, puis sur **Exécuter quand même**.

# Licence

Le code source du présent dépôt est sous licence [GNU Affero General Public License Version 3 (AGPL-3.0)](https://github.com/charnould/pierre/blob/master/LICENSE.md), complétée par une clause additionnelle de restriction commerciale en fin de fichier LICENSE.md. La base de connaissances (dossier `/knowledge`) est sous licence [Creative Commons BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).

Copyright (c) 2024-aujourd'hui, Charles-Henri Arnould/BECKREL (charnould@pierre-ia.org) et les contributeurs.
