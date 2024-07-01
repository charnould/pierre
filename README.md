# PIERRE (alpha)

> En cours de rédaction

## Sommaire

<!-- toc -->

- [Avertissement](#avertissement)
- [Comment contribuer à PIERRE ?](#comment-contribuer-a-pierre-)
  - [Contribuer au code ou à sa documentation](#contribuer-au-code-ou-a-sa-documentation)
  - [Contribuer à la base de connaissance (le plus important et le plus simple)](#contribuer-a-la-base-de-connaissance-le-plus-important-et-le-plus-simple)
- [Changelog & Release notes](#changelog--release-notes)
- [Roadmap](#roadmap)
  - [Correctifs](#correctifs)
  - [Fonctionnalités (et/ou idées) ?](#fonctionnalites-etou-idees-)
- [Quelques limites de connaissances constatées (à résoudre)](#quelques-limites-de-connaissances-constatees-a-resoudre)
- [Fonctionnement et architecture de PIERRE](#fonctionnement-et-architecture-de-pierre)
  - [Simplement, comment fonctionne PIERRE ?](#simplement-comment-fonctionne-pierre-)
  - [Technologies utilisées](#technologies-utilisees)
- [Déploiment de PIERRE](#deploiment-de-pierre)
  - [Combien cela coûte-t-il de déployer et d'utiliser PIERRE ?](#combien-cela-coute-t-il-de-deployer-et-dutiliser-pierre-)
  - [Comment déployer PIERRE sur son propre serveur en moins 10 minutes ?](#comment-deployer-pierre-sur-son-propre-serveur-en-moins-10-minutes-)
  - [Personnaliser PIERRE](#personnaliser-pierre)
  - [Les principales commandes pour gérer le déploiement](#les-principales-commandes-pour-gerer-le-deploiement)
  - [Comment télécharger la base de données qui contient les conversations](#comment-telecharger-la-base-de-donnees-qui-contient-les-conversations)
  - [Requête SQLite pour extraire et organiser les conversations](#requete-sqlite-pour-extraire-et-organiser-les-conversations)
  - [Comment visualier agréablement les données](#comment-visualier-agreablement-les-donnees)
- [Régles et consignes de rédaction pour la base de connaissances](#regles-et-consignes-de-redaction-pour-la-base-de-connaissances)
- [License](#license)

<!-- tocstop -->

## Avertissement

PIERRE (alpha) est actuellement en développement actif. De fait, les conventions de montée de version (`semver`) ne sont pas actuellement respectées. De plus des régressions peuvent apparaître. De nombreuses corrections de bugs interviennent ici et là.

## Comment contribuer à PIERRE ?

### Contribuer au code ou à sa documentation

TODO

### Contribuer à la base de connaissance (le plus important et le plus simple)

TODO

## Changelog & Release notes

- `2024-07-01` : Version alpha-2 (estimated knowledge quality: 5%)
- `2024-04-30` : Version alpha-1 (estimated knowledge quality: 5%)

## Roadmap

### Correctifs

- Migrer sur `Tailwind 4.0` (?) et en profiter pour reprendre le CSS
- Migrer sur `DuckDB` quand le [bug de Bun](https://github.com/oven-sh/bun/issues/11699) sera résolu. Pourquoi migrer sur DuckDB ?
  - Recherche vectorielle native
  - Recherche FTS5/BM25 native
  - Stemmer (`snowball`) intégré
  - Base de données performante et embarquée (à la SQLite)
- Ajouter une recherche par `keywords` (en utilisant le stemmer `snowball` ?)
- Ajouter des tests
- Corriger Typescript + refactor
- Ajouter de la télémétrie simple:
  - Créer une page protégée par `basic auth` ?
  - Pouvoir consulter, voire supprimer, les conversations ?
  - Pouvoir télécharger la BDD sans passer par un script `scp` ?
  - Faire en sorte que - quel que soit le domaine de déploiement - la télémétrie se sauvegarde également sur Pierre (doit pouvoir être débrayable) ?
- Mettre en place un CI/CD ?

- Tronquer les réponses si le nombre de `tokens` dépasse le `context` ?

### Fonctionnalités (et/ou idées) ?

- Permettre à l'utilisateur de noter les réponses de l'IA (+ KPI ?)
- Ajout un `dark mode` ?
- Ajouter la lecture à haute voix des réponses ?

## Quelques limites de connaissances constatées (à résoudre)

- "C'est quoi une CAL ou CALEOL ?"
- "Quelles différences entre ARPEJ et les CROUS" -> PIERRE ne retourne pas d'éléments probants

## Fonctionnement et architecture de PIERRE

### Simplement, comment fonctionne PIERRE ?

TODO

### Technologies utilisées

L'architecture technique de PIERRE est à dessein simple pour (1) démystifier l'IA et (2) s'assurer que quiconque puisse déployer PIERRE.

- Language: Javascript
- Runtime: [`Bun`](https://github.com/oven-sh/bun)
- Framework: [`Hono`](https://github.com/honojs/hono)
- Container: [`Docker`](https://www.docker.com)
- Deployment: [`Kamal`](https://kamal-deploy.org)
- Database + Vectorstore: [`SQLite3`](https://sqlite.org) (serverless + embedded + fast)

PIERRE est basé sur le principe du "choose your LLM model". C'est-à-dire qu'il permet de choisir quel grand modèle de langage doit être utilisé (Mistral, Groq, OpenAI...) en modifiant un fichier de configuration.

À ce jour :

- les vecteurs/embeddings sont générés avec `text-embedding-3-large` (OpenAI)
- le texte est généré avec `gpt-4o` (OpenAI)

## Déploiment de PIERRE

### Combien cela coûte-t-il de déployer et d'utiliser PIERRE ?

- 5€-25€/mois pour louer un VPS (ex : [Hetzner](https://www.hetzner.com))
- Les coûts associés à l'utilisation d'un LLM:
  - Génération d'embeddings : 0,13 $US / 1M tokens avec `text-embedding-3-large`
  - Génération de textes : 5,00 $US (input), 15,00 $US (output) / 1M tokens avec `gpt-4o`

### Comment déployer PIERRE sur son propre serveur en moins 10 minutes ?

1. Obtenir un `VPS` `linux_x86` (par exemple via [Hetzner](https://www.hetzner.com))  
   et être en capacité de s'y connecter via `ssh` (avec une clef ou mot de passe)
2. Cloner le présent répertoire
3. Installer les dépendances
4. Modifier le fichier de configuration `config/deploy.yml`
5. run `kamal deploy`
6. Et voilà.

### Personnaliser PIERRE

- Générer les icônes : https://www.pwabuilder.com/imageGenerator

### Les principales commandes pour gérer le déploiement

```
kamal setup
kamal app exec -i --reuse bash
kamal lock release
kamal rollback
kamal app logs
kamal remove
kamal env push
kamal deploy
```

L'intégralité des commandes : https://kamal-deploy.org/docs/commands/view-all-commands/

### Comment télécharger la base de données qui contient les conversations

`scp root@ip:/var/lib/docker/volumes/telemetry/_data/datastore.sqlite ~/Desktop/`

avec : `ip` est l'`ip` du serveur, et `~/Desktop/` là où vous voulez télécharger la BDD sur votre ordinateur (`~/Desktop/` correspond au Bureau sur OS X).

### Requête SQLite pour extraire et organiser les conversations

```sql
SELECT
  uuid,
  json_group_array(
    json_object(
      'timestamp', timestamp,
      'content', content,
      'role', role
      )
  ) AS conversation

FROM (
  SELECT
    uuid,
    content,
    timestamp,
    role
  FROM telemetry
  ORDER BY uuid, timestamp
)

GROUP BY uuid;
```

### Comment visualier agréablement les données

- Télécharger VS Code
- Ouvrir le fichier.json
- Ouvrir la palette, chercher `word wrap` puis clic droit `format file`

## Régles et consignes de rédaction pour la base de connaissances

- Toujours expliciter les acronymes.
- Le moins d'acronyme possible (ex : Mme -> Madame).
- Ne jamais dire "nous": parler au neutre.
- Toujours mettre téléphone avant le numéro, adresse avant l'adresse, etc.
- Chaque article doit inclure les mots-clefs les plus pertinents ?
- Rédiger avec le moins de "bruit" possible.
- La structure des dossiers/sous-dossier et le nommage n'ont aucune importance.
- Chaque fichier doit impérativement commencer par un titre (#)
- Les sous-titres doivent rappeler le contexte du titre de niveau supérieur

## License

Le code-source du présent répertoire est sous license GPL-3.0-only. La base de connaissance est sous license Creative Commons BY-NC-SA 4.0.

Copyright (C) 2024, Charles-Henri Arnould (charnould@icloud.com) et les contributeurs.
