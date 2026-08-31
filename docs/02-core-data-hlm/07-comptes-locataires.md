# `comptes_locataires`

## Objectif

Exposer le **compte locataire sous forme de lignes** : chaque ligne est une écriture qui augmente ou diminue la dette du locataire envers le bailleur — appel de loyer, encaissement, aide CAF, régularisation de charges, frais de relance, travaux récupérables, rejet de prélèvement, annulation comptable, etc.

L’objectif métier est de **reconstituer le solde** (« combien le locataire doit-il ? », « d’où vient cette dette ? », « lui doit-on de l’argent ? ») **sans export séparé de balance** : le solde est la somme des mouvements, pas une colonne pré-calculée.

Le fichier ne se limite **pas** aux quittances émises : il couvre tout ce qui impacte le compte locataire en gestion locative et recouvrement.

Il doit **impérativement** être nommé `comptes_locataires`.

## Exemples de cas d’usage métier

- **Suivi des impayés** — connaître le solde d’un locataire en place et l’historique qui l’explique (appels, paiements, rejets).
- **Plans d’apurement** — identifier les échéances appelées (ex. `categorie` = `apurement`) et leur contribution au solde.
- **Clients partis encore débiteurs** — conserver les mouvements des (ex-)locataires tant qu’une dette subsiste, même s’ils n’occupent plus de lot.
- **Travaux récupérables** — relier une facturation locataire au bon de commande via `id_travaux` (cf. [`travaux`](06-travaux.md)).
- **Recouvrement opérationnel** — détecter les rejets de prélèvement, frais contentieux, régularisations de charges.
- **Brief Agent / IA** — expliquer l’origine d’un solde, son évolution mensuelle (`mois_concerne`), croiser dette et occupation patrimoniale via [`lots_locatifs`](03-lots-locatifs.md).

## Ce que ce fichier n’est pas

