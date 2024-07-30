### Contribuer à la base de connaissance (le plus important et le plus simple)

La base de connaissances de PIERRE est contenue dans le dossier `knowledge`. Nous décrivons ci-dessous la meilleure façon de contribuer à cette base de connaissances tout en assurant que l'ensemble du secteur HLM puisse en bénéficier.

1. Adresser un email à charnould@pierre-ia.org en vous présentant et en indiquant vos motivations
2. Selon, vous vous verrez donner un accès au GitBook de PIERRE, un moyen simple et WYSIWYG de contribuer à la base de connaissances de PIERRE sans manipuler les commandes Git.
3. Au fur et à mesure de l'amélioration de la base de connaissances, celle-ci sera rendue disponible sur ce même répertoire GitHub.

#### Fonctionnement et principes

- Les `chunks` (hors Wikipédia) correspondent systématiquement à chaque paragraphe de niveau 2 (`##`) de chaque fichier, auxquel est ajouté en en-tête le titre de niveau 1 (`#`).
- Parce qu'un LLM limite la longueur (en caractères ou tokens) d'un `chunk` que l'on souhaite convertir en `vecteurs` (ou `embedding`), il est impératif que chaque paragraphe de niveau 2 (`##`) ne dépasse jamais 7 800 caractères. Pour s'assurer que cette règle est respectée, lancer `bun test`.

#### Régles et consignes de rédaction pour la base de connaissances

- Toujours expliciter les acronymes.
- Le moins d'acronyme possible (ex : Mme -> Madame).
- Ne jamais dire "nous": parler au neutre.
- Toujours mettre téléphone avant le numéro, adresse avant l'adresse, etc.
- Chaque article doit inclure les mots-clefs les plus pertinents ?
- Rédiger avec le moins de "bruit" possible.
- La structure des dossiers/sous-dossier et le nommage n'ont aucune importance.
- Chaque fichier doit impérativement commencer par un titre (#)
- Les sous-titres doivent rappeler le contexte du titre de niveau supérieur
