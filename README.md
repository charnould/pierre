# PIERRE – L'IA open source du mouvement HLM

> [!IMPORTANT]
> PIERRE est actuellement en version `0.37.x` (consulter les [releases](https://github.com/charnould/pierre/releases)) avec une **qualité de base de connaissances estimée à `20 %`**. Par ailleurs, la documentation ci-dessous est en cours de rédaction. En cas de difficultés, créer une `issue` ou envoyer un email à charnould@pierre-ia.org.<br><br>PIERRE ne connait pas les spécificités des bailleurs (ex : taille des parcs, coordonnées des agences, procédures internes, etc.). **Ces éléments peuvent néanmoins lui être enseignés – littéralement – en 5 secondes.**

## PIERRE : kézako ?

PIERRE est un **agent IA open source** et **plurilingue** au service du mouvement HLM, de ses candidats, locataires et collaborateurs.

Plus concrètement, PIERRE c'est à la fois :

1. Un **agent IA open source** qui répond 24/7/365 à 100 % des questions de « premier niveau » des locataires et demandeurs HLM, et épaule au quotidien les collaborateurs des bailleurs sociaux (processus, données patrimoniales, aide à la rédaction, etc.).

2. Une **base de connaissances** en **open data** ([consultation](./knowledge/community)), utilisable indépendamment de l'agent IA et indispensable à toute ([« IA agentique »](https://fr.wikipedia.org/wiki/Intelligence_artificielle_agentique)) via un LLM.

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
  - [Technologies + Services](#technologies--services)
  - [Les coûts associés à l'usage de PIERRE](#les-co%C3%BBts-associ%C3%A9s-%C3%A0-lusage-de-pierre)
  - [Télémétrie](#t%C3%A9l%C3%A9m%C3%A9trie)
- [Comment déployer PIERRE ?](#comment-d%C3%A9ployer-pierre)
  - [Faire héberger PIERRE (le plus simple)](#faire-h%C3%A9berger-pierre-le-plus-simple)
  - [Héberger PIERRE (self-hosting)](#h%C3%A9berger-pierre-self-hosting)
    - [Faire fonctionner PIERRE en local](#faire-fonctionner-pierre-en-local)
    - [Déployer pour la première fois PIERRE sur un serveur de production](#d%C3%A9ployer-pour-la-premi%C3%A8re-fois-pierre-sur-un-serveur-de-production)
    - [Redéployer PIERRE sur un serveur de production](#red%C3%A9ployer-pierre-sur-un-serveur-de-production)
    - [Déployer et redéployer PIERRE sur un serveur de tests](#d%C3%A9ployer-et-red%C3%A9ployer-pierre-sur-un-serveur-de-tests)
- [Modifier et paramétrer PIERRE (self-hosting)](#modifier-et-param%C3%A9trer-pierre-self-hosting)
  - [Modifier l'interface du agent IA](#modifier-linterface-du-agent-ia)
  - [Modifier la personnalité du agent IA](#modifier-la-personnalit%C3%A9-du-agent-ia)
    - [Demander au agent IA de citer ses sources](#demander-au-agent-ia-de-citer-ses-sources)
  - [Modifier le modèle de langage utilisé](#modifier-le-mod%C3%A8le-de-langage-utilis%C3%A9)
    - [Comment modifier le modèle de langage ?](#comment-modifier-le-mod%C3%A8le-de-langage)
    - [Quels modèles est-il possible d'utiliser ?](#quels-mod%C3%A8les-est-il-possible-dutiliser)
  - [Installer PIERRE sur votre site web](#installer-pierre-sur-votre-site-web)
    - [Via une fenêtre modale](#via-une-fen%C3%AAtre-modale)
    - [Via une iframe](#via-une-iframe)
- [Administrer PIERRE avec une interface graphique](#administrer-pierre-avec-une-interface-graphique)
  - [Apprendre à PIERRE des connaissances (self-hosting)](#apprendre-%C3%A0-pierre-des-connaissances-self-hosting)
    - [Apprendre des connaissances propriétaires à PIERRE via l'interface web](#apprendre-des-connaissances-propri%C3%A9taires-%C3%A0-pierre-via-linterface-web)
    - [Apprendre des connaissances propriétaires à PIERRE via `cURL`](#apprendre-des-connaissances-propri%C3%A9taires-%C3%A0-pierre-via-curl)
- [Licence](#licence)

<!-- tocstop -->

# Contribuer à PIERRE

## Contribuer au code-source

Pour contribuer au code-source, créer une `issue` dans GitHub et suivre les us et coutumes des projets open source. Les `releases` de PIERRE [sont consultables ici](https://github.com/charnould/pierre/releases).

## Contribuer à la base de connaissances

### Contribuer à « améliorer la base de connaissances » : kézako ?

Lorsque l'on comprend [comment fonctionne](#fonctionnement--architecture-de-PIERRE) PIERRE, on comprend le rôle de la base de connaissances : elle est le **coeur de l'intelligence de PIERRE** et n'est — ni plus ni moins — que des fichiers-textes transformés. Par exemple, [ce fichier](./knowledge/global/Vie%20du%20bail/Les%20enquêtes-locataires.md) contient tout ce que sait PIERRE sur les enquêtes-locataires.

Ce document peut être incomplet ou imprécis, et **c'est tout l'enjeu que de l'améliorer**, car c'est ce document qu'utilise PIERRE pour répondre aux questions sur ces sujets.

« Améliorer la base de connaissances », ce n'est donc que cela : (1) améliorer le contenu des fichiers-textes existants et (2) créer des fichiers-textes sur les thématiques manquantes.

### Thématiques couvertes par la base de connaissances

La base de connaissances — en co-construction avec les bailleurs — couvre plusieurs thématiques :

- `Connaissances générales` : les connaissances génériques qui s'appliquent uniformément sur tout le territoire (ex : comment gérer un trouble du voisinage ? qu'est-ce que les charges locatives ?).
- `Spécificités locales` : les connaissances spécifiques à un territoire donné (ex : les associations d'hébergement d'urgence dans l'Ain, les structures d'aide dans le cadre de violences conjugales dans l'Eure).
- `Organismes HLM` : les connaissances relatives à un organisme HLM en particulier (ex : qu'est-ce que Grand Dijon Habitat et quelles sont les coordonnées du service-client et des agences ?).
- `Wikipédia` : des connaissances importées de Wikipédia (ex : l'histoire du logement social).

### Concrétement comment contribuer ?

1. Consulter la [base de connaissances](https://github.com/charnould/pierre/tree/master/knowledge/)
2. Et si vous identifiez un manque, une imprécision ou une erreur :  
   **Option A** : Adresser un email à charnould@pierre-ia.org  
   **Option B** : Créer une `issue` sur GitHub (pour les connaisseurs)

Au fur et à mesure de l'amélioration de la base de connaissances, la pertinence de PIERRE s'améliorera automatiquement et profitera à l'ensemble du mouvement HLM.

# Fonctionnement + architecture de PIERRE

## Comment fonctionne PIERRE ?

1. Un utilisateur pose une question à PIERRE.
2. Un Agent IA analyse à la fois la question et les données disponibles.
3. La réponse est retournée quelques secondes plus tard à l'utilisateur.
4. La conversation se poursuit jusqu'à satisfaction de l'utilisateur (goto 1).

> [!NOTE]
> On comprend ici aisément le rôle des bases de connaissances : **elles sont le coeur de l'intelligence de PIERRE** ou de tout agent IA. Ces bases de connaissances sont [améliorables](#contribuer-%C3%A0-la-base-de-connaissances) et [personnalisables](#apprendre-%C3%A0-PIERRE-de-nouvelles-connaissances) ; et c'est simplissime !

## Modèles de langage (ou LLM)

PIERRE utilise un unique LLM (de A à Z).

Lorsque l'on auto-héberge PIERRE — et sur le principe du **« Bring Your Own LLM Key/Model »** (BYOK) — **il est possible de choisir le modèle utilisé** (Mistral, Anthropic, Cohere, OpenAI, Meta, Alibaba...) en modifiant le fichier de configuation (_cf._ infra).

> [!NOTE]
> DPO: Consulter [cette note](/docs//documentation/data-protection-officer.md) pour comprendre plus précisément comment fonctionne PIERRE et les enjeux RGPD associés.

## Technologies + Services

- Language: `Typescript`/`Javascript`
- Framework: [`Hono`](https://github.com/honojs/hono) (with [`Bun`](https://github.com/oven-sh/bun) runtime)
- Agent IA : [`GitHub Copilot CLI` + `SDK`](https://github.com/features/copilot/cli) (licence MIT)
- Deployment: [`Kamal`](https://kamal-deploy.org) (with [`Docker`](https://www.docker.com))
- LLM: « Bring Your Own LLM Key/Model » (BYOK)

## Les coûts associés à l'usage de PIERRE

Déployer PIERRE sur un serveur génére des coûts :

- La location d'un serveur (VPS) : €45 par mois
- L'usage d'un LLM pour l'agent IA : environ $2,50 (_in_) et $15 (_out_) / MTokens

## Télémétrie

Afin de mesurer l'usage de PIERRE et comprendre quelles fonctionnalités sont utilisées, **chaque instance de PIERRE envoie automatiquement et silencieusement un ping anonyme à `pierre-ia.org`** à chaque interaction avec l'agent IA (`ai.chat` pour le chatbot, `ai.answer` pour la génération de réponse). Ce ping contient uniquement l'URL de l'instance (`HOST`) et le type d'événement — aucune donnée personnelle, aucun contenu de conversation.

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
2. Installer `Bun` (≥ `1.3.13`) et vérifier sa bonne installation ([instructions](https://bun.sh/docs/installation)).
3. Installer `SQlite3` et vérifier sa bonne installation ([instructions](https://www.sqlite.org/download.html)).
4. Installer `smol machines` (isolated microVM) et vérifier sa bonne installation ([instructions](https://smolmachines.com/)).
5. Forker/cloner le présent dépôt.
6. Lancer `bun install` dans votre terminal pour installer les dépendances.
7. Renommer le fichier `.env.example` en `.env.production` et compléter le.
8. Et voilà : PIERRE est accessible à http://localhost:3000 et répond à vos questions !

### Déployer pour la première fois PIERRE sur un serveur de production

Pour déployer PIERRE sur un serveur, il est indispensable d'être parvenu à le faire fonctionner en local.

1. Installer `Docker Desktop` et le lancer ([instructions](https://www.docker.com/products/docker-desktop/)). `Docker` gérera la conteneurisation.
2. Lancer `gem install kamal` pour installer `Kamal` (≥`2.11.0`) qui gérera le déploiement ([instructions](https://kamal-deploy.org/docs/installation/)).
3. Disposer d'un VPS et être en capacité de s'y connecter via `ssh` (avec une clef ou mot de passe). Les ports `80` (`http`) et `443` (`https`) doivent impérativement être ouverts.
4. Finaliser les modifications du fichier `.env.production` que vous avez créé précédemment.
5. Saisissez dans votre terminal `bun prod:setup`.
6. Et voilà, PIERRE est accessible à l'adresse URL de votre serveur (il faut parfois attendre une dizaine de minutes afin que les certificats SSL soient générés).
7. Étapes suivantes (optionnelles et décrites ci-dessous) :  
   – Créer une seconde instance (de tests) de PIERRE sur le même serveur  
   – Personnaliser PIERRE  
   – Afficher PIERRE sur votre site internet ou extranet-locataire

### Redéployer PIERRE sur un serveur de production

PIERRE — et notamment sa base de connaissances — évolue régulièrement et suit la convention `semver`. Pour le mettre à jour :

1. Saisir `bun pierre:version` pour connaitre la dernière version disponible.
2. Consulter les [releases](https://github.com/charnould/pierre/releases) pour connaitre les modifications et éventuels _breaking changes_.
3. Mettre à jour votre fork/clone.
4. Saisir `bun pierre:config` pour vous assurer que `config.ts` est correctement paramétré.
5. Saisir `bun prod:deploy` dans votre terminal pour redéployer.

### Déployer et redéployer PIERRE sur un serveur de tests

Pour tester en conditions réelles les mises à jour et nouveautés de PIERRE, le plus simple est de **déployer une seconde instance** de PIERRE sur votre serveur de production.

1. Dupliquer `.env.production` en `.env.staging` et modifier le (a priori uniquement le `SERVICE` et `HOST`).
2. Lancer `bun staging:setup` pour déployer la première fois.
3. Lancer `bun staging:deploy` pour redéployer.

# Modifier et paramétrer PIERRE (self-hosting)

> [!NOTE]
> Dans les instructions ci-dessous, nous considérons un bailleur social fictif nommé `Pierre Habitat` dont le site institutionnel est accessible à `pierre-habitat.fr` et qui a déployé sa propre version de PIERRE à l'adresse/IP `180.81.82.83`.

## Modifier l'interface du agent IA

<img src="docs/assets/images/personnalisation-de-PIERRE.webp" height="400">

1. Dans le répertoire `./assets`, supprimer les répertoires `demo_client`, `demo_team` et `testing_purpose_1`, `testing_purpose_2` (ne pas supprimer `core`), puis modifier et/ou dupliquer le dossier `default`.
   2.. Créer une icône `system.svg` et remplacer la précédente. Cette icône est celle qui apparait dans l'interface du agent IA (au dessus de « Bonjour 👋 »).
2. [Générer les icônes](https://www.pwabuilder.com/imageGenerator) qui permettront d'ajouter votre agent IA sur l'écran d'accueil des smartphones de vos utilisateurs et remplacer celles dans le dossier `icons` (les icônes Windows ne sont pas nécessaires). Conservez la structure du répertoire et le nommage des fichiers (automatique).
3. Modifier `config.ts` :  
   – `id` avec le nom exact du répertoire
   –`greeting`qui est le message d'accueil de votre agent IA  
   –`examples`qui sont les exemples proposés après votre message d'accueil  
   –`disclaimer` qui est le message s'affichant après chaque réponse générée (ex : _Une IA peut se tromper, vérifier les informations._).
4. Modifier dans `manifest.json` :  
   – `short_name` par le nom souhaité de votre agent IA  
   – `start_url` par `https://180.81.82.83/?config=default` (ou par le nom du répertoire que vous avez créé)
5. Et voilà, votre chabot personnalisé est disponible à http://localhost:3000/?config=PIERRE-habitat

> [!TIP]
> Pour vous assurer que `config.ts` est correctement paramétré, notamment lors des montées de version qui peuvent en modifier la structure, lancer `bun pierre:config`.

## Modifier la personnalité du agent IA

Si vous avez à ce stade personnalisé visuellement votre agent IA (_cf_. supra), et bien qu'il affiche des icônes et les salutations de votre organisme, **il ne se présente PAS encore comme l'agent IA de votre organisme** (essayez en lui demandant qui il est !). Pour modifier cela, modifier `INSTRUCTIONS.md` (**ne pas modifier le nom des rubriques** et préférer l'anglais).

### Demander au agent IA de citer ses sources

TODO

## Modifier le modèle de langage utilisé

> [!IMPORTANT]
> Il est très fortement recommandé de disposer d'une version fonctionnelle de PIERRE en local avant de changer le modèle de langage (LLM) et ce, pour être en mesure d'effectuer des tests. En effet, modifier le modèle de langage peut avoir quelques effets sur la qualité et vitesse des réponses de PIERRE.

### Comment modifier le modèle de langage ?

Pour modifier les modèles, il suffit de modifier les variables d'environnement `AI_TYPE`, `AI_MODEL`, `AI_BASE_URL` et `AI_API_KEY`. **À ce jour, uniquement les modèles d'Anthropic (Claude), d'OpenAI ou _compatible OpenAI_ sont supportés.**

### Quels modèles est-il possible d'utiliser ?

PIERRE permet l'usage des principaux modèles de langage, qu'ils soient propriétaire ou **open source**, à savoir : `Alibaba`, `Deepseek`, `Anthropic`, `Cohere`, `Google`, `Meta`, `Mistral`, et `OpenAI`, etc. Pour accélérer l'inférence, c'est-à-dire la vitesse des réponses, il est possible de faire appel à des fournisseurs tels que `Cerebras`, `Groq` ou encore `TogetherAI` avec des **modèles open source**.

## Installer PIERRE sur votre site web

> [!IMPORTANT]
> Pour installer PIERRE sur votre site internet, il est indispensable de disposer d'une version fonctionnelle de PIERRE installée sur un VPS.

### Via une fenêtre modale

```html
<script crossorigin="anonymous" src="http://180.81.82.83/assets/core/dist/js/widget.js"></script>
<p
  id="PIERRE-ia"
  data-url="http://180.81.82.83"
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
- `data-configuration` : `default` ou le nom du répertoire que vous avez créé plus tôt dans `./assets` (_cf._ supra).

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
2. Saisissez (la première fois) `admin@pierre-ia.org` et le mot de passe contenu dans la variable d'environnement `AUTH_PASSWORD`.
3. Vous pouvez désormais créer autant d'utilisateurs que nécessaire (n'oubliez pas de transmettre les mots de passe !) qui pourront modifier les utilisateurs ou l'encyclopédie, consulter les conversations ou les statistiques...

## Apprendre à PIERRE des connaissances (self-hosting)

PIERRE dispose — en fait — de deux bases de connaissances :

- Une [base](https://github.com/charnould/pierre/tree/master/knowledge/) (dite `communautaire`) qui correspond aux connaissances partagées universellement au sein du mouvemement HLM (ex : comment déposer une demande de logement social, qu'est-ce que le SLS, les associations d'hébergement d'urgence dans le Vaucluse, etc.).

- Une base (dite `propriétaire`) qui correspond aux connaissances créées par un organisme HLM hébergeant sa propre version de PIERRE et qu'il ne souhaite pas partager avec `communautaire` ou qu'il souhaite faire apprendre en pleine autonomie à PIERRE (ex : des procédures internes).

### Apprendre des connaissances propriétaires à PIERRE via l'interface web

1. Se connecter à https://180.81.82.83/a, puis cliquer sur `Encyclopédie`.
2. Télécharger `_metadata.xlsx`, le compléter **scrupuleusement** et le ré-uploader avec les fichiers associés. Seuls les `.doc`/`.docx` (Word), `.xls`/`.xlsx`/`.xlsm`/`.xlsb` (Excel) et `.md` (Markdown) sont acceptés. Voir [Guide : préparer vos documents pour PIERRE](./docs//documentation/prepare-your-docs.md) pour plus de précisions.
3. **Indispensable** : [Configurer](https://github.com/charnould/pierre/blob/master/assets/default/config.ts#L188) `config.ts` de manière à permettre l'utilisation des connaissances `proprietary` et le protéger s'il utilise des données privées.
4. C'est tout. Toutes les nuits aux alentours de 4h du matin, la base de connaissances sera automatiquement reconstruite.

### Apprendre des connaissances propriétaires à PIERRE via `cURL`

Cette option permet d'automatiser/programmer le processus d'upload documentaire ; c'est particulièrement utile si vos données changent souvent/quotidiennement (ex : présence des collaborateurs).

Utiliser la commande suivante avec :

- `URL`: l'URL de votre instance de PIERRE
- `AUTH_BEARER`: la variable d'environnement `AUTH_BEARER`
- `service`: la variable d'environnement `SERVICE`
- `file[]`: le/les fichier(s) à uploader

```bash
curl -X POST https://URL/a/knowledge \
  -H "Authorization: Bearer AUTH_BEARER" \
  -H "Authorization-Context: cli" \
  -H "Accept: application/json" \
  -F "service=pierre" \
  -F "files[]=@Carnet du patrimoine.pdf" \
  -F "files[]=@Cahier de consignes.xlsx"
```

> [!NOTE]
> La présence sur le serveur de `_metadata.xlsx` est toujours **indispensable** (cf. Apprendre des connaissances propriétaires à PIERRE via l'interface web).

# Licence

Le code-source du présent dépôt est sous licence [GNU Affero General Public License Version 3](https://github.com/charnould/pierre/blob/master/LICENSE.md), complétée par une clause additionnelle de restriction commerciale en fin de fichier LICENSE.md. La base de connaissances (dossier `/knowledge`) est sous licence [Creative Commons BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).

Copyright (c) 2024-aujourd'hui, Charles-Henri Arnould/BECKREL (charnould@pierre-ia.org) et les contributeurs.
