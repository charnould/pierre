# `lots_locatifs`

## Objectif

Décrire le patrimoine locatif **et** l’état courant d’occupation de chaque lot (vacance, assurance habitation, coordonnées du locataire en place) à l’instant T. Il doit **impérativement** être nommé `lots_locatifs`.

## Un rôle dual : patrimoine + occupation

`lots_locatifs` fusionne **patrimoine + occupation** en un seul export : chaque lot porte ses caractéristiques statiques et son état dynamique, ce qui élimine les jointures pour la plupart des cas d'usage.

**Fraîcheur des données** : une **mise à jour quotidienne** de ce fichier est recommandée pour que la vacance, les coordonnées locataire et les échéances d'assurance reflètent la réalité opérationnelle. Le champ `date_extraction` (socle partagé) ancre l'instant T de cette photographie.

## Entité logique

Une ligne = un **lot** (logement, garage, commerce…) — la granularité de gestion locative. Le bailleur choisit son périmètre : tout le parc ou un sous-ensemble (par type, localisation, statut, etc.).

## Colonnes normatives

`lots_locatifs` reprend l'intégralité du **socle normatif partagé** et y ajoute les colonnes obligatoires ci-dessous. Toutes doivent figurer dans l'export ([présence obligatoire](01-conventions.md#colonnes-requises-et-définitions-canoniques)) ; leurs valeurs peuvent être `null` (ex. lot vacant, RGPD, etc.).

| Champ                             | Définition canonique                                                                                                              |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `statut`                          | Valeurs autorisées : `null`, `a_vendre`, `a_demolir` `a_livrer`                                                                   |
| `nom_locataire`                   | Nom du locataire en place (ex. `Becquerel`) ; `null` si vacant                                                                    |
| `email_locataire`                 | Courriel du locataire en place (ex. `henri.becquerel@gmail.com`) ; `null` si vacant                                               |
| `telephone_locataire`             | Téléphone du locataire en place, de préférence mobile (ex. `06 11 56 39 59`) ; `null` si vacant                                   |
| `allocataire_caf`                 | 384838849030493 ou `null`                                                                                                         |
| `demande_sne`                     | 939492939399 ou `null`                                                                                                            |
| `expiration_assurance_habitation` | Date d’échéance ou de renouvellement de l’assurance habitation (ex. `2026-12-12`) ; `null` si vacant                              |
| `adresse`                         | Adresse du lot hors commune et code postal (ex. `21, rue des Pyramides`)                                                          |
| `debut_bail`                      | Date de début du quittancement (ex. `2026-12-12`) ; `null` si vacant                                                              |
| `etat_des_lieux_entrant`          | Date de l'état des lieux entrant du locataire (ex. `2026-12-12`) ; `null` si vacant                                               |
| `pre_etat_des_lieux_sortant`      | Date de la visite-conseil du locataire (ex. `2026-12-12`) ; `null` si vacant                                                      |
| `etat_des_lieux_sortant`          | Date de l'état des lieux sortant du locataire (ex. `2026-12-12`) ; `null` si vacant                                               |
| `fin_bail`                        | Date de fin du quittancement (ex. `2026-12-12`) ; `null` si vacant                                                                |
| `surface_en_m2`                   | Surface du lot en m² ; renseignée pour tous les lots (y compris vacants)                                                          |
| `loyer_mensuel_en_euros`          | Loyer mensuel en vigueur en euros (avec ou sans charges, au choix du bailleur) ; renseigné pour tous les lots (y compris vacants) |

## Règles d’occupation et vacance

**Définition de la vacance**

Seul `id_locataire` et `id_client` font foi (`null` ou vide). Ne pas créer de colonne redondante du type `est_loue` ou `vacant` : c'est une redondance qui risque de confondre PIERRE.

**Conséquences (champs null lors de vacance)**

Lot vacant : les colonnes suivantes doivent être `null` : `id_client`, `id_locataire`, `nom_locataire`, `email_locataire`, `telephone_locataire`, `allocataire_caf`, `demande_sne`, `expiration_assurance_habitation`, `debut_bail`, `etat_des_lieux_entrant`, `pre_etat_des_lieux_sortant`, `etat_des_lieux_sortant`, `fin_bail` (ou plus généralement, toute colonne pour laquelle les données sont obsolètes ou inapplicables).

**Exception (caractéristiques du lot restent renseignées)**

`surface_en_m2` et `loyer_mensuel_en_euros` restent renseignés même si le lot est vacant : ce sont les propriétés du lot lui-même, pas de l'occupant actuel.

## Exemples de colonnes libres

**Gestion patrimoniale**

- `nature_du_lot` : logement, commerce, garage
- `typologie` : T1, T2, T3, T3bis
- `financement` : PLAI, PLUS, PLS, Libre
- `adaptation_handicap` : logement labellisable HSS, logement labellisé HSS
- `chauffage` : collectif ou individuel
- `ascenseur` : oui, non
- `prestataire_de_chauffage` : Iserba, X, Y

**Gestion locative**

- `charge_gestion_locative` : email du chargé de gestion locative
- `charge_de_commercialisation` : email du chargé de commercialisation
- `charge_de_proximite` : email du chargé de proximité
- `prise_en_gestion` : date (ex. `1984-12-12`)

**Caractéristiques énergétiques et environnementales**

- `classe_consommation_energetique` : A, B, C, D, E, F
- `classe_emission_gaz` : A, B, C, D, E, F

**Localisation et zones**

- `quartier_prioritaire_de_la_ville_(QPV)` : Résidence A, Résidence X…
- `zone_anru` : oui, non
- `incivilite` : oui, non
