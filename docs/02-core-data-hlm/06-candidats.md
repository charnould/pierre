# `candidats`

> [!NOTE]
> Chapitre en **préfiguration** : l'intégration du réservataire (en flux et en stock) reste à préciser.

## Objectif

Exposer **tous les candidats à un logement social** depuis les 800 derniers jours sur les lots actuellement en gestion. Cas d'usage : suivi de l'attribution, gestion des réservataires, jointure avec les rotations de lots.

Il doit **impérativement** être nommé `candidats`.

## Nature du fichier : photographie du portefeuille candidats

Chaque export est une photographie datée par `date_extraction` portant l'**état courant du portefeuille candidats** sur la période considérée (800 derniers jours recommandés). Le fichier inclut candidats en cours, acceptés et refusés — l'état est porté par les colonnes `date_acceptation` / `date_refus` / `date_caleol`.

## Entité logique

Une ligne = un **candidat**, identifié de façon unique et stable par `id_candidat`.

## Colonnes normatives

`candidats` reprend l'intégralité du **[socle normatif partagé](02-socle.md)** et y ajoute les colonnes spécifiques ci-dessous. Toutes doivent figurer dans l'export ([présence obligatoire](01-conventions.md#colonnes-requises-et-définitions-canoniques)) ; leurs valeurs peuvent être `null` lorsque le champ n'est pas applicable.

| Champ                | Définition canonique                                                                      |
| -------------------- | ----------------------------------------------------------------------------------------- |
| `id_candidat`        | Identifiant unique et stable du candidat                                                  |
| `nom_candidat`       | Nom du candidat (ex. `Becquerel`)                                                         |
| `email_candidat`     | Email du candidat (ex. `henri.becquerel@gmail.com`)                                       |
| `telephone_candidat` | Téléphone du candidat, de préférence mobile (ex. `06 21 80 49 69`)                        |
| `date_creation`      | Date d'enregistrement de la candidature (ex. `12/12/2025`)                                |
| `date_expiration`    | Date d'expiration de la candidature (ex. `18/12/2025`) ; `null` si non applicable         |
| `date_visite`        | Date de la visite du candidat (ex. `16/12/2025`) ; `null` si non effectuée                |
| `date_acceptation`   | Date d'acceptation du logement par le candidat (ex. `17/12/2025`) ; `null` si non accepté |
| `date_refus`         | Date de refus du logement ou de la candidature (ex. `19/12/2025`) ; `null` si non refusé  |
| `date_caleol`        | Date d'enregistrement au CALEOL (ex. `20/12/2025`) ; `null` si non applicable             |

## Exemples de colonnes libres

**Profil et situation**

- `sne_candidat` : numéro d'enregistrement unique (ex. `SNE-12345`)
- `situation_familiale` : ex. `seul(e)`, `couple`, `monoparental`, `famille`
- `nombre_enfants` : nombre d'enfants à charge
- `revenus_mensuels_euros` : revenus déclarés en euros

**Critères d'attribution**

- `priorite_attribution` : ex. `prioritaire`, `normal`, `liste_attente`
- `motif_priorite` : ex. `mal_loge`, `suroccupation`, `accident_sinistre`
- `mobilite_professionnelle` : ex. `oui`, `non`
