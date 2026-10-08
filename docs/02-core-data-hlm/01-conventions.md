##### [PIERRE](../index.md) ∕ [CORE DATA HLM](index.md) ∕ CONVENTIONS

# Conventions

Ce chapitre définit les **conventions transverses applicables à tous les fichiers** : format, dates, nommage, colonnes libres. Elles garantissent que chaque export est exploitable par n'importe quel agent, sans ambiguïté ni perte d'information.

## Transmission des fichiers

Le référentiel est **agnostique au canal** de transmission : il décrit le contenu des exports, pas la façon de les acheminer.

## Format d’entrée

Chaque export doit respecter les règles ci-dessous.

| Règle            | Détail                                                                      |
| ---------------- | --------------------------------------------------------------------------- |
| Format accepté   | `csv`                                                                       |
| Encodage         | `UTF-8` (avec ou sans BOM)                                                  |
| Séparateur       | point-virgule (`;`) — convention française                                  |
| Structure        | une ligne = une entité ; **ligne d’en-tête obligatoire** (noms de colonnes) |     |
| Nom des fichiers | `core.<nom_logique>.csv` (noms réservés)                                    |

## Format des dates

Toute colonne de type `date` doit être au format **ISO 8601** : `YYYY-MM-DDTHH:MM:SS` — ex. `2026-06-15T14:30:00` (la partie `T…` est optionnelle : `YYYY-MM-DD` suffit si le temps n'est pas pertinent).

Ce format est optimal : non ambigu, naturellement triable par ordre chronologique, simple à manipuler par les logiciels et directement exploitable par les agents.

Aucune information de fuseau horaire n'est stockée ; l'heure est toujours interprétée en heure locale du bailleur.

## Format des nombres

Les décimales sont marquées par le point (`.`). Exemple : `345.75`.

## Format des numéros de téléphone

Privilégier systématiquement un **téléphone mobile**.

La forme **E.164** est attendue (ex : `+33611563959`). Les formes nationales utilisant les séparateurs usuels (ex : `06 11 56 39 59`) sont tolérées et normalisées en E.164 à l’import. Toute autre forme est considérée comme invalide.

## Segmentation hiérarchique

Pour une taxonomie multi-niveaux, **`_1` = le niveau le plus fin**, **chiffre le plus élevé = le plus général** — ex. `qualification_1` (le plus fin : fuite de lavabo) → `qualification_4` (le plus agrégé : réclamation technique).

## L'email professionnel comme identifiant stable des collaborateurs

Pour les affectations de collaborateurs (chargé de gestion, responsable de site…), utiliser l'email professionnel **en lowercase** : c'est un identifiant normalisé et stable pour les jointures inter-fichiers.

## Conventions `id_` et `nom_`

Pour une même entité, le référentiel distingue deux types de colonnes :

- **`id_XYZ`** (ex : `id_batiment` = `BAT-5385-01`) — identifiant **informatique stable** pour écrire du SQL, croiser les fichiers et garantir des jointures stables dans le temps. Ne sert généralement pas d’étiquette affichée. Le préfixe `id_` est réservé aux clés de jointures.
- **`nom_XYZ`** (ex : `nom_batiment` = `Henri Becquerel`) — **pendant lisible** de `id_XYZ` pour l’humain et l’agent IA : libellé métier, nom d’agence, nom de site…

## Colonnes requises et définitions canoniques

- **Présence obligatoire** : toute colonne normative doit **figurer dans l'export** avec le **nom exact** indiqué (en-tête présent).
- **Valeur nullable** : quand un champ n'est pas applicable, la cellule peut rester vide (interprétée comme `null`) — la présence de l'en-tête n'impose pas de remplissage.
- **Ordre libre** : l'ordre des colonnes n'a aucune importance.

## Unicité et redondance

1. **Noms de colonnes uniques** — aucun nom de colonne en doublon dans un même fichier.
2. **Pas de doublons de concepts** — ne pas recréer une notion déjà couverte par le socle normatif partagé (ex. ne pas ajouter `agence` quand `id_agence` existe déjà).
3. **Ne pas redonder le nom du fichier dans les noms de colonne** — si une colonne est spécifique à `comptes_locataires`, ne pas la préfixer avec `comptes_` (ex. `categorie` suffit, pas `categorie_comptes`). **Exception** : préfixe utile pour lever une ambiguïté réelle (`date_exigibilite` vs `date_extraction`).

## Colonnes libres

Chaque bailleur peut enrichir ses exports avec des colonnes additionnelles — c'est **l'extensibilité intra-fichier**. Ces colonnes libres restent soumises aux règles ci-dessous :

- Le nom de la colonne doit **impérativement** être explicite (ex. `sm2` est incompréhensible ; `surface_en_m2` est auto-explicatif).
- Respecter les règles d’unicité et redondance.
- Lorsqu'une colonne libre fait partie d'une segmentation à plusieurs niveaux, appliquer la règle transversale sur les suffixes `_1`, `_2`… (chiffre le plus grand = niveau le plus général).
- Le nom de la colonne doit contenir l’unité de mesure (ex. `surface_en_m2`, `loyer_en_euros`).
- Les valeurs booléennes ou discrètes doivent être explicites (ex. préférer `oui`/`non` à `o`/`n`, `individuel`/`collectif` à `I`/`C`).
- Les noms de colonnes sont en `snake_case` sans accent : `mon_nom_de_colonne`.
- Utiliser le point (`.`) pour les décimales : `345.75`

<div style="display: flex; justify-content: space-between; margin-top:50px"><p>←<a href="index.md"> Introduction</a></p><p><a href="02-socle.md">Socle</a>→</p></div>