- **Pas** la comptabilité générale de l’organisme, ni le budget travaux, ni la trésorerie globale.
- **Pas** un substitut aux quittances ou avis d’échéance PDF : ce sont des **mouvements tabulaires**, pas des documents.
- **Pas** une balance âgée pré-calculée : le solde se **déduit par addition** des lignes (cf. [Règles de reconstitution du solde](#règles-de-reconstitution-du-solde)).
- **Pas** limité aux seuls locataires en place : des mouvements peuvent concerner des **(ex-)locataires** absents de `lots_locatifs` (client parti avec dette).

## Nature du fichier : compte locataire par mouvement

Une ligne = une **écriture comptable** (mouvement financier). Chaque export est une photographie datée par `date_extraction` portant l'**historique cumulé** des mouvements du périmètre — pas seulement les opérations du jour.

Le solde se **reconstitue par somme** : il n'existe pas de colonne pré-calculée `solde`. Ce modèle garantit que chaque affectation, rejet, régularisation se retrouve expliqué dans les données.

**Fraîcheur des données** : une **mise à jour quotidienne** est recommandée pour que les encaissements, rejets et nouveaux appels reflètent la réalité du recouvrement.

**Périmètre recommandé** :

- **Locataires en place** — historique financier complet nécessaire pour expliquer le solde courant.
- **Locataires partis avec dette** — conservation obligatoire tant qu’un solde débiteur subsiste.
- **Patrimoine actuellement en gestion** — chaque mouvement porte les clés patrimoniales du socle (`id_lot`, `id_site`, etc.). Ces clés étant **immuables dans le temps** (cf. socle), la jointure avec `lots_locatifs` est garantie, quel que soit le locataire ayant occupé le lot.
- **Historique suffisant** — le fichier doit permettre de recalculer le solde par somme des mouvements. Si l’historique intégral n’est pas disponible côté SI, un mouvement d’initialisation explicite (ex. `categorie` = `solde_initial`) doit porter le solde de départ.

> [!NOTE]
> **Reconstruction intégrale à l’import PIERRE** — Ce fichier n’est **pas** historisé comme `reclamations`. À chaque import, PIERRE **remplace l’ensemble** des mouvements précédemment chargés. Chaque export doit donc contenir l’**historique complet** du périmètre. Corollaire : pas de doublon inter-export si l’historique est complet.

## Entité logique et convention de signe

Une ligne augmente ou diminue la **dette du locataire envers le bailleur** :

- `montant_en_euros > 0` → **augmente la dette** (appel de loyer, rejet de prélèvement, frais).
- `montant_en_euros < 0` → **diminue la dette** (paiement, remboursement, aide CAF).

**Sens du solde** (verrouillé) :

- Solde **> 0** = **dû au bailleur** (impayé)
- Solde **< 0** = **crédit locataire** (trop-perçu)
- Solde **= 0** = compte équilibré

## Dossier locataire et personne (client)

Dans le langage métier d’un ERP locatif :

- **`id_locataire`** = un **dossier locataire** (un bail, une occupation comptable, un compte locataire dans le SI).
- **`id_client`** = la **personne** ; une même personne peut cumuler plusieurs `id_locataire` (successions de baux, plusieurs logements).

**Règle spécifique à ce fichier (dérogation au socle)** — Contrairement à `lots_locatifs` où `id_locataire` et `id_client` peuvent être `null` (lot vacant), **tout mouvement porte obligatoirement `id_locataire` ET `id_client` renseignés** : un mouvement financier est toujours rattaché à un (ex-)locataire identifié. Sans ces clés, la ligne est inexploitable.

## Colonnes normatives

`comptes_locataires` reprend l’intégralité du **[socle normatif partagé](02-socle.md)** et y ajoute les colonnes spécifiques ci-dessous. Toutes doivent figurer dans l’export ([présence obligatoire](01-conventions.md#colonnes-requises-et-définitions-canoniques)) ; leurs valeurs peuvent être `null` lorsque le champ n’est pas applicable — **exception : `id_locataire` et `id_client` sont obligatoirement renseignés** (cf. [Dossier locataire et personne (client)](#dossier-locataire-et-personne-client)).

| Champ              | Définition canonique                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id_travaux`       | Jointure **optionnelle** vers [`travaux`](06-travaux.md) pour un mouvement récupérable (réparation locative, etc.) ; `null` si non applicable                                                                                                                                                                                                                                                                                             |
| `mois_concerne`    | **Mois locatif** concerné par le mouvement, au format **`YYYY-MM`** (ex. `2026-06` pour le loyer de juin) ; `null` si le mouvement n’est pas imputé à un mois précis (frais ponctuels, rejet…)                                                                                                                                                                                                                                            |
| `date_exigibilite` | **Date d'exigibilité** de prise en compte au grand livre — **une seule sémantique** (≠ `date_extraction` du fichier). Horodatage **`YYYY-MM-DDTHH:MM:SS` recommandé** pour ordonner les mouvements d’une même journée ; à défaut `YYYY-MM-DD`. Doit être la **date d'exigibilité** pour savoir précisément quand la balance devient négative et que celle-ci devient exigible pour identifier en « temps réel » les situations d'impayés. |
| `montant_en_euros` | Montant signé **en euros** : positif si la dette augmente, négatif si elle diminue. Décimales avec point ou virgule (cohérence par colonne)                                                                                                                                                                                                                                                                                               |
| `categorie`        | Nature métier du mouvement (voir [nomenclature recommandée ci-dessous](#exemple-de-nomenclature-pour-categorie))                                                                                                                                                                                                                                                                                                                          |
| `email_client`     | Courriel du client (ex. `henri.becquerel@gmail.com`)                                                                                                                                                                                                                                                                                                                                                                                      |
| `telephone_client` | Téléphone du client, de préférence mobile (ex. `06 11 56 39 59`)                                                                                                                                                                                                                                                                                                                                                                          |
| `adresse`          | `20, rue des Pyramides`                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `nom_client`       | `Becquerel`                                                                                                                                                                                                                                                                                                                                                                                                                               |

> [!NOTE]
> À l’import, PIERRE normalise les montants (`montant_en_euros`) et les dates pour garantir une exploitation homogène. La notion de _client partis_ est déduite en croisant avec `comptes_locataires` et `lots_locatifs`.

## Exemple de nomenclature pour `categorie`

La colonne `categorie` doit rester lisible par un humain et exploitable par un Agent. Le SI n’a pas toujours le détail d’imputation d’un encaissement : dans ce cas, `encaissement_locataire` est la valeur de repli honnête — sans inventer une ventilation fictive.

| Exemple                   | Usage                                                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `loyer_principal`         | Appel de loyer principal                                                                                             |
| `charges`                 | Appel de charges ou provision de charges                                                                             |
| `regularisation_charges`  | Régularisation de charges : `+` si complément dû, `-` si trop-perçu rendu au locataire                               |
| `apurement`               | Échéance d’un plan d’apurement appelée au locataire                                                                  |
| `frais`                   | Frais **administratifs ou contentieux** : relance, commandement de payer, dossier contentieux                        |
| `travaux`                 | **Réparations locatives** récupérables auprès du locataire (remise en état, dégradations)                            |
| `materiel`                | Fourniture ou mise à disposition de **matériel** récupérable (badges, télécommandes, clés)                           |
| `caf_apl`                 | Aide ou versement **tiers payeur** diminuant la dette locataire ; c’est une **catégorie**, pas un `mode_de_paiement` |
| `encaissement_locataire`  | Paiement du locataire lorsque le SI ne sait pas l’imputer à une rubrique précise                                     |
| `remboursement_locataire` | Somme remboursée au locataire (trop-perçu) : réduit un solde créditeur, donc mouvement **positif**                   |
| `rejet_paiement`          | **Rejet bancaire** d’un encaissement déjà comptabilisé (prélèvement rejeté, chèque impayé) : ré-augmente la dette    |
| `annulation`              | **Contrepassation comptable** d’un mouvement antérieur erroné : signe **opposé** au mouvement d’origine              |
| `solde_initial`           | Mouvement d’initialisation lorsque l’historique complet n’est pas disponible                                         |

## Règles de reconstitution du solde

Le fichier est correctement réalisé si le **solde affiché en gestion locative est exactement la somme des lignes**.

**Vérification SQL** — pour un dossier `id_locataire` :

```sql
select
  id_locataire,
  sum(montant_en_euros) as solde_debiteur
from comptes_locataires
group by id_locataire;
```

**Interprétation du signe** — un solde **positif** est dû au bailleur (impayé), **négatif** un crédit locataire, **nul** un compte équilibré (cf. [convention de signe](#entité-logique-et-convention-de-signe)).

**Si la somme ne reproduit pas le solde SI** : export incomplet (historique tronqué, `solde_initial` manquant) ou mal signé.

## Exemples de colonnes libres

- `sous_categorie` : ex. `frais_relance`, `commandement_payer`, `reparation_locative`
- `mode_de_paiement` : ex. `virement`, `prelevement`, `cheque`, `especes`
- `plan_apurement_en_cours`: ex. `oui`/`non`
- `date_de_naissance`

## Questionnements internes (à challenger par GDH)

- Comment identifier les rejets bancaires ?
- GDH
  - MàJ quotidienne vers 14h ?
  - Identifier les rejets
  - ajouter mode de paiement
  - ajouter plan d'apurement en cours : oui/non (700/800 en flux environ chez GDH)
