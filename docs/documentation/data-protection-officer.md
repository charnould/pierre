# Data Protection Officer

## Introduction

L’usage de l’intelligence artificielle dans le cadre du projet open souce `PIERRE` soulève des questions-clefs relatives au traitement des données : nature des informations collectées, conditions de conservation, localisation des serveurs ou encore finalités d’utilisation.

Ces enjeux dépassent le strict cadre technique : ils impliquent des considérations réglementaires (RGPD), des exigences de sécurité et des principes éthiques liés à la gouvernance des données.

Ce chapitre a pour objectif de (1) clarifier ces dimensions dans un langage non technique et accessible aux DPO et (2) fournir une compréhension des risques et responsabilités.

Trois usages, ou manipulations, par `PIERRE` des données-propriétaires des organismes de logement social (OLS ci-après) sont détaillés ci-après :

1. Upload de données-propriétaires via l'interface d'aministration
2. Utilisation des données-propriétaires intégrées
3. Interaction de l'extension navigateur avec vos applicatifs et données

## Sommaire

<!-- toc -->

- [L'upload de données-propriétaires via l'interface d'administration de `PIERRE`](#lupload-de-donn%C3%A9es-propri%C3%A9taires-via-linterface-dadministration-de-pierre)
  - [Types et formats de données](#types-et-formats-de-donn%C3%A9es)
  - [Processus d'upload via l'interface d'administration et conséquences RGPD](#processus-dupload-via-linterface-dadministration-et-cons%C3%A9quences-rgpd)
  - [En synthèse](#en-synth%C3%A8se)
- [Utilisation des données-propriétaires uploadées via l'interface d'administration de `PIERRE`](#utilisation-des-donn%C3%A9es-propri%C3%A9taires-upload%C3%A9es-via-linterface-dadministration-de-pierre)
  - [Etape 1. Query expansion](#etape-1-query-expansion)
  - [Etape 2. Transformation vectorielle et requête de données](#etape-2-transformation-vectorielle-et-requ%C3%AAte-de-donn%C3%A9es)
  - [Etape 3. Reranking](#etape-3-reranking)
  - [Etape 4. Génération de la réponse finale](#etape-4-g%C3%A9n%C3%A9ration-de-la-r%C3%A9ponse-finale)
- [Interaction de l'extension navigateur de `PIERRE` avec vos applicatifs et données](#interaction-de-lextension-navigateur-de-pierre-avec-vos-applicatifs-et-donn%C3%A9es)
  - [Présentation de l'extension](#pr%C3%A9sentation-de-lextension)
  - [Processus à l'oeuvre lors de l'utilisation de l'extension navigateur](#processus-%C3%A0-loeuvre-lors-de-lutilisation-de-lextension-navigateur)

<!-- tocstop -->

## L'upload de données-propriétaires via l'interface d'administration de `PIERRE`

Les OLS peuvent enrichir `PIERRE` de leurs propres données afin d'obtenir des réponses parfaitement adaptées à leur contexte. A titre d'exemple, il convient de founir à `PIERRE` les coordonnées du service-client afin qu'il puisse répondre aux demandes correspondantes.

### Types et formats de données

Deux catégories de données sont distinguées :

- **données-propriétaires génériques (sans enjeux RGPD)** : historique de l'organisme, coordonnées du service-client, coordonnées publiques, politiques et procédures publiques accessibles à tous...

- **données-propriétaires potentiellement sensibles au RGPD** : adresses emails professionnelles, coordonnées de prestataires, accords collectifs, organigramme nominatif...

Formats actuellement supportés :

- `.xlsx` (Microsoft Excel)
- `.docx` (Microsoft Word)
- `.md` (Markdown)

### Processus d'upload via l'interface d'administration et conséquences RGPD

#### Upload initial

Les fichiers sont ajoutés manuellement par un collaborateur habilité de l'OLS via l'interface d'administration de `PIERRE`. Ils sont stockés de manière sécurisée :

- **Local** : sur l'ordinateur de l'utilisateur.
- **Auto-hébergement/hébegement tiers** : sur le serveur choisi.
- **Hébergement par le projet PIERRE** : chez [Hetzner](https://www.hetzner.com/) à Falkenstein (Allemagne). Possiblement, dans un futur proche, chez [Scaleway](https://www.scaleway.com/fr/) à Paris (France).

> [!NOTE]
>
> - [**Hetzner** : Sécurité + Conformité ](https://www.hetzner.com/legal/legal-notice/)
> - [**Scaleway** : Sécurité + Conformité ](https://www.scaleway.com/fr/securite-et-resilience/)

#### Traitement automatisé des fichiers

Chaque nuit, `PIERRE` exécute :

1. **Extraction** : lecture des fichiers uploadés et extraction de leur contenu
2. **Segmentation** : découpage des contenus extraits en segments cohérents
3. **Vectorisation** : conversion des segments en représentations numériques
4. **Stockage** : enregistrement des segments (texte) et des vecteurs (nombres) dans une base de données SQLite (base de connaissances)

Les opérations 1, 2 et 4 sont opérées intégralement par le serveur d'hébergement. L'opération 3 peut, selon la configuration de `PIERRE`, faire appel à un service-tiers.

#### Options de vectorisation (étape 3)

Deux configurations de vectorisation sont possibles :

##### Option 1 : `PIERRE` est hébergé par le projet `PIERRE`

- **Service** : [Hugging Face Endpoints](https://endpoints.huggingface.co) (entreprise franco-américaine, leader dans l'IA) pour utiliser le modèle d'_embeddings_ open source [BGE-M3](https://huggingface.co/BAAI/bge-m3)
- **Infrastructure** : serveur GPU Amazon Web Services localisé en Irelande
- **Traitement** : conversion texte → vecteur uniquement
- **Contrôle des données** : aucune persistance des données sur le serveur externe

> [!NOTE]
>
> - [**HF Inference Endpoints** : Sécurité + Conformité ](https://huggingface.co/docs/inference-endpoints/guides/security)

##### Option 2 : Auto-hébergement ou hébergement par un tiers

- **Service** : l'intégration Hugging Face Endpoints (HFE) peut être désactivée
- **Infrastructure** : si HFE désactivée, serveur d'hébergement
- **Traitement** : conversion texte → vecteur uniquement
- **Contrôle des données** : possiblement aucune dépendance à un service externe

> [!IMPORTANT]
> Pour un volume de données conséquent, l’usage d’un service comme Hugging Face Endpoints est très fortement recommandé pour réduire le temps de traitement. Il est néanmoins possible de choisir le fournisseur (Amazon Web Services, Microsoft Azure, Google Cloud Platform) et le lieu du traitement (Europe, USA...).

### En synthèse

- **Où sont stockées les données-propriétaires ?**
  - **Fichiers originaux**: stockés sur le serveur d’hébergement.
  - **Contenu textuel et vectorisé** : stocké dans une base SQLite sur le serveur.
- **Les données-propriétaires interagissent-elles avec un service tiers** : oui/non selon la configuration de `PIERRE`

## Utilisation des données-propriétaires uploadées via l'interface d'administration de `PIERRE`

Lorsqu'un utilisateur interagit avec `PIERRE` via son interface de chatbot, le pipeline de traitement est le suivant :

### Etape 1. Query expansion

- **En entrée** : la question (ou la conversation si plusiers interactions ont déjà eu lieu)
- **Traitement** : une IA réalise une tâche, dite de _query expansion_, consistant synthétiquement à (1) déterminer la langue de la question, (2) vérifier que la question ne contient pas de propos déplacés, (3) comprendre l'attente finale/réelle de l'utilisateur et (4) générer des éléments théoriques de réponse
- **Lieu du traitement** : quelle que soit la modalité d'hébergement de `PIERRE` (auto-hébergement, hébergement par un tiers, hébergement par le projet `PIERRE`), cette étape fait appel, à ce jour et par défaut, à une IA open source `Qwen/Qwen3-32B` (ou équivalent) propulsée par le moteur d'inférence `Groq`
- **En sortie** : la « question augmentée »

> [!NOTE]
>
> - [**Groq** : Sécurité + Conformité](https://trust.groq.com)

### Etape 2. Transformation vectorielle et requête de données

- **En entrée** : la « question augmentée »
- **Traitement** : `PIERRE` transforme la « question augmentée » en vecteurs numériques et interroge la base de connaissances pour obtenir les éléments **possiblement** pertinents (_chunks_) pour répondre au mieux à l'utilisateur.
- **Lieu du traitement** : ces opérations se déroulent **intégralement sur le serveur d'hébergement**.
- **En sortie** : la « question augmentée » + _chunks_ candidats

### Etape 3. Reranking

- **En entrée** : la « question augmentée » + _chunks_ candidats
- **Traitement** : une IA analyse la pertinence de chaque _chunk_ en regard de la « question augmentée » et attribue une note (de 0 à 1 000) au _chunk_ pour qualifier cette pertinence. A l'issue du traitement, ne sont conservés que les chunks les plus pertinents.
- **Lieu du traitement** : quelle que soit la modalité d'hébergement de `PIERRE` (auto-hébergement, hébergement par un tiers, hébergement par le projet `PIERRE`), cette étape fait appel, à ce jour et par défaut, à une IA open source `Qwen/Qwen3-32B` (ou équivalent) propulsée par le moteur d'inférence `Groq`
- **En sortie** : la « question augmentée » + _chunks_ pertinents

> [!NOTE]
>
> - [**Groq** : Sécurité + Conformité](https://trust.groq.com)

### Etape 4. Génération de la réponse finale

- **En entrée** : la « question augmentée » + _chunks_ pertinents
- **Traitement** : une IA reçoit la « question augmentée » et les _chunks_ pertinents et génère une réponse à destination de l'utilisateur final.
- **Lieu du traitement** : le choix du modèle d'IA étant ici libre (OpenAI, Mistral, Anthropic, Qwen, Deepseek, etc.), le lieu de traitement peut varier. Lorsque l'hébergement est opéré par le projet `PIERRE`, il n'y a aucune persistance de données sur le serveur tiers.
- **En sortie** : la réponse finale streamée à l'utilisateur

> [!NOTE]
> Les échanges utilisateur/`PIERRE` sont sauvegardés dans une base de données SQLite et sont accessibles uniquement (1) à celui qui héberge l'instance deployée de `PIERRE` et aux collaborateurs ayant le profil-utilisateur _administrateur_. Ces sauvegardes visent à la fois à mesurer l'usage de `PIERRE`, mais également à mesurer la qualité des réponses apportées.

## Interaction de l'extension navigateur de `PIERRE` avec vos applicatifs et données

### Présentation de l'extension

En mode **« extension navigateur »**, `PIERRE` agit comme un **agent intégré à vos applicatifs historiques**. À titre d'exemple, `PIERRE` peut consulter le message d'un client directement dans ACG/Aravis™, générer une réponse pertinente et (1) l'insérer dans le champ Aravis™ idoine ou (2) générer une document Word (`.docx`) prêt à être adressé par voie postale.

Pour permettre à `PIERRE` de générer la réponse ou le courrier le plus pertinent, l'utilisateur peut joindre/ajouter au message du client des éléments de contexte, soit (1) sous la forme de texte, soit (2) sous la forme de fichiers PDF.

(INSERER VIDEO DE DEMONSTRATION)

Ces éléments (message original du client, éléments de contexte textuels et éléments de contexte sous la forme de fichiers) sont aussi des données-propriétaires, c'est-à-dire soit :

- **Données contextuelles propriétaires génériques (sans enjeux RGPD)** : historique et présentation de l'organisme, coordonnées du service-client, politiques et procédures publiques...

- **Données contextuelles propriétaires potentiellement sensibles au RGPD** : courriers/correspondances avec des locataires, solde d'impayés...

### Processus à l'oeuvre lors de l'utilisation de l'extension navigateur

#### Etape 1. Sélection de l'action

- Récupération des données pertinentes dans le code-source web de l’application cible (= le message du client).
- Traitement effectué localement dans le navigateur.

#### Etape 2. Ajout optionnel de contexte textuel

- L’utilisateur peut ajouter du texte complémentaire.
- Aucun traitement IA à ce stade.

#### Etape 3. Ajout optionnel de fichiers PDF

- L’utilisateur peut joindre des fichiers (ex : correspondances).
- Aucun stockage des fichiers originaux par PIERRE une fois la conversation passée.

#### Etape 4. Réalisation de l'action

1. **OCR** : conversion des PDF en texte via [Mistral Optical Character Recognition](https://mistral.ai/solutions/document-ai) (entreprise française).
2. **Génération** : une IA produit la réponse finale. Le choix du modèle d'IA étant ici libre (OpenAI, Mistral, Anthropic, Qwen, Deepseek, etc.), le lieu de traitement peut varier. Lorsque l'hébergement est opéré par le projet `PIERRE`, il n'y a aucune persistance de données sur le serveur tiers.
3. **Sortie** : réponse insérée dans l’applicatif ou exportée en `.docx`.

> [!NOTE]
>
> - [**Mistral** : Sécurité + Conformité ](https://mistral.ai/fr/terms#terms-of-service)

> [!NOTE]
> Les échanges utilisateur/`PIERRE` sont sauvegardés dans une base de données SQLite et sont accessibles uniquement (1) à celui qui héberge l'instance deployée de `PIERRE` et aux collaborateurs ayant le profil-utilisateur _administrateur_. Ces sauvegardes visent à la fois à mesurer l'usage de `PIERRE`, mais également à mesurer la qualité des réponses apportées.
