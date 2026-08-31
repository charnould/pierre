# Data Protection Officer

## Introduction

L’usage de l’intelligence artificielle dans le cadre du projet open souce PIERRE soulève des questions-clefs relatives au traitement des données : nature des informations collectées, conditions de conservation, localisation des serveurs ou encore finalités d’utilisation.

Ces enjeux dépassent le strict cadre technique : ils impliquent des considérations réglementaires (RGPD), des exigences de sécurité et des principes éthiques liés à la gouvernance des données.

Ce chapitre a pour objectif de (1) clarifier ces dimensions dans un langage non technique et accessible aux DPO et (2) fournir une compréhension des risques et responsabilités.

Trois usages, ou manipulations, par PIERRE des données-propriétaires des organismes de logement social (OLS ci-après) sont détaillés ci-après :

1. Upload de données-propriétaires via l'interface d'aministration
2. Utilisation des données-propriétaires intégrées
3. Interaction de l'extension navigateur avec vos applicatifs et données

## Sommaire

<!-- toc maxdepth:3 -->

- [L'upload de données-propriétaires via l'interface d'administration de PIERRE](#lupload-de-données-propriétaires-via-linterface-dadministration-de-pierre)
  - [Types et formats de données](#types-et-formats-de-données)
  - [Processus d'upload via l'interface d'administration et conséquences RGPD](#processus-dupload-via-linterface-dadministration-et-conséquences-rgpd)
  - [En synthèse](#en-synthèse)
- [Utilisation des données-propriétaires uploadées via l'interface d'administration de PIERRE](#utilisation-des-données-propriétaires-uploadées-via-linterface-dadministration-de-pierre)
- [Interaction de l'applicatin (client lourd) PIERRE avec vos applicatifs et données](#interaction-de-lapplicatin-client-lourd-pierre-avec-vos-applicatifs-et-données)
  - [Présentation de l'extension](#présentation-de-lextension)
  - [Processus à l'oeuvre lors de l'utilisation de l'application](#processus-à-loeuvre-lors-de-lutilisation-de-lapplication)

<!-- tocstop -->

## L'upload de données-propriétaires via l'interface d'administration de PIERRE

Les OLS peuvent enrichir PIERRE de leurs propres données afin d'obtenir des réponses parfaitement adaptées à leur contexte. A titre d'exemple, il convient de founir à PIERRE les coordonnées du service-client afin qu'il puisse répondre aux demandes correspondantes.

### Types et formats de données

Deux catégories de données sont distinguées :

- **données-propriétaires génériques (sans enjeux RGPD)** : historique de l'organisme, coordonnées du service-client, coordonnées publiques, politiques et procédures publiques accessibles à tous...

- **données-propriétaires potentiellement sensibles au RGPD** : adresses emails professionnelles, coordonnées de prestataires, accords collectifs, organigramme nominatif...

Formats actuellement supportés :

- `.xls`/`.xlsx`/`.xlsm`/`.xlsb` (Microsoft Excel)
- `.doc`/`.docx` (Microsoft Word)
- `.md` (Markdown)

### Processus d'upload via l'interface d'administration et conséquences RGPD

#### Upload initial

Les fichiers sont ajoutés manuellement par un collaborateur habilité de l'OLS via l'interface d'administration de PIERRE. Ils sont stockés de manière sécurisée :

- **Local** : sur l'ordinateur de l'utilisateur.
- **Auto-hébergement/hébegement tiers** : sur le serveur choisi.
- **Hébergement par le projet PIERRE** : chez [Hetzner](https://www.hetzner.com/) à Falkenstein (Allemagne). Possiblement, dans un futur proche, chez [Scaleway](https://www.scaleway.com/fr/) à Paris (France).

> [!NOTE]
>
> - [**Hetzner** : Sécurité + Conformité ](https://www.hetzner.com/legal/legal-notice/)
> - [**Scaleway** : Sécurité + Conformité ](https://www.scaleway.com/fr/securite-et-resilience/)

#### Traitement automatisé des fichiers

Chaque nuit, PIERRE exécute :

1. **Extraction** : lecture des fichiers uploadés et extraction de leur contenu
2. **Stockage** : enregistrement des contenus précédemment extraits et dorénavant « IA/LLM-compatible » sur le serveur

Les opérations 1 et 2 sont opérées intégralement par le serveur d'hébergement.

> [!NOTE]
> **Core Data HLM et LLM** — Les colonnes à caractère personnel des exports HLM (noms, prénoms, emails et téléphones locataire/client/candidat, adresse du logement, `allocataire_caf`, `sne` — liste maintenue dans le code) sont **exclues** de la base de connaissances `knowledge/*/db.sqlite` présentée à l’agent. Elles ne sont donc **pas** soumises à un LLM via une requête SQL sur ces tables. Elles restent disponibles dans le datastore applicatif pour l’interface et les traitements métier. Un workflow ciblé (ex. contrôle d’attestation d’assurance habitation) pourra plus tard injecter un sous-ensemble minimisé depuis ce datastore dans le payload de session, sans réintroduire ces colonnes dans la base knowledge.

### En synthèse

- **Où sont stockées les données-propriétaires ?**
  - **Fichiers originaux**: stockés sur le serveur d’hébergement.
  - **Contenus extraits** : stocké sur le serveur d’hébergement
- **Les données-propriétaires interagissent-elles avec un service tiers** : non

## Utilisation des données-propriétaires uploadées via l'interface d'administration de PIERRE

Lorsqu'un utilisateur interagit avec PIERRE via son interface de chatbot, le pipeline de traitement est le suivant :

- **En entrée** : la « question » d'un utilisateur
- **Traitement** : un agent IA reçoit la « question » et raisonne sur la meilleure façon d'y répondre sur la base des documents auxquels il a accès, enfin il génère une réponse à destination de l'utilisateur final.
- **Lieu du traitement** : le choix du modèle d'IA étant ici libre (OpenAI, Mistral, Anthropic, Qwen, Deepseek, etc.), le lieu de traitement peut varier. Lorsque l'hébergement est opéré par le projet PIERRE, il n'y a aucune persistance de données sur le serveur tiers.
- **En sortie** : la réponse finale streamée à l'utilisateur

> [!NOTE]
> Les échanges utilisateur/PIERRE sont sauvegardés dans une base de données SQLite et sont accessibles uniquement (1) à celui qui héberge l'instance deployée de PIERRE et aux collaborateurs ayant le profil-utilisateur _administrateur_. Ces sauvegardes visent à la fois à mesurer l'usage de PIERRE, mais également à mesurer la qualité des réponses apportées.

## Interaction de l'applicatin (client lourd) PIERRE avec vos applicatifs et données

### Présentation de l'extension

En mode « application », PIERRE propose différentes fonctionnalités permettant d'agir - de façon détourné - avec vos applicatifs historiques. À titre d'exemple, PIERRE peut générer (1) une réponse prête à être copiée/collée dans ACG/Aravis™ (ou tout autre applicatifs) ou (2) un document Word (`.docx`) prêt à être adressé par voie postale.

Pour permettre à PIERRE de générer la réponse ou le courrier le plus pertinent, l'utilisateur peut joindre/ajouter au message du client des éléments de contexte complémentaires, soit (1) sous la forme de texte, soit (2) sous la forme de fichiers PDF : [démonstration](https://www.youtube.com/watch?v=sKsB6U9Nfo4) (vidéo YouTube).

Ces éléments (message original du client, éléments de contexte textuels et éléments de contexte sous la forme de fichiers) sont aussi des données-propriétaires, c'est-à-dire soit :

- **Données contextuelles propriétaires génériques (sans enjeux RGPD)** : historique et présentation de l'organisme, coordonnées du service-client, politiques et procédures publiques...

- **Données contextuelles propriétaires potentiellement sensibles au RGPD** : courriers/correspondances avec des locataires, solde d'impayés...

### Processus à l'oeuvre lors de l'utilisation de l'application

#### Etape 1. Récupération des données pertinentes dans l'applicatif cible (ex : question d'un locataire)

- Action manuelle de la part de l'utilisateur (CTRL + C).
- Aucun traitement IA à ce stade.

#### Etape 2. Ajout optionnel de contexte textuel

- L’utilisateur peut ajouter des éléments de contexte complémentaires (= texte).
- Aucun traitement IA à ce stade.

#### Etape 3. Ajout optionnel de fichiers PDF

- L’utilisateur peut joindre des fichiers PDF (ex : correspondances).
- Aucun stockage des fichiers par PIERRE après générération de la réponse.

#### Etape 4. Génération de la réponse

1. **Entrée** : les éléments issus des étapes 1, 2 et 3.
2. **Génération** : une IA **impérativement multimodale** produit la réponse finale en utilisant à la fois le contexte, les fichiers PDF uploadés (qui sont transformés en images) et les bases de connaissances de PIERRE. Le choix du modèle d'IA étant ici libre (OpenAI, Mistral, Anthropic, Qwen, Deepseek, etc.), le lieu de traitement peut varier. Lorsque l'hébergement est opéré par le projet PIERRE, il n'y a aucune persistance de données sur le serveur tiers.
3. **Sortie** : réponse générée dans l’applicatif ou exportée en `.docx`.

> [!NOTE]
> Les échanges utilisateur/PIERRE sont sauvegardés dans une base de données SQLite et sont accessibles uniquement (1) à celui qui héberge l'instance deployée de PIERRE et aux collaborateurs ayant le profil-utilisateur _administrateur_. Ces sauvegardes visent à la fois à mesurer l'usage de PIERRE, mais également à mesurer la qualité des réponses apportées.
