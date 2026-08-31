# Contacter par lots

`Contacter par lots` prépare un **traitement de masse** : une audience de locataires, un enchaînement de canaux (RCS, SMS, courriel, courrier), un aperçu ligne à ligne, puis un envoi réel ou un simple avancement des dossiers.

Cette page décrit uniquement l’écran `Traitements de masse`. Les dossiers individuels se traitent dans [Piloter les impayés](./12-impayes.md). La source active aujourd’hui est l’export des comptes locataires, déposé dans l’[encyclopédie](./20-admin-encyclopedie.md).

## Sommaire

<!-- toc maxdepth:3 -->

- [À quoi ça sert](#à-quoi-ça-sert)
- [Qui peut y accéder](#qui-peut-y-accéder)
- [Lire l’écran](#lire-lécran)
- [Composer un traitement](#composer-un-traitement)
  - [Traitement](#traitement)
  - [Acheminement](#acheminement)
  - [Audience](#audience)
- [Lire l’aperçu](#lire-laperçu)
- [Enregistrer, exécuter, supprimer](#enregistrer-exécuter-supprimer)
- [Historique d’une exécution](#historique-dune-exécution)
- [Bonnes pratiques](#bonnes-pratiques)
- [Si quelque chose ne va pas](#si-quelque-chose-ne-va-pas)

<!-- tocstop -->

## À quoi ça sert

Le module sert à **dire la même chose à beaucoup de monde**, avec le bon canal selon les coordonnées disponibles, et à garder une trace de qui a été contacté.

Deux façons d’exécuter :

| Bouton                    | Effet                                                            |
| ------------------------- | ---------------------------------------------------------------- |
| `Traiter sans envoyer`    | Avance les dossiers (panier, tags…) **sans** envoyer de message. |
| `Appliquer le traitement` | Envoie réellement, dans la limite des canaux configurés.         |

## Qui peut y accéder

Les personnes connectées dont le compte inclut le module `Contacter par lots`.

## Lire l’écran

Trois vues, jamais superposées :

| Vue        | Quand                             | En-tête                          |
| ---------- | --------------------------------- | -------------------------------- |
| Liste      | À l’arrivée                       | `Traitements de masse`           |
| Éditeur    | `Créer` ou clic sur une ligne     | `Nouveau traitement` ou le nom   |
| Historique | Bouton `Historique` sur une ligne | `Historique` + nom du traitement |

La liste montre le nom, la description, qui a modifié en dernier, la date du dernier run. Recherche et tris : `Modification`, `Dernier run`, `Nom (A→Z)`.

Liste vide : `Traitez des locataires en lot` et `Créer un traitement`. Recherche sans résultat : `Aucun résultat`.

`Retour` quitte l’éditeur ou l’historique vers la liste.

## Composer un traitement

### Traitement

| Champ                  | Rôle                                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `Nom` / `Description`  | Identité dans la liste. Le nom est obligatoire à l’enregistrement.                                                 |
| `Source`               | Aujourd’hui : `Comptes locataires`. `Lots locatifs`, `Candidats` et `Réclamations` affichent `Bientôt disponible`. |
| `Rapports conservés`   | Combien d’exécutions garder.                                                                                       |
| `Notifier le référent` | Prévenir le gestionnaire du dossier.                                                                               |

### Acheminement

`Type` :

- `Canaux successifs` — `Si un canal échoue, le suivant est tenté`.
- `Parcours RCS` — enchaînement selon les réponses. L’éditeur enrichi n’est **pas encore proposé** (`RCS enrichi bientôt disponible`).

Pour chaque canal (`Canal initial`, puis `Fallback N`) : canal, action, objet, message, éventuellement un `Modèle Word` et un `Résumé du courrier`. `Ajouter un fallback` ajoute une étape.

Canaux possibles : `RCS`, `SMS`, `Courriel`, `Lettre postale simple`, `Lettre avec accusé de réception`, `Lettre recommandée électronique (LRE)`.

**Variables** : `Indiquez quelle colonne alimente chaque variable`. Dans le texte, `/` ouvre `Insérer un champ` (colonnes de l’export, plus `Date du jour`).

`Panier d’arrivée` : où vont les dossiers après le traitement.

### Audience

Restreignez qui est visé : `Paniers`, `Actions`, `Tags requis`, `Tags exclus`, fourchette de `Dette`, `Mois d’impayés`.

## Lire l’aperçu

Dès que la source est active, un résumé apparaît : nombre de lignes, d’éligibles, de dossiers `sans route exploitable`, et la répartition par canal.

Le tableau détaille : locataire, dette, courriel, téléphone, `Canal résolu`, `Acheminement`. L’icône `Aperçu du message` montre le texte (ou le PDF du courrier) **pour cette personne**.

Statuts fréquents : `Éligible`, `Sans route exploitable` (souvent `coordonnée absente` ou données manquantes).

Pendant le calcul : `Chargement de l’aperçu…`.

## Enregistrer, exécuter, supprimer

| Bouton                    | Confirmation                |
| ------------------------- | --------------------------- |
| `Enregistrer`             | —                           |
| `Traiter sans envoyer`    | `Traiter sans envoyer ?`    |
| `Appliquer le traitement` | `Appliquer le traitement ?` |
| `Supprimer`               | `Supprimer ce traitement ?` |

Après exécution : `N envoi(s) accepté(s)` ou `N dossier(s) avancé(s)`. Si le nom manque : `Le nom est requis`.

## Historique d’une exécution

`Historique` liste les runs : date, auteur, `Avec envoi` ou `Sans envoi`, compteurs `réussi(s)` / `échoué(s)` / `en cours`.

Chaque run a un statut (`En cours`, `Réussi`, `Échoué`, `Partiel`) et un tableau : identité, canal, statut, résultat (`Accepté`, `Appliqué`, `Distribué`, `En attente d’une réponse`, `Échec définitif`…). Un clic ouvre le dossier locataire.

Vide : `Aucune exécution` — `Les rapports apparaîtront après la première application de ce traitement.`

## Bonnes pratiques

- **Relisez l’aperçu avant d’appliquer.** Une coordonnée absente se voit ici, pas après l’envoi.
- **Testez d’abord `Traiter sans envoyer`** sur un petit filtre, pour vérifier le panier d’arrivée.
- **Un fallback n’est pas un doublon.** C’est le canal suivant si le premier ne peut pas partir.
- **Gardez un modèle Word simple** pour les courriers : les champs doivent correspondre aux colonnes liées.

## Si quelque chose ne va pas

| Situation                            | Que faire                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------- |
| `Source bientôt disponible`          | Restez sur `Comptes locataires` jusqu’à l’ouverture des autres sources.         |
| Beaucoup de `Sans route exploitable` | Vérifiez e-mails et téléphones dans l’export, ou ajoutez un fallback.           |
| `Aucun champ trouvé.`                | Le nom tapé après `/` ne correspond à aucune colonne.                           |
| `RCS enrichi bientôt disponible`     | Utilisez `Canaux successifs` en attendant les parcours conversationnels.        |
| L’historique est vide                | Aucune application n’a encore eu lieu, ou les rapports n’ont pas été conservés. |
