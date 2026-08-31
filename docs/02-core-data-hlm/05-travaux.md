# `travaux`

TODO: Pour les travaux avoir une date de fin « efficace » pour suivre la satisfaction de ses locataires après les interventions des prestataires sous bon de commande

## Objectif

Lister **100 % des bons de commande de travaux** émis sur le **patrimoine actuellement en gestion**, au niveau **lot**, **bâtiment** ou **site** (parties communes, résidence). Cas d'usage : pilotage vacance et relocation, suivi de l'entretien courant, recouvrement via `id_travaux` dans [`comptes_locataires`](07-comptes-locataires.md).

Il doit **impérativement** être nommé `travaux`.

## Nature du fichier : historique complet de bons de commande

Chaque export est une photographie datée par `date_extraction` portant l'**historique complet** des bons de commande du périmètre. PIERRE **reconstruit intégralement** la base à chaque import : aucun risque de doublon inter-export si l'historique est complet.

**Fraîcheur des données** : une **mise à jour quotidienne** est recommandée pour que l'avancement des chantiers et le pilotage des travaux de relocation reflètent la réalité opérationnelle.

**Périmètre recommandé** :

- **Patrimoine actuellement en gestion** : chaque bon porte les clés patrimoniales du socle (`id_lot`, `id_site`, etc.) — immuables dans le temps, jointure garantie.
- **Historique complet** : tous les bons de commande non annulés du patrimoine actuellement en gestion.
- **Familles couvertes** : entretien courant et relocation, distinguées par `contexte` — à l'exclusion de la **réhabilitation globale de programme**, qui relève d'une autre nature de travaux.

## Entité logique

Une ligne = un **bon de commande**, identifié de façon unique et stable par `id_travaux`.

## Colonnes normatives

`travaux` reprend l'intégralité du **[socle normatif partagé](02-socle.md)** et y ajoute les colonnes obligatoires ci-dessous. Toutes doivent figurer dans l'export ([présence obligatoire](01-conventions.md#colonnes-requises-et-définitions-canoniques)) ; leurs valeurs peuvent être `null` lorsque le champ n'est pas applicable.

| Champ                   | Définition canonique                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `id_travaux`            | Identifiant unique et stable du bon de commande dans le SI bailleur (ex. `34567`)                                        |
| `id_reclamation`        | Jointure **optionnelle** vers `reclamations` ; `null` si non applicable                                                  |
| `contexte`              | Famille métier du bon de commande. Trois valeurs sont autorisées : `entretien_courant`, `relocation` et `rehabilitation` |
| `type`                  | Corps d'état ou nature commandée (ex. `PLO`, `AMI`, `TCE`) ; **le diagnostic amiante doit impérativement valoir `AMI`**  |
| `montant_en_euros`      | Montant du bon de commande                                                                                               |
| `prestataire`           | Raison sociale du prestataire (ex. `expertam`)                                                                           |
| `siren_prestataire`     | Numéro SIREN/SIRET du prestataire                                                                                        |
| `cree_le`               | Date d'émission du bon de commande — correspond à la date à laquelle il a été adressé au prestataire (ex. `02/06/2022`)  |
| `debut_theorique`       | Date inscrite sur le bon de commande à laquelle les travaux doivent théoriquement débuter (ex. `02/06/2022`)             |
| `fin_theorique`         | Date inscrite sur le bon de commande à laquelle les travaux doivent théoriquement se terminer (ex. `02/06/2022`)         |
| `debut_reel`            | Date à laquelle les travaux ont réellement commencé ; `null` si non fiable ou indisponible                               |
| `fin_reelle`            | Date à laquelle les travaux se sont réellement terminés ; `null` si non fiable ou indisponible                           |
| `performance_qualite`   | Performance-qualité de la prestation, de 1 à 3 ; `null` si non fiable ou indisponible                                    |
| `prestations_realisees` | Liste textuelle des prestations attendues ; `null` si non disponible                                                     |

## Règles métier

**Locataire associé au bon de commande**

Dans `travaux`, `id_locataire` et `id_client` désignent le locataire **associé au bon** (souvent le locataire **sortant** pour `contexte = relocation`).

**Travaux sur parties communes**

Ils sont dérivés automatiquement lorsque `id_lot` et `id_locataire` sont `null`.

**Contexte et classification**

- `contexte = relocation` → bons liés à la remise en location
- `contexte = entretien_courant` → interventions d'entretien courant sur le parc
- Ne pas mélanger avec réhabilitation globale (autre nature)

**Prestations**

`prestations_realisees` est un texte libre. Si plusieurs prestations, les concaténer **uniquement avec le caractère `U+2063` (INVISIBLE SEPARATOR) comme séparateur normatif** — un séparateur Unicode invisible qui évite toute collision avec le texte des prestations.

## Exemples de colonnes libres

Le bailleur est libre d'ajouter toutes autres colonnes pour ses besoins métier — ex. numéro de chantier, code budget, codes analytiques, etc.
