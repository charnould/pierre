# `PIERRE` – L'IA open source du mouvement HLM

> [!IMPORTANT]
> `PIERRE` est actuellement en version `0.34.x` (consulter les [releases](https://github.com/charnould/pierre/releases)) avec une **qualité de base de connaissances estimée à `20 %`**. Par ailleurs, la documentation ci-dessous est en cours de rédaction. En cas de difficultés, créer une `issue` ou envoyer un email à charnould@pierre-ia.org.<br><br>`PIERRE` ne connait pas les spécificités des bailleurs (ex : taille des parcs, coordonnées des agences, procédures internes, etc.). **Ces éléments peuvent néanmoins lui être « enseignés en deux clics ».**

## `PIERRE` : kézako ?

`PIERRE` est une intelligence artificielle (IA) **open source** et **plurilingue** au service du mouvement HLM, de ses candidats, locataires et collaborateurs.

Plus concrètement, `PIERRE` c'est à la fois :

1. Un **chatbot** (ou mieux : un **resolution bot**) **open source** qui répond 24/7/365 à 100 % des questions de « premier niveau » des locataires et demandeurs HLM, et épaule au quotidien les collaborateurs des bailleurs sociaux (processus, données patrimoniales, aide à la rédaction, etc.).

2. Une **base de connaissances** en **open data** ([consultation](./knowledge/community)), utilisable indépendamment du chatbot et indispensable à la mise en oeuvre de toutes approches « Retrieval Augmented Generation » ([RAG](https://en.wikipedia.org/wiki/Retrieval-augmented_generation)) via un LLM.

→ [Télécharger une présentation de `PIERRE`](./docs/assets/`PIERRE`-Présentation.pdf) (PDF · 2,7 Mo)

## Sommaire

<!-- toc -->

- [Contribuer à `PIERRE`](#contribuer-%C3%A0-pierre)
  - [Contribuer au code-source](#contribuer-au-code-source)
  - [Contribuer à la base de connaissances](#contribuer-%C3%A0-la-base-de-connaissances)
    - [Contribuer à « améliorer la base de connaissances » : kézako ?](#contribuer-%C3%A0-%C2%AB-am%C3%A9liorer-la-base-de-connaissances-%C2%BB--k%C3%A9zako)
    - [Thématiques couvertes par la base de connaissances](#th%C3%A9matiques-couvertes-par-la-base-de-connaissances)
    - [Concrétement comment contribuer ?](#concr%C3%A9tement-comment-contribuer)
- [Fonctionnement + architecture de `PIERRE`](#fonctionnement--architecture-de-pierre)
  - [Comment fonctionne `PIERRE` ?](#comment-fonctionne-pierre)
  - [Modèles de langage (ou LLM)](#mod%C3%A8les-de-langage-ou-llm)
  - [Technologies + Services](#technologies--services)
  - [Les coûts associés à l'usage de `PIERRE`](#les-co%C3%BBts-associ%C3%A9s-%C3%A0-lusage-de-pierre)
- [Comment déployer `PIERRE` ?](#comment-d%C3%A9ployer-pierre)
  - [Faire héberger `PIERRE` (le plus simple)](#faire-h%C3%A9berger-pierre-le-plus-simple)
  - [Héberger `PIERRE` (self-hosting)](#h%C3%A9berger-pierre-self-hosting)
    - [Faire fonctionner `PIERRE` en local](#faire-fonctionner-pierre-en-local)
    - [Déployer pour la première fois `PIERRE` sur un serveur de production](#d%C3%A9ployer-pour-la-premi%C3%A8re-fois-pierre-sur-un-serveur-de-production)
    - [Redéployer `PIERRE` sur un serveur de production](#red%C3%A9ployer-pierre-sur-un-serveur-de-production)
    - [Déployer et redéployer `PIERRE` sur un serveur de tests](#d%C3%A9ployer-et-red%C3%A9ployer-pierre-sur-un-serveur-de-tests)
- [Modifier et paramétrer `PIERRE` (self-hosting)](#modifier-et-param%C3%A9trer-pierre-self-hosting)
  - [Modifier l'interface du chatbot](#modifier-linterface-du-chatbot)
  - [Modifier la personnalité du chatbot](#modifier-la-personnalit%C3%A9-du-chatbot)
    - [Demander au chatbot de citer ses sources](#demander-au-chatbot-de-citer-ses-sources)
  - [Modifier le modèle de langage utilisé](#modifier-le-mod%C3%A8le-de-langage-utilis%C3%A9)
    - [Comment modifier le modèle de langage ?](#comment-modifier-le-mod%C3%A8le-de-langage)
    - [Quels modèles est-il possible d'utiliser ?](#quels-mod%C3%A8les-est-il-possible-dutiliser)
  - [Installer `PIERRE` sur votre site web](#installer-pierre-sur-votre-site-web)
    - [Via une fenêtre modale](#via-une-fen%C3%AAtre-modale)
    - [Via une iframe](#via-une-iframe)
- [Administrer `PIERRE` avec une interface graphique](#administrer-pierre-avec-une-interface-graphique)
  - [Apprendre à `PIERRE` des connaissances (self-hosting)](#apprendre-%C3%A0-pierre-des-connaissances-self-hosting)
- [Licence](#licence)

<!-- tocstop -->

# Contribuer à `PIERRE`

## Contribuer au code-source

Pour contribuer au code-source, créer une `issue` dans GitHub et suivre les us et coutumes des projets open source. Les `releases` de `PIERRE` [sont consultables ici](https://github.com/charnould/pierre/releases).

## Contribuer à la base de connaissances

### Contribuer à « améliorer la base de connaissances » : kézako ?

Lorsque l'on comprend [comment fonctionne](#fonctionnement--architecture-de-`PIERRE`) `PIERRE`, on comprend le rôle de la base de connaissances : elle est le **coeur de l'intelligence de `PIERRE`** et n'est — ni plus ni moins — que des fichiers-textes transformés. Par exemple, [ce fichier](./knowledge/global/Vie%20du%20bail/Les%20enquêtes-locataires.md) contient tout ce que sait `PIERRE` sur les enquêtes-locataires.

Ce document peut être incomplet ou imprécis, et **c'est tout l'enjeu que de l'améliorer**, car c'est ce document qu'utilise `PIERRE` pour répondre aux questions sur ces sujets.

« Améliorer la base de connaissances », ce n'est donc que cela : (1) améliorer le contenu des fichiers-textes existants et (2) créer des fichiers-textes sur les thématiques manquantes.

### Thématiques couvertes par la base de connaissances

La base de connaissances — en co-construction avec les bailleurs — couvre plusieurs thématiques :

- `global` : les connaissances génériques qui s'appliquent uniformément sur tout le territoire (ex : comment gérer un trouble du voisinage ? qu'est-ce que les charges locatives ?).
- `local` : les connaissances spécifiques à un territoire donné (ex : les associations d'hébergement d'urgence dans l'Ain, les structures d'aide dans le cadre de violences conjugales dans l'Eure).
- `org` : les connaissances relatives à un organisme HLM en particulier (ex : qu'est-ce que Grand Dijon Habitat et quelles sont les coordonnées du service-client et des agences ?).
- `wiki` : des connaissances importées de Wikipédia (ex : l'histoire du logement social).

### Concrétement comment contribuer ?

1. Consulter la [base de connaissances](https://github.com/charnould/pierre/tree/master/knowledge/)
2. Et si vous identifiez un manque, une imprécision ou une erreur :  
   **Option A** : Adresser un email à charnould@pierre-ia.org  
   **Option B** : Créer une `issue` sur GitHub (pour les connaisseurs)

Au fur et à mesure de l'amélioration de la base de connaissances, la pertinence de `PIERRE` s'améliorera automatiquement et profitera à l'ensemble du mouvement HLM.

# Fonctionnement + architecture de `PIERRE`

## Comment fonctionne `PIERRE` ?

1. Un utilisateur pose une question à `PIERRE`.
2. Une première passe de LLM/IA augmente la requête initiale.
3. Une deuxième passe de LLM/IA s'assure de la validité et sécurité de la requête initiale (ex : impossible d'insulter `PIERRE` ou d'adresser une question sans lien avec le logement).
4. La requête validée et augmentée est transformée par un LLM/IA en vecteurs de valeurs numériques qui sont utilisés pour interroger les bases de connaissances de `PIERRE`.
5. Les résultats retournés sont _rerankés_ par un LLM/IA pour ne conserver que les plus pertinents.
6. Une dernière passe de LLM/IA génère une réponse sur la base des résultats retournés, réordonnancés puis _rerankés_ des bases de connaissances.
7. La réponse est retournée quelques secondes plus tard à l'utilisateur.
8. La conversation se poursuit jusqu'à satisfaction de l'utilisateur (goto 1).

> [!NOTE]
> On comprend ici aisément le rôle des bases de connaissances : **elles sont le coeur de l'intelligence de `PIERRE`** ou de toute IA mettant en oeuvre une approche « Retrieval Augmented Generation » ([RAG](https://en.wikipedia.org/wiki/Retrieval-augmented_generation)) via un LLM. Ces bases de connaissances sont [améliorables](#contribuer-%C3%A0-la-base-de-connaissances) et [personnalisables](#apprendre-%C3%A0-`PIERRE`-de-nouvelles-connaissances) ; et c'est simplissime !

## Modèles de langage (ou LLM)

`PIERRE` utilise — à ce jour — plusieurs (passes de) LLM dans cet ordre successif :

1. Un **modèle de génération de `textes`** qui transforme la requête de l'utilisateur en une « requête augmentée » (en utilisant des techniques de type HyDE ou Stepback). `PIERRE` utilise par défaut et recommande le modèle **open source** [`Qwen/Qwen3-32B`](https://huggingface.co/Qwen/Qwen3-32B).

2. Un **modèle de génération d'`embeddings`** qui transforme la « requête augmentée » en vecteurs de valeurs numériques qui sont ensuite utilisés pour rechercher les éléments de réponse les plus pertinents dans les bases de connaissances. `PIERRE` utilise le modèle **open source** [`bge-m3`](https://huggingface.co/BAAI/bge-m3).

3. À nouveau, un **modèle de génération de `textes`** configuré en **`reranker`** qui classifie les résulats retournés par les bases de connaissances pour ne conserver que les éléments les plus pertinents en regard de la question posée par l'utilisateur. `PIERRE` utilise par défaut et recommande le modèle **open source** [`Qwen/Qwen3-32B`](https://huggingface.co/Qwen/Qwen3-32B).

4. Un **modèle de génération de `textes`** qui génére les réponses textuelles aux utilisateurs en utilisant les éléments issus de (3).

Lorsque l'on auto-héberge `PIERRE` — et sur le principe du **« Bring Your Own LLM Key/Model »** (BYOK) — **il est possible de choisir le modèle utilisé** (Mistral, Anthropic, Cohere, OpenAI, Meta, Alibaba...) pour les étapes 1, 3 et 4 et ce, en modifiant le fichier de configuation (_cf._ infra).

> [!NOTE]
> DPO: Consulter [cette note](/docs//documentation/data-protection-officer.md) pour comprendre plus précisément comment fonctionne `PIERRE` et les enjeux RGPD associés.

## Technologies + Services

- Language: `Typescript`/`Javascript`
- Framework: [`Hono`](https://github.com/honojs/hono) (with [`Bun`](https://github.com/oven-sh/bun) runtime)
- Local inference: [`Ollama`](https://github.com/ollama/ollama)
- Database + Vectorstore: [`SQLite3`](https://sqlite.org) (extended with [`sqlite-vec`](https://github.com/asg017/sqlite-vec))
- Deployment: [`Kamal`](https://kamal-deploy.org) (with [`Docker`](https://www.docker.com))
- LLM: « Bring Your Own LLM Key/Model » (BYOK)
- GPU (optionnel): [`Hugging Face`](https://endpoints.huggingface.co) (via Inference Endpoints)

## Les coûts associés à l'usage de `PIERRE`

Déployer `PIERRE` sur un serveur génére des coûts :

- La location d'un serveur doté d'un `GPU` (meilleur rapport qualité/prix: `GEX44` d'[Hetzner](https://www.hetzner.com/dedicated-rootserver/gex44/)) : €200 par mois
- L'usage de LLM pour générer du texte : environ $0,40 (_in_) et $1,60 (_out_) / MTokens
- (Optionnellement) La location d'un `GPU` musclé pour vectoriser vos connaissances : €10 par mois

# Comment déployer `PIERRE` ?

## Faire héberger `PIERRE` (le plus simple)

Avantages :

- Ne jamais avoir à se soucier de serveurs et d'API.
- Bénéficier 24/7/365 de la dernière version.

Adresser un email à charnould@pierre-ia.org.

## Héberger `PIERRE` (self-hosting)

### Faire fonctionner `PIERRE` en local

Les instructions ci-après sont pour `Windows`+`WSL` (sous-système Windows pour Linux).

1. Installer `WSL` et vérifier sa bonne installation ([instructions](https://learn.microsoft.com/fr-fr/windows/wsl/install)).
2. Installer `Ollama` (≥ `0.12.3`) et vérifier sa bonne installation ([instructions](http://ollama.com)), puis saisir dans votre terminal `ollama pull bge-m3` pour télécharger le modèle `bge-m3`.
3. Installer `Bun` (≥ `1.3.0`) et vérifier sa bonne installation ([instructions](https://bun.sh/docs/installation)).
4. Installer `SQlite3` et vérifier sa bonne installation ([instructions](https://www.sqlite.org/download.html)).
5. Forker/cloner le présent dépôt.
6. Lancer `bun install` dans votre terminal pour installer les dépendances.
7. Renommer le fichier `.env.example` en `.env.production` et compléter le.
8. Ouvrir deux shell et exécuter dans le premier `ollama serve` et `bun dev` dans le second.
9. Et voilà : `PIERRE` est accessible à http://localhost:3000 et répond à vos questions !

> [!NOTE]
> La vitesse d'inférence peut être faible si votre processeur est peu puissant.

### Déployer pour la première fois `PIERRE` sur un serveur de production

Pour déployer `PIERRE` sur un serveur, il est indispensable d'être parvenu à le faire fonctionner en local.

1. Installer `Docker Desktop` et le lancer ([instructions](https://www.docker.com/products/docker-desktop/)). `Docker` gérera la conteneurisation.
2. Lancer `gem install kamal` pour installer `Kamal` (≥`2.7.0`) qui gérera le déploiement ([instructions](https://kamal-deploy.org/docs/installation/)).
3. Disposer d'un compte `GitHub` et [générer une clef](https://github.com/settings/tokens). `GitHub` sera le registre de conteneurs lors du déploiement.
4. Disposer d'un VPS avec `GPU` (par exemple `GEX44` d'[Hetzner](https://www.hetzner.com/dedicated-rootserver/gex44/)) et être en capacité de s'y connecter via `ssh` (avec une clef ou mot de passe). Les ports `80` (`http`) et `443` (`https`) doivent impérativement être ouverts.
5. Finaliser les modifications du fichier `.env.production` que vous avez créé précédemment.
6. Saisissez dans votre terminal `bun --env-file=.env.production run kamal setup`.
7. Saisissez dans votre terminal `bun --env-file=.env.production run kamal server exec "docker exec ollama ollama pull bge-m3"`.
8. Et voilà, `PIERRE` est accessible à l'adresse URL de votre serveur (il faut parfois attendre une dizaine de minutes afin que les certificats SSL soient générés).
9. Étapes suivantes (optionnelles et décrites ci-dessous) :  
   – Créer une seconde instance (de tests) de `PIERRE` sur le même serveur  
   – Personnaliser `PIERRE`  
   – Afficher `PIERRE` sur votre site internet ou extranet-locataire

> [!NOTE]
> **TODO:** Détailler la procédure permettant l'usage du `GPU` par `Docker/Ollama` : se connecter via `ssh` au serveur, `curl -fsSL https://ollama.com/install.sh | sh`, puis suivre les recommandations disponibles [ici](https://github.com/ollama/ollama/blob/main/docs/docker.md#nvidia-gpu).

### Redéployer `PIERRE` sur un serveur de production

`PIERRE` — et notamment sa base de connaissances — évolue régulièrement et suit la convention `semver`. Pour le mettre à jour :

1. Saisir `bun PIERRE:version` pour connaitre la dernière version disponible.
2. Consulter les [releases](https://github.com/charnould/pierre/releases) pour connaitre les modifications et éventuels _breaking changes_.
3. Mettre à jour votre fork/clone.
4. Saisir `bun PIERRE:config` pour vous assurer que `config.ts` est correctement paramétré.
5. Saisir `bun --env-file=.env.production run kamal deploy` dans votre terminal (ou le raccourci `bun prod:deploy`).

### Déployer et redéployer `PIERRE` sur un serveur de tests

Pour tester en conditions réelles les mises à jour et nouveautés de `PIERRE`, le plus simple est de **déployer une seconde instance** de `PIERRE` sur votre serveur de production.

1. Dupliquer `.env.production` en `.env.staging` et modifier le (a priori uniquement le `SERVICE` et `HOST`).
2. Lancer `bun --env-file=.env.staging run kamal setup` pour déployer la première fois.
3. Lancer `bun --env-file=.env.staging run kamal deploy` pour redéployer (ou le raccourci `bun staging:deploy`).

# Modifier et paramétrer `PIERRE` (self-hosting)

> [!NOTE]
> Dans les instructions ci-dessous, nous considérons un bailleur social fictif nommé `PIERRE Habitat` dont le site institutionnel est accessible à `PIERRE-habitat.fr` et qui a déployé sa propre version de `PIERRE` à l'adresse/IP `180.81.82.83`.

## Modifier l'interface du chatbot

<img src="docs/assets/images/personnalisation-de-PIERRE.webp" height="400">

1. Dans le répertoire `./assets`, supprimer les répertoires `demo_client`, `demo_team` et `testing_purpose_1`, `testing_purpose_2` (ne pas supprimer `core`), puis modifier et/ou dupliquer le dossier `default`.
   2.. Créer une icône `system.svg` et remplacer la précédente. Cette icône est celle qui apparait dans l'interface du chatbot (au dessus de « Bonjour 👋 »).
2. [Générer les icônes](https://www.pwabuilder.com/imageGenerator) qui permettront d'ajouter votre chatbot sur l'écran d'accueil des smartphones de vos utilisateurs et remplacer celles dans le dossier `icons` (les icônes Windows ne sont pas nécessaires). Conservez la structure du répertoire et le nommage des fichiers (automatique).
3. Modifier `config.ts` :  
   – `id` avec le nom exact du répertoire
   –`greeting`qui est le message d'accueil de votre chatbot  
   –`examples`qui sont les exemples proposés après votre message d'accueil  
   –`disclaimer` qui est le message s'affichant après chaque réponse générée (ex : _Une IA peut se tromper, vérifier les informations._).
4. Modifier dans `manifest.json` :  
   – `short_name` par le nom souhaité de votre chatbot  
   – `start_url` par `https://180.81.82.83/?config=default` (ou par le nom du répertoire que vous avez créé)
5. Et voilà, votre chabot personnalisé est disponible à http://localhost:3000/?config=PIERRE-habitat

> [!TIP]
> Pour vous assurer que `config.ts` est correctement paramétré, notamment lors des montées de version qui peuvent en modifier la structure, lancer `bun PIERRE:config`.

## Modifier la personnalité du chatbot

Si vous avez à ce stade personnalisé visuellement votre chatbot (_cf_. supra), et bien qu'il affiche des icônes et les salutations de votre organisme, **il ne se présente PAS encore comme le chatbot de votre organisme** (essayez en lui demandant qui il est !).

Pour modifier cela, modifier dans le répertoire `prompts/` :

- `answer.md` qui définit le comportement du chatbot lorsqu'il répond à une question pour laquelle il dispose de connaissances
- `deadlock.md` qui définit le comportement du chatbot lorsqu'il répond à une question pour laquelle il NE dispose PAS de connaissances
- `profanity.md` qui définit le comportement du chatbot lorsque l'utilisateur se montre insultant

> [!NOTE]
> Pour faciliter la lecture et manipulation du fichier `config.ts` ou des `prompts` dans VSCode, ou plus généralement activer le _word wrap_ : utilisez le raccourci `Alt` + `z` (Windows) ou `⌥` + `z` (Mac).

### Demander au chatbot de citer ses sources

Il est possible d'afficher les sources utilisés lors de la génération d'un message pour ce faire, il convient de copoier/coller dans `prompts/answer.md`, juste avant `# What You Cannot Do`:

```
---

# Citation Format (Mandatory)

**If you used reference chunks, add this at the end:**

<small>Bibliographie : <a href="FILENAME.pdf">FILENAME.pdf</a>, <a href="OTHER_FILE.pdf">OTHER_FILE.pdf</a></small>

A source is identified by the tag pattern: <chunk source="FILENAME.pdf">...text...</chunk>

**Rules:**

- Only list files you actually used
- Use exact filenames from chunk tags
- List each file once separate with ", " (comma-space)
- Do not cite conversation history or user messages
- If no reference chunks were used: no sources section

**Example:**

<small> Bibliographie : <a href="2025-12 On-Call Policy.pdf">2025-12 On-Call Policy.pdf</a>, <a href="Safety Guidelines.pdf">Safety Guidelines.pdf</a></small>

---
```

## Modifier le modèle de langage utilisé

> [!IMPORTANT]
> Il est très fortement recommandé de disposer d'une version fonctionnelle de `PIERRE` en local avant de changer le modèle de langage (LLM) et ce, pour être en mesure d'effectuer des tests. En effet, modifier le modèle de langage peut avoir quelques effets sur la qualité et vitesse des réponses de `PIERRE`.

### Comment modifier le modèle de langage ?

Pour modifier les modèles, il suffit de :

- Modifier `models` dans votre fichier `config.ts` par la valeur souhaitée. Il est **fortement recommandé** d'utiliser un modèle peu cher pour le `reranker` qui est consommateur de tokens. Par exemples : `qwen3-32b` ou `deepseek-r1-distill-llama-70b`, etc.
- Renseigner la clef d'API correspondante dans les variables d'environnement (`.env.production`).

> [!IMPORTANT]
> Lors du paramétrage du modèle dans `config.ts`, le format doit respecter strictement l'[AI SDK](https://ai-sdk.dev). A titre d'exemples : pour [OpenAI](https://ai-sdk.dev/providers/ai-sdk-providers/openai#responses-models) et pour [Groq](https://ai-sdk.dev/providers/ai-sdk-providers/groq#reasoning-models).

### Quels modèles est-il possible d'utiliser ?

`PIERRE` permet l'usage des principaux modèles de langage, qu'ils soient propriétaire ou **open source**, à savoir : `Alibaba`, `Deepseek`, `Anthropic`, `Cohere`, `Google`, `Meta`, `Mistral`, et `OpenAI`, etc.

Pour accélérer l'inférence, c'est-à-dire la vitesse des réponses, il est fortement recommandé de faire appel à des fournisseurs tels que `Cerebras`, `Groq` ou encore `TogetherAI` avec des **modèles open source** (`qwen3-32b`, `deepseek-r1-distill-llama-70b`, etc.).

## Installer `PIERRE` sur votre site web

> [!IMPORTANT]
> Pour installer `PIERRE` sur votre site internet, il est indispensable de disposer d'une version fonctionnelle de `PIERRE` installée sur un VPS.

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
- `data-url` : le domaine/IP (sans slash de fin) du serveur où `PIERRE` est accessible
- `data-configuration` : `default` ou le nom du répertoire que vous avez créé plus tôt dans `./assets` (_cf._ supra).

### Via une iframe

```html
<iframe
  id="`PIERRE`"
  title="`PIERRE` - l'IA de Mouvement HLM"
  style="..."
  width="450"
  height="620"
  src="http://180.81.82.83/?config=default"
>
</iframe>
```

avec :

- `style` : le style CSS de l'iframe (libre à vous de le modifier)
- `src` : l'URL d'accès à `PIERRE`

# Administrer `PIERRE` avec une interface graphique

Si vous hébergez `PIERRE` :

1. Rendez-vous à l'adresse https://180.81.82.83/a (à remplacer par votre domaine/IP).
2. Saisissez (la première fois) `admin@pierre-ia.org` et le mot de passe contenu dans la variable d'environnement `AUTH_PASSWORD`.
3. Vous pouvez désormais créer autant d'utilisateurs que nécessaire (n'oubliez pas de transmettre les mots de passe !) qui pourront modifier les utilisateurs ou l'encyclopédie, consulter les conversations ou les statistiques...

## Apprendre à `PIERRE` des connaissances (self-hosting)

`PIERRE` dispose — en fait — de deux bases de connaissances :

- Une [base](https://github.com/charnould/pierre/tree/master/knowledge/) (dite `communautaire`) qui correspond aux connaissances partagées universellement au sein du mouvemement HLM (ex : comment déposer une demande de logement social, qu'est-ce que le SLS, les associations d'hébergement d'urgence dans le Vaucluse, etc.).

- Une base (dite `propriétaire`) qui correspond aux connaissances créées par un organisme HLM hébergeant sa propre version de `PIERRE` et qu'il ne souhaite pas partager avec `communautaire` ou qu'il souhaite faire apprendre en pleine autonomie à `PIERRE` (ex : des procédures internes).

**Comment faire apprendre des connaissances à `PIERRE` ?**

1. Se connecter à https://180.81.82.83/a, puis cliquer sur `Encyclopédie`.
2. Télécharger `_metadata.xlsx`, le compléter **scrupuleusement** et le ré-uploader avec les fichiers associés. Seuls les `.doc`/`.docx` (Word), `.xls`/`.xlsx`/`.xlsm`/`.xlsb` (Excel) et `.md` (Markdown) sont acceptés. Voir [Guide : préparer vos documents pour PIERRE](./docs//documentation/prepare-your-docs.md) pour plus de précisions.
3. **Indispensable** : [Configurer](https://github.com/charnould/pierre/blob/master/assets/default/config.ts#L188) `config.ts` de manière à permettre l'utilisation des connaissances `proprietary` et le protéger s'il utilise des données privées.
4. C'est tout. Toutes les nuits aux alentours de 4h du matin, la base de connaissances sera automatiquement reconstruite.

**[IMPORTANT] Comment réduire la durée de reconstruction de votre base de connaissances ?**

La reconstruction de votre base de connaissances **peut être très longue** (plusieurs heures) selon la quantité de données à traiter (= transformer vos données en vecteurs de valeurs numériques).

Pour savoir si cette durée est acceptable (`PIERRE` n'a en effet plus connaissance de vos données durant le processus), il convient à ce stade d'essayer de générer votre base de connaissances en local tout en consultant les logs. Si la durée de reconstruction n'est pas acceptable, il est nécessaire de disposer d'un `GPU` d'appoint pour cette opération.

> [!NOTE]
> `PIERRE` mettra prochainement en place un moyen simple de savoir si votre base de connaissances nécessite l'usage d'un `GPU`.

- **Option 1** : Adresser un email à charnould@pierre-ia.org pour obtenir directement et simplement un `endpoint` et `token` à renseigner dans `env.production`
- **Option 2** : Louer pendant 5-15 minutes chaque jour un `GPU` (env. €10/mois). Pour se faire :
  - [Créer un compte](http://huggingface.co) `Hugging Face` (🇫🇷) et ajouter un moyen de paiement
  - Créer un `endpoint` d'inférence `bge-m3` en [suivant ce lien](https://endpoints.huggingface.co/new?repository=BAAI/bge-m3) :
    - Endpoint name: à votre convenance et sans importance
    - Hardware configuration: `Nvidia A10G` (ou équivalent) localisé au plus proche (Irlande)
    - Security Level: `Protected` (il vous faudra créer un token)
    - Autoscaling: vous assurer qu'il affiche `scale-to-zero after 15 min`
    - Cliquer sur `Create endpoint`.
  - Créer un `token` pour pouvoir utiliser le `endpoint` :
    - Se rendre sur https://huggingface.co/settings/tokens et `Create new token`
    - Token name: à votre convenance
    - Cocher `Make calls to your Inference Endpoints`
    - Cliquer sur `Create token`
  - Renseigner `HUGGINGFACE_ENDPOINT`et `HUGGINGFACE_TOKEN` dans `.env.production` ou `.env.staging` avec les valeurs correspondantes.

# Licence

Le code-source du présent dépôt est sous licence [GNU Affero General Public License Version 3](https://github.com/charnould/pierre/blob/master/LICENSE.md). La base de connaissances (dossier `/knowledge`) est sous licence [Creative Commons BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).

Copyright (c) 2024-aujourd'hui, Charles-Henri Arnould/BECKREL (charnould@pierre-ia.org) et les contributeurs.
