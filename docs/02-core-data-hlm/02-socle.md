##### [PIERRE](../index.md) ∕ [CORE DATA HLM](index.md) ∕ SOCLE NORMATIF

# Socle normatif

Le **socle normatif partagé** est l’ensemble des colonnes **communes et obligatoires** répétées dans chaque export des cinq fichiers-sources. C’est ce socle qui rend les jointures inter-fichiers prévisibles pour l’agent, tout en permettant des agrégations sans jointure excessive.

Ce chapitre décrit le **catalogue** de ces colonnes partagées.

## Snapshot temporel

| Colonne           | Rôle ou définition                                                         | Cardinalité |
| ----------------- | -------------------------------------------------------------------------- | ----------- |
| `date_extraction` | Date de l’export ; même valeur sur toutes les lignes d’un export quotidien | N/A         |

**Modèle snapshot** — Chaque export est une **photographie** datée par `date_extraction`. L'historique des changements (turnover locataires, baux successifs, impayés) se reconstitue par analyse chronologique des fichiers complets successifs, pas par versionnage ou historique de changements ligne par ligne.

## Hiérarchie spatiale et organisationnelle

Le patrimoine se décline en clés `id_*` hiérarchiques, **répétées sur chaque export** (dénormalisées) — chaque fichier porte l'intégralité de la hiérarchie. Valeur `null` si un niveau n'existe pas dans l'organigramme du bailleur.

La numérotation des niveaux organisationnels démarre à `_8` : elle se situe **au-dessus** des sept niveaux spatiaux (du lot à l'agence) et suit les conventions relatives à `id_*` et à la segmentation hiérarchique (le chiffre le plus élevé désigne le niveau le plus agrégé).

| Clé                 | Rôle ou définition                                                    | Cardinalité                                   |
| ------------------- | --------------------------------------------------------------------- | --------------------------------------------- |
| `id_rpls`           | Identifiant RPLS du logement lorsque applicable (`null` hors RPLS)    | —                                             |
| `id_lot`            | Unité de gestion la plus fine (logement, garage, commerce…)           | —                                             |
| `id_etage`          | Niveau dans le bâtiment                                               | 1 Étage → N Lots                              |
| `id_entree`         | Cage d’escalier, hall                                                 | 1 Entrée → N Étages                           |
| `id_batiment`       | Immeuble, résidence                                                   | 1 Bâtiment → N Entrées                        |
| `id_site`           | Ensemble immobilier, groupe de résidences                             | 1 Site → N Bâtiments                          |
| `id_secteur`        | Secteur ou premier niveau organisationnel                             | 1 Secteur → N Sites                           |
| `id_agence`         | Agence ou niveau intermédiaire                                        | 1 Agence → N Secteurs                         |
| `id_organisation_8` | Niveau organisationnel supérieur, pouvant regrouper plusieurs agences | 1 `id_organisation_8` → N Agences             |
| `id_organisation_9` | Niveau organisationnel le plus agrégé                                 | 1 `id_organisation_9` → N `id_organisation_8` |
| `code_postal`       | Code postal du lot (**pas** le code INSEE)                            | 1 `code_postal` → N entités précédentes       |

> [!NOTE]
> **Remarque spécifique à PIERRE** — Lorsque les exports alimentent PIERRE, ne **JAMAIS** exposer le code INSEE, la commune, l'EPCI, le département, la région, les zonages ABC et 123 et les coordonnées GPS. Dès qu'une colonne `code_postal` est présente, PIERRE importe automatiquement ces notions. Les ajouter dans l'export créerait une redondance avec des valeurs possiblement incohérentes. **Hors PIERRE**, les bailleurs sont libres d'ajouter toutes données/colonnes de localisation supplémentaires.

## Entités locatives

Au sommet de la hiérarchie : les clés qui portent l'état actuel du locataire et du client.

| Clé            | Rôle ou définition                                                          | Cardinalité                 |
| -------------- | --------------------------------------------------------------------------- | --------------------------- |
| `id_locataire` | Dossier de facturation du locataire **en place** ; `null` si lot vacant     | —                           |
| `id_client`    | Identifiant unique de la personne physique ou morale ; `null` si lot vacant | 1 Client → N `id_locataire` |

<div style="display: flex; justify-content: space-between; margin-top:50px"><p>←<a href="./01-conventions.md">Convention</a></p><p><a href="./03-lots-locatifs.md">core.lots_locatifs.csv</a>→</p></div>
