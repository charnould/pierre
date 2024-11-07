# README

**(en cours de rédaction)**

## PIERRE... Base de connaissances... : kézako ?

PIERRE est une intelligence artificielle (IA) open source au service du mouvement HLM ([en savoir plus](https://charnould.github.io/pierre/)). Lorsque qu'on l'utilise ([essayez !](https://assistant.pierre-ia.org)), le processus suivant se met automatiquement en action :

1. Un utilisateur pose une question à PIERRE.
2. Une première passe de l'IA corrige et augmente cette requête initiale.
3. Une deuxième passe de l'IA s'assure de la validité et sécurité de la requête initiale (ex : impossible d'insulter PIERRE ou d'adresser une question sans lien avec le logement).
4. La requête validée et augmentée est vectorisée, puis interroge la **base de connaissances** de PIERRE.
5. Une dernière passe de l'IA génère une réponse **sur la base des résultats retournés par la base de connaissances.**

On comprend donc aisément le rôle de cette base de connaissance : **elle est le coeur de l'intelligence de PIERRE** ou de toute IA mettant en oeuvre une approche technique dite RAG pour _Retrieval Augmented Generation_.

### De quoi est constituée cette base de connaissances ?

La base de connaissances, ce n'est — ni plus ni moins — que des fichiers-textes qui contiennent les éléments de réponses à toutes le questions-logements imaginables.

En guise d'exemple, [ce fichier](./knowledge/Généralités/Les%20enquêtes-locataires.md) contient **tout** ce que sait PIERRE sur le sujet des enquêtes-locataires. Ce document peut être incomplet, peu précis ou parfait : c'est tout l'enjeu que de le modifier pour le rendre le plus clair et précis possible, car c'est ce même document que l'IA va utiliser pour répondre aux questions que l'on pourrait lui poser sur ces sujets.

Au 20 septembre 2024, sa qualité/complétude est estimée à 10 %.

### Que signifie « contribuer à la base de connaissances » ?

Cela signifie tout simplement contribuer/aider à :

- Améliorer le contenu des fichiers-textes en y ajoutant des précisions, clarifications, en corrigeant des coquilles...
- Augmenter la base de connaissances en ajoutant les connaissances manquantes (ex : les impacts du SLS, les solutions d'hébergement d'urgence dans l'Ain pour les victimes de violences conjugales, etc.).
- Augmenter la base de connaissances avec des éléments **spécifiques à un bailleur social en particulier** (ex : ce qu'est Domofrance, son patrimoine, les coordonnées de ses collaborateurs, etc.) de manière à ce que PIERRE puisse répondre à des questions précises **sur** ce bailleur.

Enfin, et encore plus concrètement, « contribuer à la base de connaissances », c'est modifier un fichier-texte comme on modifie un document Word. C'est à la portée de tous et est d'une valeur inestimable pour le mouvement HLM !

### Comment contribuer à la base de connaissances ?

1. Adresser un email charnould@pierre-ia.org (ou créer une `issue` sur GitHub) en indiquant votre souhait de contribuer à la base de connaissances.
2. PIERRE vous donnera un accès pour contribuer à la base de connaissances (une sorte de Microsoft Word).
3. Contribuer à la base de connaissances en modifiant les fichiers-textes !
4. Au fur et à mesure de l'amélioration de la base de connaissances — et sans considération aucune pour le volet technique — la pertinence de PIERRE s'améliorera automatiquement.

### Structure de la base de connaissances

- `Généralités`
  - Contient toutes les connaissances génériques applicables au HLM (ex : les dispositifs Action Logement, les états des lieux, etc.).
  - Les éléments de ce répertoire sont modifiables par toutes personnes souhaitant contribuer à la base de connaissances.
- `Organismes`
  - Contient les données spécifiques aux organismes HLM (ex : qu'est-ce que Domofrance, quel est son patrimoine, quelles sont les coordonnées du service-client et des collaborateurs, etc.)
  - Par principe, seuls les collaborateurs d'un organisme modifient les éléments relatifs à leur organisme.
- `Wikipédia`
  - Contient des données automatiquement importées.
  - Ce répertoire NE DOIT PAS être modifié par les contributeurs à la base de connaissances. En effet, il est automatiquement mis à jour par PIERRE lors de la reconstruction de sa base de données.
  - Il est néanmoins possible aux contributeurs de suggérer des articles Wikipédia à intégrer dans la base de connaissances de PIERRE (ex : la page Wikipédia d'un nouveau ministre du logement ou d'une nouvelle loi relative au logement).

### Comment modifier des documents

TODO

### Règles et consignes de rédaction (TODO)

- Toujours expliciter les acronymes.
- Le moins d'acronyme possible (ex : Mme -> Madame).
- Ne jamais dire "nous": parler au neutre.
- Toujours mettre `téléphone` avant le numéro, `adresse` avant l'adresse, etc.
- Chaque article doit inclure les mots-clefs les plus pertinents ?
- Rédiger avec le moins de "bruit" possible.
- La structure des dossiers/sous-dossiers et le nommage des fichiers n'ont aucune importance.
- Chaque fichier doit impérativement commencer par un titre
