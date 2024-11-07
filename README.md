# PIERRE – L'IA open source du mouvement HLM

> [!IMPORTANT]
> PIERRE est actuellement en version `0.13.x` (consulter les [releases](https://github.com/charnould/pierre/releases)) avec une **qualité de base de connaissances estimée à `10 %`**. Par ailleurs, la documentation ci-dessous est en cours de rédaction. En cas de difficultés, créer une `issue` ou envoyer un email à charnould@pierre-ia.org.

> [!IMPORTANT]
> PIERRE ne connait pas les spécificités des bailleurs (ex : la taille de leur parc, les coordonnées des gardiens, les procédures internes, etc.). Tous ces éléments peuvent néanmoins lui être aisément « enseignés » en modifiant l'équivalent d'un document Word (_cf._ [Contribuer à PIERRE](#contribuer-%C3%A0-pierre)).

## PIERRE : kézako ?

PIERRE est une intelligence artificielle (IA) **open source**, **plurilingue** et **multicanale** au service du mouvement HLM et plus précisément de ses candidats et locataires.

Plus concrètement encore, PIERRE c'est à la fois :

1. Un **chatbot** (ou mieux : un **resolution bot**) **open source** qui répond à 100 % des questions de « premier niveau » des locataires et demandeurs HLM, disponible sur le **Web** ([démonstration](https://pierre-ia.org)) et par **SMS**.
2. Une **base de connaissances** en **open data** ([consultation](https://kdb.pierre-ia.org)), utilisable indépendamment du chatbot et indispensable à la mise en oeuvre de toutes approches « Retrieval Augmented Generation » ([RAG](https://en.wikipedia.org/wiki/Retrieval-augmented_generation)) via un LLM.

→ [Télécharger une présentation de PIERRE](./docs/assets/pierre-en-3-min.pdf) (PDF · 2,7 Mo)

## Sommaire

<!-- toc -->

- [Contribuer à PIERRE](#contribuer-%C3%A0-pierre)
- [Fonctionnement + architecture de PIERRE](#fonctionnement--architecture-de-pierre)
  - [Comment fonctionne PIERRE ?](#comment-fonctionne-pierre)
  - [Modèle(s) de langage](#mod%C3%A8les-de-langage)
  - [L'universel SMS pour les échanges de « premier niveau »](#luniversel-sms-pour-les-%C3%A9changes-de-%C2%AB-premier-niveau-%C2%BB)
  - [Technologies + Services](#technologies--services)
  - [Les coûts associés à l'usage de PIERRE](#les-co%C3%BBts-associ%C3%A9s-%C3%A0-lusage-de-pierre)
- [Comment déployer PIERRE ?](#comment-d%C3%A9ployer-pierre)
  - [Faire héberger PIERRE (le plus simple)](#faire-h%C3%A9berger-pierre-le-plus-simple)
  - [Héberger PIERRE (self-hosting)](#h%C3%A9berger-pierre-self-hosting)
- [Personnaliser PIERRE (self-hosting)](#personnaliser-pierre-self-hosting)
  - [Modifier l'interface du chatbot](#modifier-linterface-du-chatbot)
  - [Modifier la personnalité du chatbot](#modifier-la-personnalit%C3%A9-du-chatbot)
- [Installer PIERRE sur votre site web (self-hosting)](#installer-pierre-sur-votre-site-web-self-hosting)
- [Paramétrer PIERRE pour l'utiliser par SMS (self-hosting)](#param%C3%A9trer-pierre-pour-lutiliser-par-sms-self-hosting)
- [Modifier le modèle de langage/LLM utilisé (self-hosting)](#modifier-le-mod%C3%A8le-de-langagellm-utilis%C3%A9-self-hosting)
  - [Comment modifier le modèle de langage ?](#comment-modifier-le-mod%C3%A8le-de-langage)
  - [Quels modèles est-il possible d'utiliser ?](#quels-mod%C3%A8les-est-il-possible-dutiliser)
- [Suivre et évaluer les conversations de PIERRE (self-hosting)](#suivre-et-%C3%A9valuer-les-conversations-de-pierre-self-hosting)
- [License](#license)

<!-- tocstop -->

## Contribuer à PIERRE

- Pour contribuer à la **base de connaissances** de PIERRE, consultez [README.md](https://kdb.pierre-ia.org) (c'est aussi simple que de modifier un document Word, et cela profite automatiquement à l'ensemble du mouvement HLM).
- Pour contribuer au code-source du chatbot/LLM, consultez [CONTRIBUTING.md](./CONTRIBUTING.md).

Les `releases` de PIERRE [sont consultables ici](https://github.com/charnould/pierre/releases).

## Fonctionnement + architecture de PIERRE

### Comment fonctionne PIERRE ?

1. Un utilisateur pose une question à PIERRE via le web ou par SMS.
2. Une première passe de LLM/IA corrige et augmente la requête initiale.
3. Une deuxième passe de LLM/IA s'assure de la validité et sécurité de la requête initiale (ex : impossible d'insulter PIERRE ou d'adresser une question sans lien avec le logement).
4. La requête validée et augmentée est vectorisée, puis interroge la base de connaissances de PIERRE.
5. Une dernière passe de LLM/IA génère une réponse sur la base des résultats retournés puis réordonnancés de la base de connaissances.
6. La réponse est retournée quelques secondes plus tard à l'utilisateur via le web ou par SMS.
7. La conversation se poursuit jusqu'à satisfaction de l'utilisateur (goto 1).

### Modèle(s) de langage

PIERRE utilise « trois (passes de) LLM » dans cet ordre successif :

1. Un **modèle de génération d'`objets`** qui transforme la requête de l'utilisateur en une « requête augmentée » (en utilisant des techniques de type HyDE ou Stepback). Tous les LLM ne peuvent générer de tels `objets`. De fait, **le modèle utilisé à ce jour ne peut pas être modifié** (`gpt-4o-mini-2024-07-18`). En conséquence, il est indispensable — lorsque l'on auto-héberge PIERRE — de disposer d'une clef d'API OpenAI.

2. Un **modèle de génération d'`embeddings`** qui transforme la « requête augmentée » en vecteurs de valeurs numériques qui sont ensuite utilisés pour rechercher les éléments de réponse les plus pertinents dans la base de connaissances de PIERRE. **À ce jour, ce modèle ne peut pas être modifié** (`text-embedding-3-large`). En conséquence, il est indispensable — lorsque l'on auto-héberge PIERRE — de disposer d'une clef d'API OpenAI.

3. Un **modèle de génération de `textes`** qui génére les réponses textuelles aux utilisateurs. Lorsque l'on auto-héberge PIERRE — et sur le principe du **« Bring Your Own LLM Key/Model »** (BYOK) — **il est possible de choisir le modèle utilisé** (Mistral, Anthropic, Cohere...) et ce, en modifiant le fichier de configuation (_cf._ infra). Par défaut, PIERRE utilise `gpt-4o-mini-2024-07-18` d'OpenAI.

### L'universel SMS pour les échanges de « premier niveau »

> [!NOTE]
> PIERRE propose à ce jour deux modalités d'interaction : via le Web ([démonstration](https://pierre-ia.org)) ou par SMS (Text-to-Text). À court terme, PIERRE va également investiguer une interaction Voice-to-Voice.

En réponse au nouveau plan de numérotation mis en place par l'ARCEP en 2023 (avec l'introduction des numéros commerciaux 09 3x xx xx xx) et pour proposer aux entreprises une **solution universelle** pour converser avec leurs clients, les opérateurs téléphoniques français ont lançé en 2023 (déploiement opérationnel en octobre 2024) une nouvelle offre de SMS conversationnel à destination des entreprises (dite `Time2chat`) qui (i) permet de s'affranchir des plateformes propriétaires (WhatsApp, Telegram, Messenger, etc.) utilisées au maximum par 50 % de la population française et (ii) une instantanéité et délivrabilité exceptionnelles (100 % des téléphones disposent nativement du SMS).

Principales caratéristiques de `Time2chat` (en savoir plus via l'[ARCEP](https://af2m.org/sms-conversationnel-time2chat/) ou via [Orange](https://payservices.orange.com/fr/business-messaging/time2chat)) :

- Une **conversation** est une série de SMS entre une entreprise et un utilisateur.
- Elle dure maximum 24h et le nombre de SMS échangés durant cette période est illimité.
- Elle peut être initiée par l'entreprise ou l’utilisateur.

### Technologies + Services

- Language: `Javascript`
- Framework: [`Hono`](https://github.com/honojs/hono) (with [`Bun`](https://github.com/oven-sh/bun) runtime)
- Database + Vectorstore: [`SQLite3`](https://sqlite.org) (extended with [`sqlite-vec`](https://github.com/asg017/sqlite-vec))
- Deployment: [`Kamal`](https://kamal-deploy.org) (with [`Docker`](https://www.docker.com))
- LLM: « Bring Your Own LLM Key/Model » (BYOK)
- SMS: `Time2Chat` via [`CM`](https://www.cm.com/fr-fr/)

### Les coûts associés à l'usage de PIERRE

Déployer PIERRE sur un serveur génére des coûts (minimes) :

- La location d'un serveur (par exemple `CX22` d'[Hetzner](https://www.hetzner.com/cloud/)) : env. €10 par mois.
- L'usage d'un LLM via une API, soit (sur la base d'OpenAI utilisée par défaut) :  
  – Génération de vecteurs : $0.13 / MTokens avec `text-embedding-3-large`  
  – Génération de textes : $0,15 (input) et $0,60 (output) / MTokens avec `gpt-4o-mini`
- (Optionnellement) Les conversations SMS :  
  – Location d'un numéro de téléphone : €10 par mois  
  – Envoi de SMS : €0.09 par conversation (= SMS illimités par fenêtre de 24h)

## Comment déployer PIERRE ?

### Faire héberger PIERRE (le plus simple)

Avantages :

- Ne jamais avoir à se soucier de serveurs et d'API
- Bénéficier tout le temps (24h sur 24) de la toute dernière version de PIERRE

Adresser un email à charnould@pierre-ia.org.

### Héberger PIERRE (self-hosting)

#### Faire fonctionner PIERRE en local

Les instructions ci-après sont pour `Windows`+`WSL` (sous-système Windows pour Linux).

1. Installer `WSL` et vérifier sa bonne installation ([instructions](https://learn.microsoft.com/fr-fr/windows/wsl/install)).
2. Installer `Bun` (≥ `1.1.34`) et vérifier sa bonne installation ([instructions](https://bun.sh/docs/installation)).
3. Forker le présent dépôt.
4. Lancer `bun install` dans votre terminal pour installer les dépendances.
5. Renommer le fichier `.env.example` en `.env.production` et compléter le.
6. Lancer PIERRE avec `bun dev`.
7. Et voilà : PIERRE est accessible à http://localhost:3000 et répond à vos questions !

#### Déployer pour la première fois PIERRE sur un serveur de production

Pour déployer PIERRE sur votre propre serveur, il est indispensable d'être parvenu à le faire fonctionner en local (_cf._ supra).

1. Installer `Docker Desktop` et le lancer ([instructions](https://www.docker.com/products/docker-desktop/)). `Docker` gérera la conteneurisation.
2. Lancer `gem install kamal` pour installer `Kamal` (≥`2.3.0`) qui gérera le déploiement ([instructions](https://kamal-deploy.org/docs/installation/)).
3. Disposer d'un compte `GitHub` et [générer une clef](https://github.com/settings/tokens). `GitHub` sera le registre de conteneurs lors du déploiement.
4. Disposer d'un VPS (par exemple `CX22` d'[Hetzner](https://www.hetzner.com/cloud/)) et être en capacité de s'y connecter via `ssh` (avec une clef ou mot de passe).
5. Finaliser les modifications du fichier `.env.production` que vous avez créé précédemment.
6. Saississez dans votre terminal `dotenvx run -f .env.production -- kamal setup` et patientez quelques minutes (`dotenvx run -f .env.production --` est indispensable pour interpoler les variables d'environnement).
7. Et voilà, PIERRE est accessible à l'adresse IP de votre serveur.
8. Étapes suivantes (optionnelles et décrites ci-dessous) :  
   – Placer votre IP derrière un proxy pour le servir via un domaine  
   – Déployer PIERRE sur un second serveur de tests  
   – Personnaliser PIERRE  
   – Faire fonctionner PIERRE par SMS  
   – Afficher PIERRE sur votre site internet ou extranet-locataire

#### Redéployer PIERRE sur un serveur de production

PIERRE — et notamment sa base de connaissances — évolue régulièrement et suit la convention `semver`. Pour le mettre à jour :

1. Consulter les [releases](https://github.com/charnould/pierre/releases) pour connaitre les modifications et les éventuels _breaking changes_.
2. Mettez à jour votre fork.
3. Saississez `dotenvx run -f .env.production -- kamal deploy` dans votre terminal (ou le raccourci `bun production:deploy`).

#### Déployer et redéployer PIERRE sur un serveur de tests

Pour tester en conditions réelles les mises à jour et nouveautés de PIERRE :

1. Disposer d'un **second** VPS et être en capacité de s'y connecter via `ssh` (avec une clef ou mot de passe).
2. Dupliquer `.env.production` en `.env.staging` et modifier le (a priori uniquement l'IP).
3. Lancer `dotenvx run -f .env.staging -- kamal setup` pour déployer la première fois.
4. Lancer `dotenvx run -f .env.staging -- kamal deploy` pour redéployer (ou le raccourci `bun staging:deploy`).

> [!NOTE]
> Il est très fortement recommandé que les environnements de `production` et `staging` aient le même système d'exploitation (Ubuntu, Debian, etc.) et la même architecture de processeur (x86).

## Personnaliser PIERRE (self-hosting)

> [!NOTE]
> Dans les instructions ci-dessous, nous considérons un bailleur social fictif nommé `Pierre Habitat` dont le site institutionnel est accessible à `pierre-habitat.fr` et qui a déployé sa propre version de PIERRE à l'adresse/IP `180.81.82.83`, et le scénario `en_agence`.

### Modifier l'interface du chatbot

<img src="docs/assets/images/personnalisation-de-pierre.webp" height="400">

1. Dans le répertoire `./assets`, dupliquer le dossier `pierre-ia.org` et le nommer `pierre-habitat.fr`. Les consignes suivantes s'appliquent à ce nouveau répertoire.
2. Supprimer les sous-répertoires `/dist`, `/fonts`, `/scripts`, `/tailwind`.
3. Créer une icône `system.svg` et remplacer la précédente. Cette icône est celle qui apparait dans l'interface du chatbot (au dessus de « Bonjour 👋 »).
4. [Générer les icônes](https://www.pwabuilder.com/imageGenerator) qui permettront d'ajouter votre chatbot sur l'écran d'accueil des smartphones de vos utilisateurs et remplacer celles dans le dossier `icons`. Conservez la structure du répertoire et le nommage des fichiers (automatique).
5. Modifier `config.ts` :  
   – `id` avec `pierre-habitat.fr`  
   – `context.default.greeting` qui est le message d'accueil de votre chatbot  
   – `context.default.examples` qui sont les exemples proposés après votre message d'accueil  
   – `context.en_agence` pour créer des scénarios/personnalités supplémentaires.
6. Modifier dans `manifest.json` :  
   – `short_name` par le nom souhaité de votre chatbot  
   – `start_url` par `https://180.81.82.83/?config=pierre-habitat.fr&context=en_agence`
7. Et voilà, votre chabot personnalisé est disponible à :  
   – http://localhost:3000/?config=pierre-habitat.fr  
   – http://localhost:3000/?config=pierre-habitat.fr&context=en_agence

### Modifier la personnalité du chatbot

Si vous avez à ce stade personnalisé visuellement votre chatbot (_cf_. supra), et bien qu'il affiche des icônes et les salutations de votre organisme, **il ne se présente PAS encore comme le chatbot de votre organisme** (essayez en lui demandant qui il est !).

Pour modifier cela, modifier dans le fichier `config.ts` :

- `context.default.persona` qui définit l'identité et la personnalité du chatbot
- `context.default.audience` qui définit le contexte dans lequel le chabot doit considérer son interlocuteur

> [!NOTE]
> Pour faciliter la lecture et manipulation du fichier `config.ts` dans VSCode, ou plus généralement activer le _word wrap_ : utilisez le raccourci `Alt` + `z` (Windows) ou `⌥` + `z` (Mac).

## Installer PIERRE sur votre site web (self-hosting)

> [!IMPORTANT]
> Pour installer PIERRE sur votre site internet, il est indispensable de disposer d'une version fonctionnelle de PIERRE installée sur un VPS.

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

## Paramétrer PIERRE pour l'utiliser par SMS (self-hosting)

1. Obtenir un numéro de téléphone compatible
2. Paramétrer votre webhook
3. Modifier `phone` dans votre fichier `config.ts` avec votre numéro de téléphone

TODO/À FINALISER

## Modifier le modèle de langage/LLM utilisé (self-hosting)

> [!IMPORTANT]
> Il est très fortement recommandé de disposer d'une version fonctionnelle de PIERRE en local avant de changer le modèle de langage (LLM) et ce, pour être en mesure d'effectuer des tests. En effet, modifier le modèle de langage peut avoir quelques effets sur la qualité et vitesse des réponses de PIERRE.

### Comment modifier le modèle de langage ?

Pour modifier le **modèle de génération de `textes`**, il suffit de :

- Modifier `model` dans votre fichier `config.ts` par la valeur souhaitée
- Renseigner la clef d'API correspondante dans les variables d'environnement (`.env.production`)

### Quels modèles est-il possible d'utiliser ?

PIERRE permet – à ce stade – l'usage des principaux modèles de langage, à savoir : `Anthropic`, `Cohere`, `Google`, `Mistral` et `OpenAI`.

## Suivre et évaluer les conversations de PIERRE (self-hosting)

Si vous hébergez PIERRE :

1. Rendez-vous à l'adresse https://180.81.82.83/eval (à remplacer par votre domaine/IP)
2. Saisissez un des mots de passe contenus dans la variable d'environnement `AUTH_PASSWORDS` (`.env.production`)
3. Vous pouvez dorénavant consulter, noter et annoter les échanges de PIERRE avec vos utilisateurs

## License

Le code-source du présent dépôt est sous license [GNU Affero General Public License Version 3](https://github.com/charnould/pierre/blob/master/LICENSE.md). La base de connaissances (dossier `knowledge`) et `utils/knowledge/datastore.sqlite` sont sous license [Creative Commons BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).

Copyright (c) 2024-aujourd'hui, Charles-Henri Arnould/BECKREL (charnould@pierre-ia.org) et les contributeurs.
