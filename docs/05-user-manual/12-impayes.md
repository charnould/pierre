# Piloter les impayés

`Piloter les impayés` est le tableau des dossiers de recouvrement, classés par **phase**. Vous y lisez la dette, contactez, laissez une trace, et construisez un plan d’apurement.

Cette page décrit uniquement l’écran `Piloter les impayés`. Les soldes viennent de [l’encyclopédie](./20-admin-encyclopedie.md) (`core.comptes_locataires.csv`). Les envois à beaucoup de locataires à la fois se font dans [Contacter par lots](./14-contacter-par-lots.md).

## Sommaire

<!-- toc maxdepth:3 -->

- [À quoi ça sert](#à-quoi-ça-sert)
- [Qui peut y accéder](#qui-peut-y-accéder)
- [Lire l’écran](#lire-lécran)
- [Lire un dossier](#lire-un-dossier)
- [Agir sur un dossier](#agir-sur-un-dossier)
  - [Contacter un tiers](#contacter-un-tiers)
- [Créer un plan d’apurement](#créer-un-plan-dapurement)
- [Bonnes pratiques](#bonnes-pratiques)
- [Si quelque chose ne va pas](#si-quelque-chose-ne-va-pas)

<!-- tocstop -->

## À quoi ça sert

Le module sert à **voir où en est chaque situation d’impayé** et à agir sans perdre le fil : relance, plan, passage de phase, mention à un collègue.

Les dossiers sont classés dans des phases (amiable, contentieux, Banque de France…). Vous pouvez aussi **changer la phase** à la main, avec une note. Une phase retirée du paramétrage n’est pas oubliée : ses dossiers apparaissent dans `À reclasser`, le temps de les ranger dans une phase actuelle.

## Qui peut y accéder

Les personnes connectées dont le compte inclut le module `Piloter les impayés`.

## Lire l’écran

Les phases sont empilées. Une phase remplie indique son nom, le **nombre de dossiers** et le **total des soldes**. Une phase vide tient sur une ligne avec son nom et `0 dossier`. Une seule barre, au-dessus du scroll, porte `Actualiser`. Dès qu’un dossier est coché, elle devient `Désélectionner` et `Agir sur N dossiers`. Les réglages du tableau restent accessibles. Le bouton à côté du nom d’une colonne trie toute la phase. Le menu de la colonne permet aussi de la déplacer ou de la masquer. `Colonnes` la réaffiche. Le bord droit d’une colonne la redimensionne.

Phases habituellement affichées :

1. `Non traités`
2. `Recouvrement amiable`
3. `Plan amiable / EV en cours`
4. `Précontentieux`
5. `Commandement de payer`
6. `Plan suite CDP`
7. `Contentieux`
8. `Post-jugement`
9. `Surendettement en instruction`
10. `Plan / mesures BDF en cours`
11. `Moratoire Banque de France`
12. `Rétablissement personnel`
13. `Clos / soldé`
14. `Clients partis`

`À reclasser` apparaît dans la pile uniquement lorsqu’un dossier porte une phase qui n’existe plus. Ce n’est pas une phase du paramétrage et on ne peut pas l’y écrire. Depuis le dossier, `Changer la phase` le range dans une phase actuelle.

Sur chaque phase qui contient des dossiers : `Colonnes`, `Effacer les filtres`, `Effacer les tris`. Il n’y a pas de pagination : toute la phase est chargée. Une phase vide n’a pas de tableau.

La première colonne coche un ou plusieurs dossiers. La sélection reste d’une phase à l’autre. La colonne `Alertes` signale une notification. Le tableau montre d’abord `Locataire`, `Client`, `Dette`, `Dette / loyer`, `Courriel`, `Téléphone`, `Référent` et `Dernière action`. Les autres colonnes s’affichent depuis `Colonnes`. Les noms techniques des exports sont convertis en libellés lisibles.

`Agir sur N dossiers` peut changer la phase, ajouter ou retirer un tag, ou demander à Pierre une réponse possible, une synthèse ou une autre consigne. Pierre traite les dossiers l’un après l’autre, n’envoie rien, et enregistre chaque résultat dans l’historique du dossier.

| Situation                           | Message                                                                          |
| ----------------------------------- | -------------------------------------------------------------------------------- |
| Phase sans dossier                  | Une rubrique compacte `Nom de la phase · 0 dossier`                              |
| Phase remplie, filtres trop étroits | `Aucun dossier correspondant`                                                    |
| Chargement                          | `Chargement des soldes…`                                                         |
| Export manquant                     | `comptes_locataires n’est pas défini` — les soldes ne peuvent pas être calculés. |
| Erreur de chargement                | `Impossible de charger les soldes locataires.`                                   |

## Lire un dossier

Cliquez une ligne. L’en-tête montre `id client · id locataire`. `Fermer le dossier` referme le tiroir.

À gauche, le `Contexte` :

| Élément                   | Lecture typique                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------- |
| `Dette`                   | Montant, équivalent en mois de loyer, tendance (`Dette en hausse` / `en baisse` / `stable`). |
| `Courriel`                | Adresse ou `Non renseigné`, plus un badge (`OK`, `Invalide`, `Soft bounce`, `Hard bounce`).  |
| `Téléphone`               | Numéro ou `Non renseigné`, plus `SMS` / `RCS` / `Invalide`.                                  |
| `Référent`                | Collaborateur ou `Non affecté`.                                                              |
| `Phase`                   | Phase actuelle.                                                                              |
| `Dernière tâche` / `Tags` | Dernière action connue et étiquettes (`décès`, `+65 ans`, `Redémarrage APL`…).               |

Les tâches ouvertes se gèrent comme dans les réclamations (faire, ignorer, modifier). L’historique à droite mélange notes, actions, changements de phase et **mouvements comptables**.

## Agir sur un dossier

| Action                                              | Usage                                                                      |
| --------------------------------------------------- | -------------------------------------------------------------------------- |
| `Laisser une note`                                  | Note interne, mentions `@`.                                                |
| `Créer une tâche` / `Consigner une action réalisée` | Planifier ou enregistrer un geste métier.                                  |
| `Contacter un tiers`                                | Choisir un modèle (locataire ou CAF), puis envoyer ou ouvrir le mail.      |
| `Créer un plan d’apurement`                         | Ouvre le formulaire de plan (ou `Modifier` / `Clôturer` s’il existe déjà). |
| `Importer un email`                                 | Ajouter un `.eml`.                                                         |
| `Changer la phase`                                  | Changer de phase + note → `Avancement enregistré`.                         |
| `Changer les tags`                                  | → `Tags enregistrés`.                                                      |
| `Affecter à un référent`                            | → `Référent affecté`.                                                      |

### Contacter un tiers

Le menu propose des modèles, par exemple :

- RCS/SMS au (ex-)client : `Relance impayé`, `Rappel échéance plan`
- E-mail au (ex-)client : `Relance impayé`
- E-mail à la CAF : `Renvoi de quittances`, `Rétablissement des APL`, `Signature d'un plan d'apurement`

Un RCS s’envoie depuis PIERRE (`Envoyer` → `Message envoyé`). Un e-mail CAF ouvre souvent **votre** messagerie, puis demande `Avez-vous envoyé cet e-mail ?`.

> [!NOTE]
> L’envoi d’e-mail **depuis** PIERRE n’est pas encore configuré sur toutes les instances : le message `L’envoi d’e-mails depuis Pierre n’est pas encore configuré` l’indique. Utilisez alors le client mail ou le RCS.

## Créer un plan d’apurement

`Créer un plan d’apurement` remplace temporairement le tableau. `Retour` ramène à la liste.

Le formulaire est un seul dossier : identification, dette, procédure, accompagnement, bail, membres du foyer, budget et échéancier. `Ajouter un adulte`, `Ajouter un enfant`, les lignes de budget et `Ajouter une échéance` allongent ce dossier. `Enregistrer` le conserve tel quel.

`Retour` ferme l’écran sans écrire. `Modifier le plan d’apurement` rouvre le dernier dossier enregistré.

## Bonnes pratiques

- **Lisez la tendance de dette avant de relancer.** Une dette en baisse n’appelle pas le même geste qu’une dette qui file.
- **Notez le changement de phase.** La phase seule ne raconte pas pourquoi. Renommer une phase dans le paramétrage ne réécrit pas l’historique : les dossiers concernés passent dans `À reclasser`.
- **Enregistrez le dossier** avant de quitter l’écran : c’est la mémoire du plan.

## Si quelque chose ne va pas

| Situation                               | Que faire                                                          |
| --------------------------------------- | ------------------------------------------------------------------ |
| `comptes_locataires n’est pas défini`   | Un administrateur doit déposer l’export Core Data et reconstruire. |
| `Impossible d’ouvrir le client mail`    | Copiez le modèle, ou passez par le RCS.                            |
| `Modèle de message invalide`            | Resélectionnez le modèle dans `Contacter un tiers`.                |
| Courriel en bounce / téléphone invalide | Corrigez la coordonnée dans le SI, puis réimportez.                |
| Le plan ne s’enregistre pas             | Vérifiez les champs obligatoires du foyer et de l’échéancier.      |
