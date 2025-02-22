# PIERRE – L'IA open source du mouvement HLM

> [!IMPORTANT]
> PIERRE est actuellement en version `0.20.x` (consulter les [releases](https://github.com/charnould/pierre/releases)) avec une **qualité de base de connaissances estimée à `10 %`**. Par ailleurs, la documentation ci-dessous est en cours de rédaction. En cas de difficultés, créer une `issue` ou envoyer un email à charnould@pierre-ia.org.<br><br>PIERRE ne connait pas les spécificités des bailleurs (ex : taille des parcs, coordonnées des agences, procédures internes, etc.). **Ces éléments peuvent néanmoins lui être « enseignés en deux clics ».**

## PIERRE : kézako ?

PIERRE est une intelligence artificielle (IA) **open source**, **plurilingue** et **multicanale** au service du mouvement HLM, de ses candidats, locataires et collaborateurs.

Plus concrètement, PIERRE c'est à la fois :

1. Un **chatbot** (ou mieux : un **resolution bot**) **open source** — disponible sur le **Web** ([démonstration](https://pierre-ia.org)) et par **SMS** — qui répond 24/7/365 à 100 % des questions de « premier niveau » des locataires et demandeurs HLM, et épaule au quotidien les collaborateurs des bailleurs sociaux (processus, données patrimoniales, aide à la rédaction, etc.).

2. Une **base de connaissances** en **open data** ([consultation](./knowledge/community)), utilisable indépendamment du chatbot et indispensable à la mise en oeuvre de toutes approches « Retrieval Augmented Generation » ([RAG](https://en.wikipedia.org/wiki/Retrieval-augmented_generation)) via un LLM.

→ [Télécharger une présentation de PIERRE](./docs/assets/PIERRE-Présentation.pdf) (PDF · 2,7 Mo)

## Sommaire

<!-- toc -->

- [Contribuer à PIERRE](#contribuer-%C3%A0-pierre)
  - [Contribuer au code-source](#contribuer-au-code-source)
  - [Contribuer à la base de connaissances](#contribuer-%C3%A0-la-base-de-connaissances)
    - [Contribuer à « améliorer la base de connaissances » : kézako ?](#contribuer-%C3%A0-%C2%AB-am%C3%A9liorer-la-base-de-connaissances-%C2%BB--k%C3%A9zako)
    - [Thématiques couvertes par la base de connaissances](#th%C3%A9matiques-couvertes-par-la-base-de-connaissances)
    - [Concrétement comment contribuer ?](#concr%C3%A9tement-comment-contribuer)
- [Fonctionnement + architecture de PIERRE](#fonctionnement--architecture-de-pierre)
  - [Comment fonctionne PIERRE ?](#comment-fonctionne-pierre)
  - [Modèles de langage (ou LLM)](#mod%C3%A8les-de-langage-ou-llm)
  - [L'universel SMS pour les échanges de « premier niveau »](#luniversel-sms-pour-les-%C3%A9changes-de-%C2%AB-premier-niveau-%C2%BB)
  - [Technologies + Services](#technologies--services)
  - [Les coûts associés à l'usage de PIERRE](#les-co%C3%BBts-associ%C3%A9s-%C3%A0-lusage-de-pierre)
- [Comment déployer PIERRE ?](#comment-d%C3%A9ployer-pierre)
  - [Faire héberger PIERRE (le plus simple)](#faire-h%C3%A9berger-pierre-le-plus-simple)
  - [Héberger PIERRE (self-hosting)](#h%C3%A9berger-pierre-self-hosting)
    - [Faire fonctionner PIERRE en local](#faire-fonctionner-pierre-en-local)
    - [Déployer pour la première fois PIERRE sur un serveur de production](#d%C3%A9ployer-pour-la-premi%C3%A8re-fois-pierre-sur-un-serveur-de-production)
    - [Redéployer PIERRE sur un serveur de production](#red%C3%A9ployer-pierre-sur-un-serveur-de-production)
    - [Déployer et redéployer PIERRE sur un serveur de tests](#d%C3%A9ployer-et-red%C3%A9ployer-pierre-sur-un-serveur-de-tests)
- [Modifier et paramétrer PIERRE (self-hosting)](#modifier-et-param%C3%A9trer-pierre-self-hosting)
  - [Modifier l'interface du chatbot](#modifier-linterface-du-chatbot)
  - [Modifier la personnalité du chatbot](#modifier-la-personnalit%C3%A9-du-chatbot)
  - [Modifier le modèle de langage utilisé](#modifier-le-mod%C3%A8le-de-langage-utilis%C3%A9)
    - [Comment modifier le modèle de langage ?](#comment-modifier-le-mod%C3%A8le-de-langage)
    - [Quels modèles est-il possible d'utiliser ?](#quels-mod%C3%A8les-est-il-possible-dutiliser)
  - [Installer PIERRE sur votre site web](#installer-pierre-sur-votre-site-web)
    - [Via une fenêtre modale](#via-une-fen%C3%AAtre-modale)
    - [Via une iframe](#via-une-iframe)
  - [Paramétrer PIERRE pour l'utiliser par SMS](#param%C3%A9trer-pierre-pour-lutiliser-par-sms)
- [Administrer PIERRE avec une interface graphique](#administrer-pierre-avec-une-interface-graphique)
  - [Apprendre à PIERRE des connaissances (self-hosting)](#apprendre-%C3%A0-pierre-des-connaissances-self-hosting)
- [License](#license)

<!-- tocstop -->

# Contribuer à PIERRE

## Contribuer au code-source

Pour contribuer au code-source, créer une `issue` dans GitHub et suivre les us et coutumes des projets open source. Les `releases` de PIERRE [sont consultables ici](https://github.com/charnould/pierre/releases).

## Contribuer à la base de connaissances

### Contribuer à « améliorer la base de connaissances » : kézako ?

Lorsque l'on comprend [comment fonctionne](#fonctionnement--architecture-de-pierre) PIERRE, on comprend le rôle de la base de connaissances : elle est le **coeur de l'intelligence de PIERRE** et n'est — ni plus ni moins — que des fichiers-textes transformés. Par exemple, [ce fichier](./knowledge/global/Les%20enquêtes-locataires.md) contient tout ce que sait PIERRE sur les enquêtes-locataires.

Ce document peut être incomplet ou imprécis, et **c'est tout l'enjeu que de l'améliorer**, car c'est ce document qu'utilise PIERRE pour répondre aux questions sur ces sujets.

« Améliorer la base de connaissances », ce n'est donc que cela : (1) améliorer le contenu des fichiers-textes existants et (2) créer des fichiers-textes sur les thématiques manquantes.

### Thématiques couvertes par la base de connaissances

La base de connaissances — en co-construction avec les bailleurs — couvre plusieurs thématiques :

- `global` : les connaissances génériques qui s'appliquent uniformément sur tout le territoire (ex : comment gérer un trouble du voisinage ? qu'est-ce que les charges locatives ?).
- `local` : les connaissances spécifiques à un territoire donné (ex : les associations d'hébergement d'urgence dans l'Ain, les structures d'aide dans le cadre de violences conjugales dans l'Eure).
- `org` : les connaissances relatives à un organisme HLM en particulier (ex : qu'est-ce que Grand Dijon Habitat et quelles sont les coordonnées du service-client et des agences ?).
- `wikipedia` : des connaissances importées de Wikipédia (ex : l'histoire du logement social).

### Concrétement comment contribuer ?

1. Consulter la [base de connaissances](https://github.com/charnould/pierre/tree/master/knowledge/)
2. Et si vous identifiez un manque, une imprécision ou une erreur :  
   **Option A** : Adresser un email à charnould@pierre-ia.org  
   **Option B** : Créer une `issue` sur GitHub (pour les connaisseurs)

Au fur et à mesure de l'amélioration de la base de connaissances, la pertinence de PIERRE s'améliorera automatiquement et profitera à l'ensemble du mouvement HLM.

# Fonctionnement + architecture de PIERRE

## Comment fonctionne PIERRE ?

1. Un utilisateur pose une question à PIERRE via le web ou par SMS.
2. Une première passe de LLM/IA augmente la requête initiale.
3. Une deuxième passe de LLM/IA s'assure de la validité et sécurité de la requête initiale (ex : impossible d'insulter PIERRE ou d'adresser une question sans lien avec le logement).
4. La requête validée et augmentée est vectorisée, puis est utilisée pour interroger les bases de connaissances de PIERRE.
5. Les résultats retournés sont _rerankés_ par un LLM/IA pour ne conserver que les plus pertinents.
6. Une dernière passe de LLM/IA génère une réponse sur la base des résultats retournés, réordonnancés puis _rerankés_ des bases de connaissances.
7. La réponse est retournée quelques secondes plus tard à l'utilisateur via le web ou par SMS.
8. La conversation se poursuit jusqu'à satisfaction de l'utilisateur (goto 1).

> [!NOTE]
> On comprend ici aisément le rôle des bases de connaissances : **elles sont le coeur de l'intelligence de PIERRE** ou de toute IA mettant en oeuvre une approche « Retrieval Augmented Generation » ([RAG](https://en.wikipedia.org/wiki/Retrieval-augmented_generation)) via un LLM. Ces bases de connaissances sont [améliorables](#contribuer-%C3%A0-la-base-de-connaissances) et [personnalisables](#apprendre-%C3%A0-pierre-de-nouvelles-connaissances) ; et c'est simplissime !

## Modèles de langage (ou LLM)

PIERRE utilise — à ce jour — plusieurs (passes de) LLM dans cet ordre successif :

1. Un **modèle de génération de `textes`** qui transforme la requête de l'utilisateur en une « requête augmentée » (en utilisant des techniques de type HyDE ou Stepback). Par défaut, PIERRE utilise `gpt-4o-mini-2024-07-18` d'OpenAI.

2. Un **modèle de génération d'`embeddings`** qui transforme la « requête augmentée » en vecteurs de valeurs numériques qui sont ensuite utilisés pour rechercher les éléments de réponse les plus pertinents dans la base de connaissances de PIERRE. **À ce jour, ce modèle ne peut pas être modifié** (`text-embedding-3-large`). En conséquence, il est indispensable — lorsque l'on auto-héberge PIERRE — de disposer d'une clef d'API OpenAI.

3. À nouveau, un **modèle de génération de `textes`** programmé en **`reranker`** qui classifie les résulats retournés par les bases de connaissances pour ne conserver que les éléments les plus pertinents en regard de la question posée par l'utilisateur. Par défaut, PIERRE utilise `gpt-4o-mini-2024-07-18` d'OpenAI.

4. Un **modèle de génération de `textes`** qui génére les réponses textuelles aux utilisateurs en utilisant les éléments issus de (3). Par défaut, PIERRE utilise `gpt-4o-mini-2024-07-18` d'OpenAI.

Lorsque l'on auto-héberge PIERRE — et sur le principe du **« Bring Your Own LLM Key/Model »** (BYOK) — **il est possible de choisir le modèle utilisé** (Mistral, Anthropic, Cohere...) pour (1), (3) et (4) et ce, en modifiant le fichier de configuation (_cf._ infra).

## L'universel SMS pour les échanges de « premier niveau »

> [!NOTE]
> PIERRE propose à ce jour deux modalités d'interaction : `Text-to-Text` via le Web ([démonstration](https://pierre-ia.org)) ou par SMS, et `Voice-to-Text` sur smartphone. À court terme, PIERRE va également investiguer une interaction `Voice-to-Voice`.

En réponse au nouveau plan de numérotation mis en place par l'ARCEP en 2023 (avec l'introduction des numéros commerciaux 09 3x xx xx xx) et pour proposer aux entreprises une **solution universelle** pour converser avec leurs clients, les opérateurs téléphoniques français ont lançé en 2023 (déploiement opérationnel en octobre 2024) une nouvelle offre de SMS conversationnel à destination des entreprises (dite `Time2chat`) qui (i) permet de s'affranchir des plateformes propriétaires (WhatsApp, Telegram, Messenger, etc.) utilisées au maximum par 50 % de la population française et (ii) une instantanéité et délivrabilité exceptionnelles (100 % des téléphones disposent nativement du SMS).

Principales caratéristiques de `Time2chat` (en savoir plus via l'[ARCEP](https://af2m.org/sms-conversationnel-time2chat/) ou via [Orange](https://payservices.orange.com/fr/business-messaging/time2chat)) :

- Une **conversation** est une série de SMS entre une entreprise et un utilisateur.
- Elle dure maximum 24h et le nombre de SMS échangés durant cette période est illimité.
- Elle peut être initiée par l'entreprise ou l’utilisateur.

## Technologies + Services

- Language: `Typescript`/`Javascript`
- Framework: [`Hono`](https://github.com/honojs/hono) (with [`Bun`](https://github.com/oven-sh/bun) runtime)
- Database + Vectorstore: [`SQLite3`](https://sqlite.org) (extended with [`sqlite-vec`](https://github.com/asg017/sqlite-vec))
- Deployment: [`Kamal`](https://kamal-deploy.org) (with [`Docker`](https://www.docker.com))
- LLM: « Bring Your Own LLM Key/Model » (BYOK)
- SMS: `Time2Chat` via [`CM`](https://www.cm.com/fr-fr/)

## Les coûts associés à l'usage de PIERRE

Déployer PIERRE sur un serveur génére des coûts (minimes) :

- La location d'un serveur (par exemple `CX22` d'[Hetzner](https://www.hetzner.com/cloud/)) : env. €10 par mois.
- L'usage d'un LLM via une API, soit (sur la base d'OpenAI utilisée par défaut) :  
  – Génération de vecteurs : $0.13 / MTokens avec `text-embedding-3-large`  
  – Génération de textes : $0,15 (input) et $0,60 (output) / MTokens avec `gpt-4o-mini`
- (Optionnellement) Les conversations SMS :  
  – Location d'un numéro de téléphone : €10 par mois  
  – Envoi de SMS : €0.09 par conversation (= SMS illimités par fenêtre de 24h)

# Comment déployer PIERRE ?

## Faire héberger PIERRE (le plus simple)

Avantages :

- Ne jamais avoir à se soucier de serveurs et d'API.
- Bénéficier 24/7/365 de la dernière version.

Adresser un email à charnould@pierre-ia.org.

## Héberger PIERRE (self-hosting)

### Faire fonctionner PIERRE en local

Les instructions ci-après sont pour `Windows`+`WSL` (sous-système Windows pour Linux).

1. Installer `WSL` et vérifier sa bonne installation ([instructions](https://learn.microsoft.com/fr-fr/windows/wsl/install)).
2. Installer `Bun` (≥ `1.2.3`) et vérifier sa bonne installation ([instructions](https://bun.sh/docs/installation)).
3. Installer `SQlite3`([instructions](https://www.sqlite.org/download.html)).
4. Forker/cloner le présent dépôt.
5. Lancer `bun install` dans votre terminal pour installer les dépendances.
6. Renommer le fichier `.env.example` en `.env.production` et compléter le.
7. Lancer PIERRE avec `bun dev`.
8. Et voilà : PIERRE est accessible à http://localhost:3000 et répond à vos questions !

### Déployer pour la première fois PIERRE sur un serveur de production

Pour déployer PIERRE sur un serveur, il est indispensable d'être parvenu à le faire fonctionner en local.

1. Installer `Docker Desktop` et le lancer ([instructions](https://www.docker.com/products/docker-desktop/)). `Docker` gérera la conteneurisation.
2. Lancer `gem install kamal` pour installer `Kamal` (≥`2.5.0`) qui gérera le déploiement ([instructions](https://kamal-deploy.org/docs/installation/)).
3. Disposer d'un compte `GitHub` et [générer une clef](https://github.com/settings/tokens). `GitHub` sera le registre de conteneurs lors du déploiement.
4. Disposer d'un VPS (par exemple `CX22` d'[Hetzner](https://www.hetzner.com/cloud/)) et être en capacité de s'y connecter via `ssh` (avec une clef ou mot de passe).
5. Finaliser les modifications du fichier `.env.production` que vous avez créé précédemment.
6. Saississez dans votre terminal `bun --env-file=.env.production kamal setup` et patientez quelques minutes.
7. Et voilà, PIERRE est accessible à l'adresse IP de votre serveur.
8. Étapes suivantes (optionnelles et décrites ci-dessous) :  
   – Modifier vos DNS pour servir PIERRRE via un domaine  
   – Déployer PIERRE sur un second serveur de tests  
   – Personnaliser PIERRE  
   – Faire fonctionner PIERRE par SMS  
   – Afficher PIERRE sur votre site internet ou extranet-locataire

### Redéployer PIERRE sur un serveur de production

PIERRE — et notamment sa base de connaissances — évolue régulièrement et suit la convention `semver`. Pour le mettre à jour :

1. Saisir `bun pierre:version` pour connaitre la dernière version disponible.
2. Consulter les [releases](https://github.com/charnould/pierre/releases) pour connaitre les modifications et les éventuels _breaking changes_.
3. Mettre à jour votre fork/clone.
4. Saisir `bun pierre:config` pour vous assurer que `config.ts` est correctement paramétré.
5. Saisir `bun --env-file=.env.production kamal deploy` dans votre terminal (ou le raccourci `bun prod:deploy`).

### Déployer et redéployer PIERRE sur un serveur de tests

Pour tester en conditions réelles les mises à jour et nouveautés de PIERRE :

1. Disposer d'un **second** VPS et être en capacité de s'y connecter via `ssh` (avec une clef ou mot de passe).
2. Dupliquer `.env.production` en `.env.development` et modifier le (a priori uniquement l'IP).
3. Lancer `bun --env-file=.env.development kamal setup` pour déployer la première fois.
4. Lancer `bun --env-file=.env.development kamal deploy` pour redéployer (ou le raccourci `bun dev:deploy`).

> [!NOTE]
> Il est très fortement recommandé que les environnements de `production` et `development` aient le même système d'exploitation (Ubuntu, Debian, etc.) et la même architecture de processeur (x86).

# Modifier et paramétrer PIERRE (self-hosting)

> [!NOTE]
> Dans les instructions ci-dessous, nous considérons un bailleur social fictif nommé `Pierre Habitat` dont le site institutionnel est accessible à `pierre-habitat.fr` et qui a déployé sa propre version de PIERRE à l'adresse/IP `180.81.82.83`, et le scénario `en_agence`.

## Modifier l'interface du chatbot

<img src="docs/assets/images/personnalisation-de-pierre.webp" height="400">

1. Dans le répertoire `./assets`, dupliquer le dossier `pierre-ia.org` et le nommer `pierre-habitat.fr`. Les consignes suivantes s'appliquent à ce nouveau répertoire.
2. Supprimer les sous-répertoires `/dist`, `/fonts`, `/scripts`, `/tailwind`.
3. Créer une icône `system.svg` et remplacer la précédente. Cette icône est celle qui apparait dans l'interface du chatbot (au dessus de « Bonjour 👋 »).
4. [Générer les icônes](https://www.pwabuilder.com/imageGenerator) qui permettront d'ajouter votre chatbot sur l'écran d'accueil des smartphones de vos utilisateurs et remplacer celles dans le dossier `icons`. Conservez la structure du répertoire et le nommage des fichiers (automatique).
5. Modifier `config.ts` :  
   – `id` avec `pierre-habitat.fr`  
   – `context.default.greeting` qui est le message d'accueil de votre chatbot  
   – `context.default.examples` qui sont les exemples proposés après votre message d'accueil  
   – `context.default.disclaimer` qui est le message s'affichant après chaque réponse générée (ex : _Une IA peut se tromper, vérifier les informations._)  
   – `context.en_agence` pour créer des scénarios/personnalités supplémentaires.
6. Modifier dans `manifest.json` :  
   – `short_name` par le nom souhaité de votre chatbot  
   – `start_url` par `https://180.81.82.83/?config=pierre-habitat.fr&context=en_agence`
7. Et voilà, votre chabot personnalisé est disponible à :  
   – http://localhost:3000/?config=pierre-habitat.fr  
   – http://localhost:3000/?config=pierre-habitat.fr&context=en_agence

> [!TIP]
> Pour vous assurer que `config.ts` est correctement paramétré, notamment lors des montées de version qui peuvent en modifier la structure, lancer `bun pierre:config`.

## Modifier la personnalité du chatbot

Si vous avez à ce stade personnalisé visuellement votre chatbot (_cf_. supra), et bien qu'il affiche des icônes et les salutations de votre organisme, **il ne se présente PAS encore comme le chatbot de votre organisme** (essayez en lui demandant qui il est !).

Pour modifier cela, modifier dans le fichier `config.ts` :

- `context.default.persona` qui définit l'identité et la personnalité du chatbot
- `context.default.audience` qui définit le contexte dans lequel le chabot doit considérer son interlocuteur

> [!NOTE]
> Pour faciliter la lecture et manipulation du fichier `config.ts` dans VSCode, ou plus généralement activer le _word wrap_ : utilisez le raccourci `Alt` + `z` (Windows) ou `⌥` + `z` (Mac).

## Modifier le modèle de langage utilisé

> [!IMPORTANT]
> Il est très fortement recommandé de disposer d'une version fonctionnelle de PIERRE en local avant de changer le modèle de langage (LLM) et ce, pour être en mesure d'effectuer des tests. En effet, modifier le modèle de langage peut avoir quelques effets sur la qualité et vitesse des réponses de PIERRE.

### Comment modifier le modèle de langage ?

Pour modifier les modèles, il suffit de :

- Modifier `models` pour chaque `context` dans votre fichier `config.ts` par la valeur souhaitée. Il est fortement recommandé d'utiliser un modèle peu cher pour le `reranker` qui est consommateur de tokens (ex : `gpt-4o-mini-2024-07-18` d'OpenAI ou équivalent).
- Renseigner la clef d'API correspondante dans les variables d'environnement (`.env.production`). **Attention**, il faut a minima et impérativement disposer d'une clef `OpenAI` pour la génération d'`embeddings`.

### Quels modèles est-il possible d'utiliser ?

PIERRE permet – à ce stade – l'usage des principaux modèles de langage, à savoir : `Anthropic`, `Cohere`, `Google`, `Meta`, `Mistral`, et `OpenAI`.

Pour accélérer l'inférence, c'est-à-dire la vitesse des réponses, il est possible de faire appel à des fournisseurs tels que `Cerebras`, `Groq` ou encore `TogetherAI`.

## Installer PIERRE sur votre site web

> [!IMPORTANT]
> Pour installer PIERRE sur votre site internet, il est indispensable de disposer d'une version fonctionnelle de PIERRE installée sur un VPS.

### Via une fenêtre modale

```html
<script
  crossorigin="anonymous"
  src="http://180.81.82.83/assets/pierre-ia.org/dist/js/widget.js"
></script>
<p
  id="pierre-ia"
  data-url="http://180.81.82.83"
  data-configuration="pierre-habitat.fr"
  data-context="default"
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
- `data-context` : le scénario (ou la personnalité) qu'utilise PIERRE
- `data-configuration` : le nom de domaine de votre organisme qui est également le nom du répertoire que vous avez créé plus tôt dans `./assets` (_cf._ supra) ou `pierre-ia.org` pour la version par défaut.

### Via une iframe

```html
<iframe
  id="pierre"
  title="PIERRE - l'IA de Mouvement HLM"
  style="..."
  width="450"
  height="620"
  src="http://180.81.82.83/?config=pierre-ia.org&context=default"
>
</iframe>
```

avec :

- `style` : le style CSS de l'iframe (libre à vous de le modifier)
- `src` : l'URL d'accès à PIERRE (libre à vous de modifier `config` et `context`)

## Paramétrer PIERRE pour l'utiliser par SMS

1. Obtenir un numéro de téléphone compatible
2. Paramétrer votre webhook
3. Modifier `phone` dans votre fichier `config.ts` avec votre numéro de téléphone

TODO/À FINALISER

# Administrer PIERRE avec une interface graphique

Si vous hébergez PIERRE :

1. Rendez-vous à l'adresse https://180.81.82.83/a (à remplacer par votre domaine/IP).
2. Saisissez (la première fois) `admin@pierre-ia.org` et le mot de passe contenu dans la variable d'environnement `AUTH_PASSWORD`.
3. Vous pouvez désormais créer autant d'utilisateurs que nécessaire (n'oubliez pas de transmettre les mots de passe !) qui pourront modifier les utilisateurs ou l'encyclopédie, consulter les conversations ou les statistiques...

## Apprendre à PIERRE des connaissances (self-hosting)

PIERRE dispose — en fait — de deux bases de connaissances :

- Une [base](https://github.com/charnould/pierre/tree/master/knowledge/) (dite `community`) qui correspond aux connaissances partagées universellement au sein du mouvemement HLM (ex : comment déposer une demande de logement social, qu'est ce que le SLS, les associations d'hébergement d'urgence dans le Vaucluse, etc.).

- Une base (dite `propriétaire`) qui correspond aux connaissances créées par un organisme HLM hébergeant sa propre version de PIERRE et qu'il ne souhaite pas partager avec `community` ou qu'il souhaite faire apprendre en pleine autonomie à PIERRE (ex : des procédures internes).

**Comment faire apprendre des connaissances à PIERRE ?**

1. Se connecter à https://180.81.82.83/a, puis cliquer sur `Encyclopédie`.
2. Télécharger `_metadata.xlsx`, le compléter **scrupuleusement** et le ré-uploader avec les fichiers associés. Seuls les `.docx` (Word), `.xlsx` (Excel) et `.md` (Markdown) sont acceptés.
3. **Indispensable** : [Configurer](https://github.com/charnould/pierre/blob/master/assets/pierre-ia.org/config.ts#L73) vos `context` dans `config.ts` de manière à permettre l'utilisation des connaissances `proprietary` et protéger votre `context` s'il utilise des données `privées`/`private`.
4. C'est tout. Toutes les nuits aux alentours de 4h du matin, la base de connaissances sera automatiquement reconstruite (il est impératif que vos variables d'environnement contiennent une clef d'API `OpenAI`).

# License

Le code-source du présent dépôt est sous license [GNU Affero General Public License Version 3](https://github.com/charnould/pierre/blob/master/LICENSE.md). La base de connaissances (dossier `/knowledge`) est sous license [Creative Commons BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).

Copyright (c) 2024-aujourd'hui, Charles-Henri Arnould/BECKREL (charnould@pierre-ia.org) et les contributeurs.
