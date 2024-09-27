# PIERRE – L'IA open source du mouvement HLM

> [!IMPORTANT]
> PIERRE est actuellement en version `0.9.x` avec une **qualité de base de connaissances estimée à `10 %`**. Par ailleurs, la documentation ci-dessous est en cours de rédaction. En cas de difficultés, créer une `issue` (ou envoyer un email à charnould@pierre-ia.org).

## PIERRE : kézako ?

PIERRE est une intelligence artificielle (IA) **open source** et **plurilingue** au service du mouvement HLM et plus précisément des candidats et des locataires de logements sociaux.

Plus concrètement encore, PIERRE c'est à la fois :

1. Un **chatbot open source** optimisé pour le mouvement HLM ([démonstration](https://pierre-ia.org)).
2. Une **base de connaissances** en **open data** ([consultation](https://kdb.pierre-ia.org)), utilisable indépendamment du chatbot et indispensable à la mise en oeuvre de toutes approches « Retrieval Augmented Generation » ([RAG](https://en.wikipedia.org/wiki/Retrieval-augmented_generation)) via un LLM.

## Sommaire

<!-- toc -->

- [Contribuer à PIERRE](#contribuer-%C3%A0-pierre)
- [Changelog + roadmap](#changelog--roadmap)
- [Fonctionnement + architecture de PIERRE](#fonctionnement--architecture-de-pierre)
  - [Comment fonctionne PIERRE ?](#comment-fonctionne-pierre)
  - [Technologies](#technologies)
  - [Modèle de langage](#mod%C3%A8le-de-langage)
- [Comment déployer PIERRE ?](#comment-d%C3%A9ployer-pierre)
  - [Faire héberger PIERRE (le plus simple)](#faire-h%C3%A9berger-pierre-le-plus-simple)
  - [Auto-héberger PIERRE (self-hosting)](#auto-h%C3%A9berger-pierre-self-hosting)
- [Personnaliser PIERRE (self-hosting)](#personnaliser-pierre-self-hosting)
  - [Personnaliser l'interface du chatbot](#personnaliser-linterface-du-chatbot)
  - [Personnaliser la personnalité du chatbot](#personnaliser-la-personnalit%C3%A9-du-chatbot)
- [Installer PIERRE sur votre site web ou extranet-locataire (self-hosting)](#installer-pierre-sur-votre-site-web-ou-extranet-locataire-self-hosting)
- [Modifier le modèle de langage/LLM utilisé (self-hosting)](#modifier-le-mod%C3%A8le-de-langagellm-utilis%C3%A9-self-hosting)
- [Suivre et évaluer les conversations de PIERRE (self-hosting)](#suivre-et-%C3%A9valuer-les-conversations-de-pierre-self-hosting)
- [License](#license)

<!-- tocstop -->

## Contribuer à PIERRE

- Pour contribuer à la **base de connaissances** de PIERRE, consultez [README.md](https://kdb.pierre-ia.org) (c'est simplissime, y compris pour ceux peu à l'aise avec l'informatique, et cela profite automatiquement à l'ensemble du mouvement HLM).
- Pour contribuer au code-source du chatbot/LLM, consultez [CONTRIBUTING.md](./CONTRIBUTING.md).

## Changelog + roadmap

Les `releases` de PIERRE [sont consultables ici](https://github.com/charnould/pierre/releases).

- `todo:` Décider du modèle de langage par défault (🇫🇷 Mistral ?)
- `todo:` Ajouter des statistiques/KPI d'usage et pertinence sur la page `admin`
- `idea:` Ajouter un `dark mode` ?
- `idea:` Permettre à l'utilisateur de noter les réponses de PIERRE ?
- `idea:` Ajouter la lecture à haute voix des réponses ?

## Fonctionnement + architecture de PIERRE

### Comment fonctionne PIERRE ?

1. Un utilisateur pose une question à PIERRE.
2. Une première passe de LLM/IA corrige et augmente la requête initiale.
3. Une deuxième passe de LLM/IA s'assure de la validité et sécurité de la requête initiale (ex : impossible d'insulter PIERRE ou d'adresser une question sans lien avec le logement).
4. La requête validée et augmentée est vectorisée, puis interroge la base de connaissances de PIERRE.
5. Une dernière passe de LLM/IA génère une réponse sur la base des résultats retournés par la base de connaissances.

### Technologies

- Language: `Javascript`
- Framework: [`Hono`](https://github.com/honojs/hono) (with [`Bun`](https://github.com/oven-sh/bun) runtime)
- Database + Vectorstore: [`SQLite3`](https://sqlite.org) (extended with [`sqlite-vec`](https://github.com/asg017/sqlite-vec))
- Deployment: [`Kamal`](https://kamal-deploy.org) (with [`Docker`](https://www.docker.com))
- Collaborative writing tool (knowledge database): [`Gitbook`](https://www.gitbook.com)

### Modèle de langage

À ce jour et par défaut, PIERRE utilise l'API d'`OpenAI` :

- les vecteurs sont générés avec `text-embedding-3-large`
- les réponses sont générées avec `gpt-4o-mini-2024-07-18`

Néanmoins, PIERRE est basé sur le principe du **« Choose Your LLM Model »**, c'est-à-dire que – si vous faites le choix d'auto-héberger PIERRE – il vous est possible de choisir le modèle de langage utilisé (Mistral, Anthropic, Cohere...) et ce, en modifiant une ligne dans le fichier de configuation (_cf._ infra).

## Comment déployer PIERRE ?

### Faire héberger PIERRE (le plus simple)

Principaux avantages :

- Ne jamais avoir à se soucier de serveurs et d'API
- Bénéficier tout le temps de la dernière version tout en personnalisant PIERRE à l'image de votre organisme

Adresser un email à charnould@pierre-ia.org (ou charnould@beckrel.com).

### Auto-héberger PIERRE (self-hosting)

#### Quels sont les coûts associés au déploiement et à l'usage de PIERRE ?

Déployer PIERRE sur vos propres serveurs génére des coûts (minimes) :

- La location d'un serveur (par exemple `cpx11` via [Hetzner](https://www.hetzner.com/cloud/)) : env. 10 € par mois (nul besoin de GPU).
- L'usage d'un LLM via une API.  
  Sur la base de l'API d'OpenAI actuellement utilisée par PIERRE :
  - Génération de vecteurs : 0,13 $US par million de tokens (`text-embedding-3-large`)
  - Génération de textes : 5 $US (input) ou 15 $US (output) par million de tokens (`gpt-4o-mini`)

#### Faire fonctionner PIERRE en local

1. Les instructions ci-après sont pour `Windows`+`WSL` (sous-système Windows pour Linux).
2. Installer `WSL` et vérifier sa bonne installation ([instructions](https://learn.microsoft.com/fr-fr/windows/wsl/install)).
3. Installer `Bun` et vérifier sa bonne installation ([instructions](https://bun.sh/docs/installation)).
4. Cloner/forker le présent dépôt.
5. Lancer `bun install` dans votre terminal pour installer les dépendances.
6. Renommer le fichier `.env.example` en `.env` et :

   - Renseigner votre clé d'API OpenAI dans la variable d'environnement `OPENAI_API_KEY`. Vous pouvez l'obtenir [ici](https://platform.openai.com/api-keys).
   - Créer un mot de passe solide (via [Lastpass](https://www.lastpass.com/fr/features/password-generator) par exemple) et le renseigner dans la variable d'environnement `AUTH_SECRET`.
   - Modifier les mots de passe dans la variable d'environnement `PASSWORDS`. Ces mots de passe permettront notamment de consulter l'historique des conversations entre PIERRE et vos utilisateurs dans une interface web.

7. Lancer PIERRE avec `bun dev`
8. Et voilà : PIERRE est accessible à http://localhost:3000 et répond à vos questions !

#### Déployer pour la première fois PIERRE sur un serveur

1. Pour déployer PIERRE sur votre propre serveur, il est indispensable d'être parvenu à le faire fonctionner en local (_cf._ supra).
2. Installer `Docker Desktop` et le lancer ([instructions](https://www.docker.com/products/docker-desktop/)). `Docker` gérera la conteneurisation de PIERRE.
3. Lancer `gem install kamal -v 1.9` pour installer `Kamal` qui gérera le déploiement de PIERRE ([instructions](https://kamal-deploy.org/docs/installation/)).
4. Disposer d'un compte `GitHub` et [générer une clef](https://github.com/settings/tokens). `GitHub` fera office de registre de conteneurs lors des déploiements.
   - on: `write:packagesUpload`
   - on: `delete:packagesDelete`
5. Disposer d'un `VPS` (par exemple via [Hetzner](https://www.hetzner.com)) et être en capacité de s'y connecter via `ssh` (avec une clef ou mot de passe).
6. Modifier le fichier de configuration `config/deploy.yml` en suivant les instructions qu'il contient.
7. Saississez dans votre terminal `kamal setup` et patientez quelques minutes.
8. Et voilà, PIERRE est accessible à l'adresse IP de votre serveur.
9. Étapes suivantes (optionnelles) :

- Placer votre IP derrière un proxy pour servir PIERRE via un nom de domaine (via Cloudflare par exemple).
- Personnaliser PIERRE (_cf._ infra).
- Afficher PIERRE sur votre site internet ou extranet-locataire (_cf._ infra).

#### Redéployer PIERRE sur un serveur

PIERRE — et notamment sa base de connaissances — [évolue régulièrement](https://github.com/charnould/pierre/releases) et suit la convention `semver`. Pour le mettre à jour :

- Mettez à jour votre fork, puis saississez `kamal deploy` dans votre terminal.
- Si vous modifiez les variables d'environnement après le premier déploiement, il sera impératif de lancer `kamal env push` avant `kamal deploy`. L'intégralité des commandes de Kamal sont disponibles [ici](https://kamal-deploy.org/docs/commands/view-all-commands).

## Personnaliser PIERRE (self-hosting)

> [!NOTE]
> Dans les instructions ci-dessous, nous considérons un bailleur social fictif nommé `Stone Habitat` dont le site institutionnel est accessible à `stone-habitat.fr` et qui a déployé sa propre version de PIERRE à l'adresse/IP `180.81.82.83`.

### Personnaliser l'interface du chatbot

<img src="docs/assets/images/personnalisation-de-pierre.webp" height="400">

1. Dans le répertoire `/assets`, dupliquer le dossier `plainecommunehabitat.fr` et le nommer `stone-habitat.fr`. Les consignes suivantes s'appliquent à ce nouveau répertoire `assets/stone-habitat.fr`. (Vous pouvez supprimer l'ensemble des sous-dossiers contenus dans `/assets` à l'exception de `pierre-ia.org` qui à la fois est la version par défaut et contient des fichiers indispensables au fonctionnement de PIERRE.)
2. Créer une icône `system.svg` et remplacer la précédente. Cette icône est celle qui apparait dans l'interface du chatbot (au dessus de « Bonjour 👋 »).
3. [Générer les icônes](https://www.pwabuilder.com/imageGenerator) qui permettront d'ajouter votre chatbot sur l'écran d'accueil des smartphones de vos utilisateurs et glisser les dans le dossier `icons`. Conservez la structure du répertoire et le nommage des fichiers (automatique).
4. Modifier dans `manifest.json` :

- `short_name` par le nom souhaité de votre chatbot
- `start_url` par `/?config=stone-habitat.fr`

5. Modifier dans `config.ts` :

- `id` avec `stone-habitat.fr`
- `greeting` qui est le message d'accueil de votre chatbot
- `examples` qui sont les exemples proposés après votre message d'accueil

6. Et voilà, votre chabot personnalisé est disponible à http://localhost:3000/?config=stone-habitat.fr.

### Personnaliser la personnalité du chatbot

Si vous avez à ce stade personnalisé visuellement votre chatbot (_cf_. supra), et bien qu'il affiche des icônes et les salutations de votre organisme, **il ne se présente PAS encore comme le chatbot de votre organisme** (essayez en lui demandant qui il est !).

Pour modifier cela, modifier dans le fichier `config.ts` :

- `persona` qui définit l'identité et la personnalité du chatbot
- `context` qui définit le contexte dans lequel le chabot doit considérer son interlocuteur

## Installer PIERRE sur votre site web ou extranet-locataire (self-hosting)

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
  data-configuration="stone-habitat.fr"
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
- `data-configuration` : le nom de domaine de votre organisme qui est également le nom du répertoire que vous avez créé plus tôt dans `./assets` (_cf._ supra) ou `pierre-ia.org` pour la version par défaut.

## Modifier le modèle de langage/LLM utilisé (self-hosting)

TODO / À FINALISER

> [!IMPORTANT]
> Il est très fortement recommandé – à des fins de tests – de disposer d'une version fonctionnelle de PIERRE en local avant de changer le modèle de langage (LLM).

> [!NOTE]
> Modifier le modèle de langage de PIERRE peut avoir des effets indésirables, à savoir : (1) une moindre qualité des réponses du fait de l'usage d'un LLM possiblement moins performant, (2) une moindre qualité des réponses car les _prompts_ sont à ce jour optimisés pour `gpt-4o-mini` et (3) des réponses moins rapides si l'API utilisée est moins performante.

PIERRE utilise – en fait – deux « LLM » :

- Un **modèle de génération d'`embedding`** qui transforme les questions des utilisateurs en vecteurs de valeurs numériques qui sont ensuite utilisés pour rechercher les éléments de réponse les plus pertinents dans la base de connaissances (par similarité-cosinus). **À ce jour, ce modèle ne peut pas être modifié**. En conséquence, il est indispensable – lorsque l'on auto-héberge PIERRE – de disposer d'une clef d'API OpenAI (PIERRE utilise `text-embedding-3-large`).

- Un **modèle de génération de texte** qui génére les réponses aux utilisateurs. Lorsque l'on auto-héberge PIERRE, **il est possible de changer ce modèle** par ceux de Mistral, Anthropic, Cohere ou Google. Par défaut, PIERRE utilise `gpt-4o-mini-2024-07-18` d'OpenAI.

## Suivre et évaluer les conversations de PIERRE (self-hosting)

Si vous auto-hébergez PIERRE :

1. Rendez-vous à l'adresse https://180.81.82.83/eval (à remplacer par votre domaine/IP)
2. Saisisssez un des mots de passe contenus dans la variable d'environnement `PASSWORDS` (`.env`)
3. Vous pouvez dorénavant consulter, noter et annoter les échanges de PIERRE avec vos utilisateurs

## License

Le code-source du présent dépôt est sous license [GNU Affero General Public License Version 3](https://github.com/charnould/pierre/blob/master/LICENSE.md). La base de connaissance (dossier `knowledge`) est sous license [Creative Commons BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/).

Copyright (c) 2024, Charles-Henri Arnould/BECKREL (charnould@pierre-ia.org) et les contributeurs.
