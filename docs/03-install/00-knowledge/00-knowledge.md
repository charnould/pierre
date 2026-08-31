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

La base de connaissances (consultable [ici](https://github.com/charnould/pierre/tree/master/knowledge/)) est le **coeur de l'intelligence de PIERRE**. Ce n'est ni plus ni moins que des fichiers texte transformés — c'est eux qu'utilise PIERRE pour répondre aux questions sur chaque thématique.

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

Le détail opérationnel est volontairement conservé dans un guide dédié : [préparer vos documents pour PIERRE](/guides/préparer-vos-documents). C'est le document à transmettre aux équipes-métier avant une première campagne d'alimentation documentaire.
