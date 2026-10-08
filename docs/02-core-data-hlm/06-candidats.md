##### [PIERRE](../index.md) ∕ [CORE DATA HLM](index.md) ∕ CANDIDATS

# `core.candidats.csv`

`> v1.0.0-alpha (2026-10-10)` - Réflexion en cours

## Objectif

Exposer **tous les candidats qu'il y a eu** sur les lots actuellement en gestion. Cas d'usage : suivi de l'attribution, gestion des réservataires, jointure avec les rotations de lots.

Le fichier est nommé `core.candidats.csv`.

## Nature du fichier : photographie des candidats à un logement social

Chaque export est une photographie datée par `date_extraction` portant la **photographie intégrale des candidats**. Le fichier inclut les candidats en cours, acceptés, refusés, désistés... — l'état est porté par les colonnes `date_acceptation` / `date_refus` / `date_caleol`.

## Entité logique

Une ligne = un **candidat**, identifié de façon unique et stable par `id_candidat`.

## Colonnes normatives

`candidats` reprend l'intégralité du [socle normatif partagé](02-socle.md) et y ajoute les colonnes spécifiques ci-dessous. Toutes doivent figurer dans l'export ([présence obligatoire](01-conventions.md#colonnes-requises-et-définitions-canoniques)) ; leurs valeurs peuvent être `null` lorsque le champ n'est pas applicable.

| Champ                       | Définition canonique                                                                                |
| --------------------------- | --------------------------------------------------------------------------------------------------- |
| `id_candidat`               | Identifiant unique et stable du candidat                                                            |
| `contingent`                | Contingent (gestion en flux) du candidat (`prefeecture`, `action_logement`, `mairie`, `null`, etc.) |
| `nom_candidat`              | Nom du candidat (ex. `Becquerel`)                                                                   |
| `email_candidat`            | Email du candidat (ex. `henri.becquerel@gmail.com`)                                                 |
| `telephone_candidat`        | Téléphone du candidat, de préférence mobile (ex. `+33621835027`)                                    |
| `date_creation`             | Date de création de la candidature à un logement donné (ex. `2025-12-10`)                           |
| `date_expiration`           | Date d'expiration de la candidature (ex. `2025-12-20`) ; `null` si non applicable                   |
| `date_caleol`               | Date de tenue de la CALEOL (ex. `2025-02-02`) ; `null` si non applicable                            |
| `date_acceptation_caleol`   | Date d'accord de la CALEOL (ex. `2025-01-08`) ; `null` si non accepté                               |
| `date_rejet_caleol`         | Date de rejets de la CALEOL (ex. `2025-01-08`) ; `null` si non refusé                               |
| `date_visite_logement`      | Date de la visite du logement par le candidat (ex. `2025-01-08`) ; `null` si non effectuée          |
| `date_acceptation_candidat` | Date d'acceptation par le candidat du logement (ex. `2025-01-08`) ; `null` si non accepté           |
| `date_refus_candiat`        | Date de refus par le candidat du logement (ex. `2025-01-08`) ; `null` si non refusé                 |

## Exemples de colonnes libres

> Ces colonnes ne sont pas obligatoires, il s'agit de suggestions pour enrichir `core.candidats.csv`.

**Profil et situation**

- `sne_candidat` : numéro d'enregistrement unique (ex. `SNE-12345`)
- `situation_familiale` : seul(e), couple, monoparental, famille
- `nombre_enfants` : nombre d'enfants à charge
- `revenus_mensuels_euros` : revenus déclarés en euros

**Critères d'attribution**

- `priorite_attribution` : prioritaire, normal, liste_attente
- `motif_priorite` : mal_loge, suroccupation, accident_sinistre
- `mobilite_professionnelle` : oui, non

<div style="display: flex; justify-content: space-between; margin-top:50px"><p>←<a href="./05-travaux.md">core.travaux.csv</a></p><p><a href="./07-comptes-locataires.md">core.comptes_locataires.csv</a>→</p></div>
