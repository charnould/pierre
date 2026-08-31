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

Les dossiers sont classés automatiquement dans des phases (amiable, contentieux, Banque de France…). Vous pouvez aussi **changer le groupe** à la main, avec une note.

## Qui peut y accéder

Les personnes connectées dont le compte inclut le module `Piloter les impayés`.

## Lire l’écran

Pas d’onglets internes : **une section par phase**, empilées. L’en-tête indique le nom de la phase, le **nombre de dossiers** et le **total des soldes**.

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

Au-dessus de chaque tableau : `Colonnes`, `Effacer les filtres`, `Effacer les tris`, `Actualiser`. Il n’y a pas de pagination : toute la phase est chargée ; les filtres s’appliquent **dans** la section.

La colonne `Alertes` signale une notification. Les autres colonnes décrivent surtout la dernière action, sa date, le solde, le ratio dette/loyer et le gestionnaire, plus les colonnes de vos exports.

| Situation                           | Message                                                                          |
| ----------------------------------- | -------------------------------------------------------------------------------- |
| Phase sans dossier                  | `Aucun dossier dans cette phase`                                                 |
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
| `Groupe`                  | Phase actuelle.                                                                              |
| `Dernière tâche` / `Tags` | Dernière action connue et étiquettes (`décès`, `+65 ans`, `Redémarrage APL`…).               |

Les tâches ouvertes se gèrent comme dans les réclamations (faire, ignorer, modifier). L’historique à droite mélange notes, actions, changements de groupe et **mouvements comptables**.

## Agir sur un dossier

| Action                                              | Usage                                                                      |
| --------------------------------------------------- | -------------------------------------------------------------------------- |
| `Laisser une note`                                  | Note interne, mentions `@`.                                                |
| `Créer une tâche` / `Consigner une action réalisée` | Planifier ou enregistrer un geste métier.                                  |
| `Contacter un tiers`                                | Choisir un modèle (locataire ou CAF), puis envoyer ou ouvrir le mail.      |
| `Créer un plan d’apurement`                         | Ouvre le formulaire de plan (ou `Modifier` / `Clôturer` s’il existe déjà). |
| `Importer un email`                                 | Ajouter un `.eml`.                                                         |
| `Changer le groupe`                                 | Changer de phase + note → `Avancement enregistré`.                         |
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

Le formulaire couvre notamment :

| Rubrique             | Points à renseigner                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------ |
| `Dispositif`         | `Plan d'apurement` ou `Protocole de cohésion sociale` ; `Bail` ou `Accession`.             |
| `Logement`           | Adresse, code postal, ville.                                                               |
| `Situation locative` | Dette, date du premier impayé, commandement, CCAPEX, travailleur social, Banque de France. |
| `Foyer`              | Identifiants, adultes, enfants.                                                            |
| `Budget du foyer`    | Ressources, charges ; PIERRE calcule reste à vivre et UC.                                  |
| `Aides`              | FSL, Action Logement, etc.                                                                 |
| `Échéancier`         | Ajouter ou retirer des échéances (n°, date, montant).                                      |

En bas : interrupteur `Plan ou protocole signé`, `Retirer` (brouillon), `Clôturer` (motifs : `Exécution terminée`, `Non-respect`, `Remplacé par un nouveau plan`, `Effacement de dette`), `Exporter en .docx`, `Enregistrer` ou `Enregistrer avec une note`.

Un plan **signé** bascule le dossier en `Plan amiable / EV en cours` et passe le formulaire en lecture seule : seule la clôture reste possible.

Si la table des comptes locataires est absente, vous pouvez encore ouvrir `Créer un plan d'apurement` en mode export, **sans** le rattacher à un dossier du tableau.

## Bonnes pratiques

- **Lisez la tendance de dette avant de relancer.** Une dette en baisse n’appelle pas le même geste qu’une dette qui file.
- **Notez le changement de phase.** Le groupe seul ne raconte pas pourquoi.
- **Exportez le plan en Word** pour la signature ; gardez PIERRE comme mémoire du dossier.
- **Un plan signé n’est plus un brouillon.** Relisez avant de cocher `Plan ou protocole signé`.

## Si quelque chose ne va pas

| Situation                               | Que faire                                                          |
| --------------------------------------- | ------------------------------------------------------------------ |
| `comptes_locataires n’est pas défini`   | Un administrateur doit déposer l’export Core Data et reconstruire. |
| `Impossible d’ouvrir le client mail`    | Copiez le modèle, ou passez par le RCS.                            |
| `Modèle de message invalide`            | Resélectionnez le modèle dans `Contacter un tiers`.                |
| Courriel en bounce / téléphone invalide | Corrigez la coordonnée dans le SI, puis réimportez.                |
| Le plan ne s’enregistre pas             | Vérifiez les champs obligatoires du foyer et de l’échéancier.      |
