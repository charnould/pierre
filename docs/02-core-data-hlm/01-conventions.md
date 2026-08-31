# Conventions

Ce chapitre définit les **conventions transverses applicables à tous les fichiers** : format, dates, nommage, colonnes libres. Elles garantissent que chaque export est exploitable par n'importe quel agent, sans ambiguïté ni perte d'information.

## Format d’entrée

Chaque export doit respecter les règles ci-dessous.

| Règle            | Détail                                                                      |
| ---------------- | --------------------------------------------------------------------------- |
| Format accepté   | `csv`                                                                       |
| Encodage         | `UTF-8` (avec ou sans BOM)                                                  |
| Séparateur       | point-virgule (`;`) — convention française                                  |
| Structure        | une ligne = une entité ; **ligne d’en-tête obligatoire** (noms de colonnes) |     |
| Nom des fichiers | nom logique inchangé (`lots_locatifs`, `reclamations`, etc.)                |

> [!NOTE]
> À ce jour (août 2026), PIERRE ne prend en charge à l’import que les formats `.xlsx`, `.xls`, `.xlsm` et `.xlsb`. Le `.csv` le sera prochainement.

## Transmission des fichiers

Le référentiel est **agnostique au canal** de transmission : il décrit le contenu des exports, pas la façon de les acheminer.

> [!NOTE]
> Avec PIERRE, deux canaux sont possibles : **manuel** (dépôt via l'**interface d'administration** de PIERRE, authentifiée par session) ou **automatisé via la DSI** (envoi par un appel **cURL authentifié** ; idéal pour **automatiser** les dépôts et **rafraîchir** périodiquement les données sans intervention humaine).

## Formats de dates

Toute colonne de type `date` doit être au format **ISO 8601** : `YYYY-MM-DDTHH:MM:SS` — ex. `2026-06-15T14:30:00` (la partie `T…` est optionnelle : `YYYY-MM-DD` suffit si le temps n'est pas pertinent).

Ce format est optimal : non ambigu, naturellement triable par ordre chronologique, simple à manipuler par les logiciels et directement exploitable par les agents.

Aucune information de fuseau horaire n'est stockée ; l'heure est toujours interprétée en heure locale du bailleur.

## Conventions `id_` et `nom_`

Pour une même entité, le référentiel distingue deux types de colonnes complémentaires :

- **`id_XYZ`** — identifiant **informatique stable** pour écrire du SQL, croiser les fichiers et garantir des jointures stables dans le temps. Ne sert généralement pas d’étiquette affichée. Exemple : `id_batiment` = `BAT-5385-01`.
- **`nom_XYZ`** — **pendant lisible** pour l’humain et l’agent (libellé métier, nom d’agence, nom de site…) pour les briefs, la lecture métier et l’inférence agentique sans ambiguïté. Exemple : `nom_batiment` = `Henri Becquerel`.

Le préfixe `id_` est réservé aux clés de jointures. Le bailleur est libre d'ajouter d’autres paires `id_*` / `nom_*` explicites à condition que le nommage reste auto-compréhensible.

## Unicité et redondance

1. **Noms de colonnes uniques** — aucun nom de colonne en doublon dans un même fichier.
2. **Pas de doublons de concepts** — ne pas recréer une notion déjà couverte par le socle normatif partagé (ex. ne pas ajouter `agence` quand `id_organisation_7` existe déjà).
3. **Ne pas redonder le nom du fichier** — si une colonne est spécifique à `comptes_locataires`, ne pas la préfixer avec `comptes_` (ex. `categorie` suffit, pas `categorie_comptes`). **Exception** : préfixe utile pour lever une ambiguïté réelle (`date_exigibilite` vs `date_extraction`).

## Colonnes requises et définitions canoniques

- **Présence obligatoire** : toute colonne normative doit **figurer dans l'export** avec le **nom exact** indiqué (en-tête présent).
- **Valeur nullable** : quand un champ n'est pas applicable, la cellule peut rester vide (interprétée comme `null`) — la présence de l'en-tête n'impose pas de remplissage.
- **Ordre libre** : l'ordre des colonnes n'a aucune importance.

## L'email professionnel comme identifiant stable

Pour les affectations de collaborateurs (chargé de gestion, assigné réclamation…), utiliser l'email professionnel : c'est un identifiant normalisé et stable pour les jointures inter-fichiers.

> [!NOTE]
> À l’import, **PIERRE** normalise les emails des colonnes `email_locataire`, `telephone_locataire` et `email_client` — trim + minuscules + contrôle de syntaxe.

## Format des numéros de téléphone

Pour `telephone_locataire`, `telephone_client`, `telephone_candidat`, privilégier dans la mesure du possible un **mobile**. Les formes libres (`06 11 56 39 59`, espaces, points) sont acceptées à l’export, mais la forme **E.164** est souhaitable.

> [!NOTE]
> À l’import, **PIERRE** normalise les téléphones — nettoyage déterministe (espaces, `.`, `-`, lettres ; `00` → `+`), puis `libphonenumber` pour obtenir la forme **E.164** (ex. `+33611563959`).

## Segmentation hiérarchique

Pour une taxonomie multi-niveaux, **`_1` = le niveau le plus fin**, **chiffre le plus élevé = le plus général** — ex. `qualification_1` (le plus fin) → `qualification_4` (le plus agrégé).

## Colonnes libres

Chaque bailleur peut enrichir ses exports avec des colonnes additionnelles — c'est **l'extensibilité intra-fichier**. Ces colonnes libres restent soumises aux règles ci-dessous :

- Le nom de la colonne doit **impérativement** être explicite (ex. `sm2` est incompréhensible ; `surface_en_m2` est auto-explicatif).
- Respecter les règles d’unicité et redondance.
- Lorsqu'une colonne libre fait partie d'une segmentation à plusieurs niveaux, appliquer la règle transversale sur les suffixes `_1`, `_2`… (chiffre le plus grand = niveau le plus général).
- Le nom de la colonne doit contenir dans la mesure du possible l’unité de mesure (ex. `surface_en_m2`, `loyer_en_euros`).
- Les valeurs booléennes ou discrètes doivent être explicites (ex. préférer `oui`/`non` à `o`/`n`, `individuel`/`collectif` à `I`/`C`).
- Les noms de colonnes peuvent inclure des majuscules, accents et espaces.

> [!NOTE]
> À l’import, PIERRE normalise les noms de colonnes (casse, accents, espaces) pour garantir une exploitation homogène.
