# Préparer vos documents pour `PIERRE`

Ce guide explique quels formats de fichiers `PIERRE` accepte, comment les préparer pour maximiser la qualité de ses réponses et comment les configurer dans l’interface d’administration.

## Sommaire

<!-- toc maxdepth:3 -->

- [Quels fichiers sont acceptés par `PIERRE` pour enrichir sa base de connaissances](#quels-fichiers-sont-acceptés-par-pierre-pour-enrichir-sa-base-de-connaissances)
- [Comment bien préparer vos documents ?](#comment-bien-préparer-vos-documents-)
  - [Préparer vos documents `.docx` et `.md`](#préparer-vos-documents-docx-et-md)
  - [Préparer vos fichiers `.csv`](#préparer-vos-fichiers-csv)
  - [Préparer vos fichiers `.xls`/`.xlsx`/`.xlsm`/`.xlsb`](#préparer-vos-fichiers-xlsxlsxxlsmxlsb)
- [Configurer les sources dans PIERRE](#configurer-les-sources-dans-pierre)

<!-- tocstop -->

## Quels fichiers sont acceptés par `PIERRE` pour enrichir sa base de connaissances

Les organismes de logement social (OLS) peuvent alimenter `PIERRE` avec leurs propres données pour obtenir des réponses précisément adaptées à leur contexte — par exemple, les coordonnées du service-client ou les procédures internes d'attribution.

`PIERRE` reconnaît quatre formats :

- `.csv` (UTF-8, séparateur `;`)
- `.xls`/`.xlsx`/`.xlsm`/`.xlsb` (Microsoft Excel)
- `.docx` (Microsoft Word)
- `.md` (Markdown)

> [!CAUTION]
> Tout autre format (`.pdf`, `.jpeg`, `.png`, etc.) est ignoré par `PIERRE`.

**Qu'est-ce que le Markdown ?**

Le Markdown est un format texte léger (« LLM-native ») conçu pour être lisible brut et facile à écrire. Sa syntaxe intuitive structure un document sans balises complexes. Quelques exemples courants :

- Titre de niveau 1 : `# Titre 1`
- Titre de niveau 2 : `## Titre 2`
- Texte en gras : `**texte en gras**`
- Texte en italique : `_italique_`

## Comment bien préparer vos documents ?

### Préparer vos documents `.docx` et `.md`

Qu'il s'agisse d'un modèle de courrier, d'une note de service sur le déroulé d'une CALEOL ou de la description du processus d'attribution d'un OLS, ces fichiers sont tous traités comme du texte brut par `PIERRE`.

Rédigez-les comme vous le feriez pour un nouveau collègue qui ne connaît rien du contexte :

- Utilisez des titres et sous-titres clairs
- Limitez chaque section à un seul sujet
- Regroupez les informations similaires au même endroit
- Définissez les acronymes — ou mieux, évitez-les
- Soignez l'orthographe et la grammaire
- En Markdown, respectez le balisage : titres, listes, gras, italique

> [!CAUTION]
> Les images intégrées dans vos fichiers `.docx` et `.md` **ne sont pas interprétées** par `PIERRE`.

### Préparer vos fichiers `.csv`

Utilisez UTF-8, un point-virgule (`;`) comme séparateur et une première ligne contenant des noms de colonnes uniques. Les cinq exports `Core Data HLM` portent les noms réservés documentés dans le référentiel ; les autres CSV restent des sources ordinaires.

### Préparer vos fichiers `.xls`/`.xlsx`/`.xlsm`/`.xlsb`

1. **Structurez vos données en tableau**, pas en mise en page visuelle. Chaque ligne doit correspondre à une entrée autonome et lisible ligne par ligne — à l'opposé d'un texte mis en forme à coups de cellules fusionnées.
   - À gauche : un vrai tableau, chaque ligne est une donnée exploitable.
   - À droite : une mise en forme visuelle, illisible automatiquement.

<p float="left">
  <img src="./ok.png" width="350" />
  <img src="./ko.png" width="350" />
</p>

2. **Donnez des noms de colonnes explicites**, compréhensibles sans contexte. `49_3` est une référence opaque ; `Solde locataire` est immédiatement lisible.

3. **Soyez cohérent** dans les majuscules/minuscules et évitez les acronymes ambigus.

4. **Ne fusionnez pas les cellules** — ou seulement en dernier recours.

5. **Ajoutez une colonne de regroupement** si nécessaire. Par exemple, une colonne `type` avec les valeurs `scientifique`, `écrivain`, `philosophe`, `politique` permet à `PIERRE` de retrouver d'un coup tous les écrivains quand vous l'interrogez sur ce sujet.

## Configurer les sources dans PIERRE

1. Ouvrez `Administration` puis `Encyclopédie` dans l'application desktop.
2. Cliquez sur `Ajouter des fichiers` et sélectionnez vos documents.
3. Donnez à chaque contenu un titre explicite et choisissez les profils autorisés.
4. Pour un classeur, sélectionnez les onglets à importer et indiquez la ligne contenant les en-têtes. Un CSV utilise toujours sa première ligne comme en-têtes.
5. Ajoutez l'URL de la source lorsqu'elle doit pouvoir être citée.

Un document sans profil reste visible comme `Non affecté`, mais son contenu n'est transmis à aucun agent. Après une modification, cliquez sur `Reconstruire` pour publier. Le détail de l’écran est dans [Administration · Encyclopédie](../07-user-manual/20-admin-encyclopedie.md).
