##### [PIERRE](../index.md) ∕ [CORE DATA HLM](index.md) ∕ RECLAMATIONS

# core.reclamations.csv

> [!NOTE]
> work-in-progress (2026-11-01) — Réflexion en cours

## Objectif

Exposer **toutes les affaires relation-client** (réclamations, demandes, tickets…) pour une **vue intégrale** de la relation locataire.

Le fichier est nommé `core.reclamations.csv`.

**Périmètre recommandé** :

- **Historique complet** : toutes les réclamations depuis l’origine, sur le **patrimoine actuellement en gestion** — permet de reconstituer 100 % des affaires d’un lot, **quel que soit le locataire** ayant occupé le lot.
- **Affaires orientées client** : uniquement les dossiers adressés aux locataires (ou candidats).

**Fraîcheur des données** : une **mise à jour horaire** de ce fichier est recommandée — cas d’usage typique : routine de **pré-prise de poste d’astreinte** (vue à jour des affaires en cours, changements de statut, derniers événements).

## Entité logique

Une ligne = une **réclamation** (affaire, dossier, ticket…), identifiée de façon unique et stable par `id_reclamation`.

## Colonnes normatives

`core.reclamations.csv` reprend l’intégralité du [socle normatif partagé](02-socle.md) et y ajoute les colonnes spécifiques ci-dessous. Toutes doivent figurer dans l’export ; leurs valeurs peuvent être `null` lorsque le champ n’est pas applicable.

| Champ                                          | Historisation auto. | Définition canonique                                                                                                                                                                                                                                     |
| ---------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id_reclamation`                               | non                 | Identifiant unique et stable de l’affaire dans le SI bailleur (ex. `677885`)                                                                                                                                                                             |
| `message`                                      | non                 | Contenu intégral du message initial de l’affaire                                                                                                                                                                                                         |
| `ids_locataires_concernes`                     | non                 | Liste des `id_locataire` ayant eu un lien avec l’affaire sur le lot, séparés par des virgules (ex. `00021048207, 00021048412`) ; `null` si non applicable                                                                                                |
| `dernier_evenement_le`                         | oui                 | Date du dernier événement enregistré sur l’affaire ; idéalement une date ISO 8601 avec l'horaire précise                                                                                                                                                 |
| `dernier_evenement_type`                       | oui                 | Type du dernier événement (ex. `Pièce jointe`)                                                                                                                                                                                                           |
| `dernier_evenement_contenu`                    | oui                 | Contenu ou extrait du dernier événement                                                                                                                                                                                                                  |
| `email_collaborateur_en_charge`                | oui                 | Collaborateur nominativement en charge : **email professionnel** en minuscules (ex. `collaborateur@bailleur.fr`). Cellule vide si l'annuaire n'en fournit pas. Cette adresse est la clé d'une notification ; la colonne ne déclenche rien par elle-même. |
| `unite_organisationnelle_en_charge_hierarchie` | oui                 | Unités en charge, de la plus générale à la plus précise (ex. `direction_relation_client > service_proximite > agence_5_mansart`)                                                                                                                         |

## Historisation par PIERRE (réflexion en cours)

> [!NOTE]
> **Le problème** : le SI bailleur ne livre qu'une photo instantanée (datée par `date_extraction`), sans mémoire des changements opérationnels.
>
> **La solution PIERRE** : à chaque import (idéalement horaire), PIERRE diffe ligne à ligne (clé `id_reclamation`) l'export courant contre le précédent. Deux régimes selon la colonne :
>
> - **colonnes historisées** → toute variation de valeur devient un événement de progression, empilé dans le temps pour reconstituer la trajectoire de l'affaire ;
> - **colonnes non historisées** → simple snapshot : seule la dernière valeur connue est gardée, sans trace des changements passés.
>
> Les 5 colonnes historisées : `dernier_evenement_le`, `dernier_evenement_type`, `dernier_evenement_contenu`, `email_collaborateur_en_charge`, `unite_organisationnelle_en_charge_hierarchie`.
>
> **Pourquoi c'est stratégique** : ce mécanisme (automatique, sans action du bailleur) rend ce fichier unique dans PIERRE et permet de constuire le « cycle de vie » d'une réclamation.

## Exemples de colonnes libres

> Ces colonnes ne sont pas obligatoires, il s'agit de suggestions pour enrichir `core.reclamations.csv`.

**Taxonomie / Qualification**

- `qualification_hierarchie` : Qualification de l'affaire, du plus général au plus précis (ex. `technique > plomberie > fuite_de_lavabo`)

> Lorsque vous utilisez PIERRE, nous ne recommandons pas d'ajouter ces notions de `qualification`. En effet, PIERRE utilise [CARL](../03-core-models-hlm/CARL.md) pour qualifier finement les réclamations. Dans ce cas, **aucune colonne** ne peut être nommée `domaine`, `sous_domaine`, `motif`, `integrite_physique`, `lieu`, `obligation_reglementaire` et `ton`.

**État et traitement**

- `vu_par_bailleur` : L'affaire a-t-elle été vue par le bailleur ? (ex. `oui`, `non`)
- `cree_le` : Date et heure de création de l'affaire (ex. `2026-06-15T14:30:00`)
- `cloture_le` : Date et heure de clôture (ex. `2026-06-15T14:30:00`) ; `null` si affaire ouverte
- `canal_contact` : Canal d'origine (ex. `appel entrant`, `courrier simple`, `agence virtuelle`)

**Contexte spatial et métier**

- `perimetre` : Portée spatiale de l'affaire (ex. `logement`, `batiment`, `site`)

<div style="display: flex; justify-content: space-between; margin-top:50px"><p>←<a href="./03-lots-locatifs.md">core.lots_locatifs.csv</a></p><p><a href="./06-candidats.md">core.candidats.csv</a>→</p></div>
