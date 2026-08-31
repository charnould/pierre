# Socle normatif

Le **socle normatif partagé** est l’ensemble des colonnes **communes et obligatoires** répétées dans chaque export des cinq fichiers-sources. C’est ce socle qui rend les jointures inter-fichiers prévisibles pour l’agent, tout en permettant des agrégations sans jointure excessive.

Ce chapitre décrit le **catalogue** de ces colonnes partagées. Pour les conventions transverses (format d’entrée, dates, règles de nommage, snapshot…), se référer aux [conventions](01-conventions.md).

## Snapshot temporel

| Clé               | Rôle ou définition                                                         | Cardinalité |
| ----------------- | -------------------------------------------------------------------------- | ----------- |
| `date_extraction` | Date de l’export ; même valeur sur toutes les lignes d’un export quotidien | N/A         |

**Modèle snapshot** — Chaque export est une **photographie** datée par `date_extraction`. L'historique des changements (turnover locataires, baux successifs, impayés) se reconstitue par analyse chronologique des fichiers complets successifs, pas par versionnage ou historique de changements ligne par ligne.

## Hiérarchie spatiale et organisationnelle

Le patrimoine se décline en clés `id_*` hiérarchiques, **répétées sur chaque export** (dénormalisées) — chaque fichier porte l'intégralité de la hiérarchie. Valeur `null` si un niveau n'existe pas dans l'organigramme du bailleur.

La numérotation des niveaux organisationnels démarre à `_6` : elle se situe **au-dessus** des cinq niveaux spatiaux (du lot au site) et suit les conventions relatives à `id_*` et à la segmentation hiérarchique (le chiffre le plus élevé désigne le niveau le plus agrégé).

| Clé                 | Rôle ou définition                                                 | Cardinalité                                   |
| ------------------- | ------------------------------------------------------------------ | --------------------------------------------- |
| `id_rpls`           | Identifiant RPLS du logement lorsque applicable (`null` hors RPLS) | —                                             |
| `id_lot`            | Unité de gestion la plus fine (logement, garage, commerce…)        | —                                             |
| `id_etage`          | Niveau dans le bâtiment                                            | 1 Étage → N Lots                              |
| `id_entree`         | Cage d’escalier, hall                                              | 1 Entrée → N Étages                           |
| `id_batiment`       | Immeuble, résidence                                                | 1 Bâtiment → N Entrées                        |
| `id_site`           | Ensemble immobilier, groupe de résidences                          | 1 Site → N Bâtiments                          |
| `id_organisation_6` | Secteur ou premier niveau organisationnel                          | 1 `id_organisation_6` → N Sites               |
| `id_organisation_7` | Agence ou niveau intermédiaire                                     | 1 `id_organisation_7` → N `id_organisation_6` |
| `id_organisation_8` | Filiale ou niveau intermédiaire                                    | 1 `id_organisation_8` → N `id_organisation_7` |
| `id_organisation_9` | Groupe ou niveau le plus agrégé                                    | 1 `id_organisation_9` → N `id_organisation_8` |
| `code_postal`       | Code postal du lot (**pas** le code INSEE)                         | 1 `code_postal` → N entités précédentes       |

> [!NOTE]
> **Localisation avec PIERRE** — Lorsque les exports alimentent PIERRE, ne **JAMAIS** exposer la commune, le département, la région, le zonage ABC/123, les coordonnées GPS, etc. — seuls `code_postal` (socle) et `id_rpls` (si applicable) suffisent. Dès qu'une colonne `code_postal` est présente, PIERRE importe à côté une table de référence `communes_par_code_postal` (code INSEE, commune, EPCI, département, région, zonages ABC et 123). Ajouter commune / département / région / zonage dans l'export créerait une redondance avec des valeurs possiblement incohérentes. **Hors PIERRE**, les bailleurs sont libres d'ajouter toutes données/colonnes de localisation supplémentaires.

## Entités locatives

Au sommet de la hiérarchie : les clés qui portent l'état actuel du locataire et du client.

| Clé            | Rôle ou définition                                                          | Cardinalité                 |
| -------------- | --------------------------------------------------------------------------- | --------------------------- |
| `id_locataire` | Dossier de facturation du locataire **en place** ; `null` si lot vacant     | —                           |
| `id_client`    | Identifiant unique de la personne physique ou morale ; `null` si lot vacant | 1 Client → N `id_locataire` |
