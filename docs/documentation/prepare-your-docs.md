# Guide : préparer vos documents pour `PIERRE`

Ce guide explique quels formats de fichiers `PIERRE` accepte, comment les préparer pour maximiser la qualité de ses réponses, et comment renseigner le fichier `_metadata.xlsx` — indispensable pour que `PIERRE` sache quoi lire et à qui répondre.

## Sommaire

<!-- toc -->

- [Quels fichiers sont acceptés par `PIERRE` pour enrichir sa base de connaissances](#quels-fichiers-sont-accept%C3%A9s-par-pierre-pour-enrichir-sa-base-de-connaissances)
- [Comment bien préparer vos documents ?](#comment-bien-pr%C3%A9parer-vos-documents)
  - [Préparer vos documents `.doc`/`.docx` et `.md`](#pr%C3%A9parer-vos-documents-docdocx-et-md)
  - [Préparer vos fichiers `.xls`/`.xlsx`/`.xlsm`/`.xlsb`](#pr%C3%A9parer-vos-fichiers-xlsxlsxxlsmxlsb)
- [`_metadata.xlsx` : un fichier pour les gouverner tous (obligatoire)](#_metadataxlsx--un-fichier-pour-les-gouverner-tous-obligatoire)

<!-- tocstop -->

## Quels fichiers sont acceptés par `PIERRE` pour enrichir sa base de connaissances

Les organismes de logement social (OLS) peuvent alimenter `PIERRE` avec leurs propres données pour obtenir des réponses précisément adaptées à leur contexte — par exemple, les coordonnées du service-client ou les procédures internes d'attribution.

`PIERRE` reconnaît trois formats :

- `.xls`/`.xlsx`/`.xlsm`/`.xlsb` (Microsoft Excel)
- `.doc`/`.docx` (Microsoft Word)
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

### Préparer vos documents `.doc`/`.docx` et `.md`

Qu'il s'agisse d'un modèle de courrier, d'une note de service sur le déroulé d'une CALEOL ou de la description du processus d'attribution d'un OLS, ces fichiers sont tous traités comme du texte brut par `PIERRE`.

Rédigez-les comme vous le feriez pour un nouveau collègue qui ne connaît rien du contexte :

- Utilisez des titres et sous-titres clairs
- Limitez chaque section à un seul sujet
- Regroupez les informations similaires au même endroit
- Définissez les acronymes — ou mieux, évitez-les
- Soignez l'orthographe et la grammaire
- En Markdown, respectez le balisage : titres, listes, gras, italique

> [!CAUTION]
> Les images intégrées dans vos fichiers `.doc`/`.docx` et `.md` **ne sont pas interprétées** par `PIERRE`.

### Préparer vos fichiers `.xls`/`.xlsx`/`.xlsm`/`.xlsb`

1. **Structurez vos données en tableau**, pas en mise en page visuelle. Chaque ligne doit correspondre à une entrée autonome et lisible ligne par ligne — à l'opposé d'un texte mis en forme à coups de cellules fusionnées.
   - À gauche : un vrai tableau, chaque ligne est une donnée exploitable.
   - À droite : une mise en forme visuelle, illisible automatiquement.

<p float="left">
  <img src="../assets//images/documentation/ok.png" width="350" />
  <img src="../assets//images/documentation/ko.png" width="350" />
</p>

2. **Donnez des noms de colonnes explicites**, compréhensibles sans contexte. `49_3` est une référence opaque ; `Solde locataire` est immédiatement lisible.

3. **Soyez cohérent** dans les majuscules/minuscules et évitez les acronymes ambigus.

4. **Ne fusionnez pas les cellules** — ou seulement en dernier recours.

5. **Ajoutez une colonne de regroupement** si nécessaire. Par exemple, une colonne `type` avec les valeurs `scientifique`, `écrivain`, `philosophe`, `politique` permet à `PIERRE` de retrouver d'un coup tous les écrivains quand vous l'interrogez sur ce sujet.

## `_metadata.xlsx` : un fichier pour les gouverner tous (obligatoire)

Sans `_metadata.xlsx`, `PIERRE` est incapable d'ingérer vos données. Ce fichier lui indique deux choses essentielles :

- La stratégie d'importation à appliquer à chaque fichier
- Les profils utilisateurs autorisés à accéder à chaque donnée

Il est téléchargeable depuis la page `Encyclopédie` de l'interface d'administration :

![_metadata.xlsx](../assets//images/documentation/_metadata.png)

- Pour les fichiers `.doc`/`.docx` et `.md`, renseignez uniquement les colonnes `A`, `B` et `E`.
- Pour les fichiers `.xls`/`.xlsx`/`.xlsm`/`.xlsb`, les cinq colonnes `A` à `E` sont obligatoires.

---

- **Colonne A** — Nom exact du fichier, caractère pour caractère.  
  👉 Toute différence avec le nom réel : `PIERRE` ignore le fichier.

- **Colonne B** — Profils utilisateurs autorisés à accéder à cette donnée.  
  Exemple : à la ligne 5, `PIERRE` ne communique le contenu de `Bonnes pratiques pour les agents d'accueil.docx` qu'aux collaborateurs ayant le profil `agent`.

- **Colonne C** _(fichiers Excel uniquement)_ — Numéro de l'onglet à importer (1 = premier onglet, 2 = deuxième…).  
  👉 Pour importer 3 onglets d'un même fichier, créez 3 lignes dans `_metadata.xlsx`.

- **Colonne D** _(fichiers Excel uniquement)_ — Numéro de la ligne contenant les en-têtes de colonnes. Cette ligne peut se trouver en position 1, 2 ou 25 selon l'onglet — indiquez-la précisément. Dans l'exemple plus haut, la ligne d'en-têtes est la 2.

- **Colonne E** — Intitulé descriptif du fichier.  
  Un nom de fichier comme `export_mars.xlsx` ne dit rien à `PIERRE`. Indiquez ici un intitulé clair, par exemple `Liste des locataires avec soldes négatifs au 31 mars`. Plus l'intitulé est précis, plus `PIERRE` navigue efficacement dans vos données.
