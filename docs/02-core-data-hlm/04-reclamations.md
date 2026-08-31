# `reclamations`

## Objectif

Exposer **toutes les affaires relation-client** (réclamations, demandes, tickets…) pour une **vue intégrale** de la relation locataire. Il doit **impérativement** être nommé `reclamations`.

**Périmètre recommandé** :

- **Historique complet** : toutes les réclamations depuis l’origine, sur le **patrimoine actuellement en gestion** — permet de reconstituer 100 % des affaires d’un lot, **quel que soit le locataire** ayant occupé le lot.
- **Affaires orientées client** : uniquement les dossiers adressés aux locataires (ou candidats).

**Fraîcheur des données** : une **mise à jour horaire** de ce fichier est recommandée — cas d’usage typique : routine de **pré-prise de poste d’astreinte** (vue à jour des affaires en cours, changements de statut, derniers événements).

## Entité logique

Une ligne = une **réclamation** (affaire, dossier, ticket…), identifiée de façon unique et stable par `id_reclamation`.

## Colonnes normatives

`reclamations` reprend l’intégralité du **[socle normatif partagé](02-socle.md)** et y ajoute les colonnes spécifiques ci-dessous. Toutes doivent figurer dans l’export ([présence obligatoire](01-conventions.md#colonnes-requises-et-définitions-canoniques)) ; leurs valeurs peuvent être `null` lorsque le champ n’est pas applicable.

| Champ                       | Historisation auto. | Définition canonique                                                                                                                                                                                |
| --------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id_reclamation`            | non                 | Identifiant unique et stable de l’affaire dans le SI bailleur (ex. `677885`)                                                                                                                        |
| `message_initial`           | non                 | Contenu intégral du message initial de l’affaire                                                                                                                                                    |
| `ids_locataires_concernes`  | non                 | Liste des `id_locataire` ayant eu un lien avec l’affaire sur le lot, séparés par des virgules (ex. `00021048207, 00021048412`) ; `null` si non applicable                                           |
| `dernier_evenement_le`      | oui                 | Date du dernier événement enregistré sur l’affaire ; idéalement une date ISO 8601 avec l'horaire précise                                                                                            |
| `dernier_evenement_type`    | oui                 | Type du dernier événement (ex. `Pièce jointe`)                                                                                                                                                      |
| `dernier_evenement_contenu` | oui                 | Contenu ou extrait du dernier événement                                                                                                                                                             |
| `affectation_1`             | oui                 | Collaborateur nominativement en charge au moment de la génération de l'export : **email professionnel** (ex. `collaborateur@bailleur.fr`) ; cf. règle transversale sur les affectations nominatives |
| `affectation_2`             | oui                 | Service ou unité la plus fine en charge (ex. `Gestion Locative`, `Agence 5 - Mansart`)                                                                                                              |
| `affectation_3`             | oui                 | Niveau organisationnel intermédiaire (ex. `Service Location`, `Service proximité`)                                                                                                                  |
| `affectation_4`             | oui                 | Niveau organisationnel le plus agrégé (ex. `Direction Commerciale`, `Direction Relation Client`)                                                                                                    |

TODO: quid d'email et téléphone du client/locataire
TODO: quid de normaliser affectation (comme gestionnaire pour le recouvrement) pour pouvoir utiliser les notifications

## Historisation par PIERRE

> [!NOTE]
> **Le problème** : le SI bailleur ne livre qu'une photo instantanée (datée par `date_extraction`), sans mémoire des changements opérationnels.
>
> **La solution PIERRE** : à chaque import (idéalement horaire), PIERRE diffe ligne à ligne (clé `id_reclamation`) l'export courant contre le précédent. Deux régimes selon la colonne :
>
> - **colonnes historisées** → toute variation de valeur devient un événement de progression, empilé dans le temps pour reconstituer la trajectoire de l'affaire ;
> - **colonnes non historisées** → simple snapshot : seule la dernière valeur connue est gardée, sans trace des changements passés.
>
> Les 7 colonnes historisées : `dernier_evenement_le`, `dernier_evenement_type`, `dernier_evenement_contenu`, `affectation_1`, `affectation_2`, `affectation_3`, `affectation_4`.
>
> **Pourquoi c'est stratégique** : ce mécanisme (automatique, sans action du bailleur) rend ce fichier unique dans PIERRE et permet de constuire le « cycle de vie » d'une réclamation.

## Exemples de colonnes libres

**Taxonomie / Qualification**

- `qualification_1` : Qualification la plus fine de l'affaire (ex. `punaise de lit`, `infiltration d'eau`)
- `qualification_2` : Qualification intermédiaire supérieure (niveau 2)
- `qualification_3` : Qualification intermédiaire supérieure (niveau 3)
- `qualification_4` : Qualification la plus agrégée de la taxonomie (ex. `technique`, `administratif`, `autres`)

**État et traitement**

- `vu_par_bailleur` : L'affaire a-t-elle été vue par le bailleur ? (ex. `oui`, `non`)
- `cree_le` : Date et heure de création de l'affaire (ex. `2026-06-15T14:30:00`)
- `cloture_le` : Date et heure de clôture (ex. `2026-06-15T14:30:00`) ; `null` si affaire ouverte
- `canal_contact` : Canal d'origine (ex. `appel entrant`, `courrier simple`, `agence virtuelle`)

**Contexte spatial et métier**

- `perimetre` : Portée spatiale de l'affaire (ex. `logement`, `batiment`, `site`)
