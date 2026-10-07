# Traiter les réclamations

`Traiter les réclamations` est le tableau des demandes locataires importées dans PIERRE. Vous y ouvrez un dossier, voyez le contexte, laissez une trace, répondez, et faites avancer le travail.

Cette page décrit uniquement l’écran `Traiter les réclamations`. Les exports qui l’alimentent se déposent dans [Administration · Encyclopédie](./20-admin-encyclopedie.md) (`core.reclamations.csv`). Les notifications correspondantes apparaissent sur l’[accueil](./01-accueil.md).

## Sommaire

<!-- toc maxdepth:3 -->

- [À quoi ça sert](#à-quoi-ça-sert)
- [Qui peut y accéder](#qui-peut-y-accéder)
- [Lire l’écran](#lire-lécran)
- [Lire un dossier](#lire-un-dossier)
- [Agir sur un dossier](#agir-sur-un-dossier)
  - [Répondre au locataire](#répondre-au-locataire)
  - [Point de situation et notes](#point-de-situation-et-notes)
- [Bonnes pratiques](#bonnes-pratiques)
- [Si quelque chose ne va pas](#si-quelque-chose-ne-va-pas)

<!-- tocstop -->

## À quoi ça sert

Le module sert à **tenir le fil d’une réclamation** dans un seul endroit : qui est concerné, ce qui a déjà été dit, ce qui reste à faire, et la réponse envoyée au locataire.

PIERRE n’invente pas les dossiers : il affiche ceux qui ont été importés. La **qualification** (motif, type) vient de ces données ; vous ne la saisissez pas ici.

## Qui peut y accéder

Les personnes connectées dont le compte inclut le module `Traiter les réclamations`.

## Lire l’écran

Le tableau est organisé en **paniers** empilés. Aujourd’hui, un panier est généralement affiché : `Réclamations` (les demandes non encore abouties). D’autres paniers peuvent exister selon le paramétrage de l’organisme.

Au-dessus de chaque tableau :

| Commande                | Rôle                                                             |
| ----------------------- | ---------------------------------------------------------------- |
| `Colonnes`              | Afficher ou masquer des colonnes.                                |
| `Effacer les filtres`   | Retirer tous les filtres du tableau.                             |
| `Actualiser`            | Recharger les lignes.                                            |
| `Précédent` / `Suivant` | Pages suivantes (le compteur indique par exemple `1–10 sur 42`). |

La première colonne signale une **notification non lue** sur la ligne. Les autres colonnes viennent de vos données (numéro d’affaire, locataire, motif, avancement…). Un menu sur chaque en-tête permet de filtrer. L’ordre et la largeur des colonnes sont mémorisés.

Cliquez une ligne pour ouvrir le dossier. Les notifications de cette réclamation passent alors à l’état lu.

| Situation                | Message                                   |
| ------------------------ | ----------------------------------------- |
| Aucune donnée importée   | `Aucune réclamation importée.`            |
| Le tableau ne charge pas | `Impossible de charger les réclamations.` |

## Lire un dossier

Le tiroir s’ouvre sur le **numéro de réclamation**. `Fermer le dossier` le referme.

Deux colonnes :

| Côté   | Contenu                                                                                                                                |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| Gauche | `Contexte` (locataire, lot, site, date de réception, canal, qualification, état, avancement, panier, référent, tags) puis les actions. |
| Droite | Historique du dossier.                                                                                                                 |

S’il existe des tâches ouvertes, une rubrique `Actions à faire` les liste : échéance, assigné, auteur, note. Vous pouvez **cocher** (faite), `Ignorer` (motif optionnel), `Modifier` ou supprimer.

Depuis une notification, le tiroir s’ouvre **sur l’événement** concerné.

## Agir sur un dossier

Quand aucune action n’est déjà ouverte, les boutons habituels sont :

| Action                          | Usage                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------- |
| `Répondre au locataire`         | Rédiger et envoyer (ou préparer) une réponse.                                         |
| `Générer un point de situation` | Faire rédiger un point, puis `Enregistrer`.                                           |
| `Ajouter une note`              | Note interne. `Tapez @` pour mentionner un collègue.                                  |
| `Créer une tâche`               | Choisir une action métier, un destinataire, une échéance, une note, puis `Planifier`. |
| `Consigner une action réalisée` | Enregistrer ce qui a déjà été fait.                                                   |
| `Changer de panier`             | Déplacer le dossier, avec une note optionnelle.                                       |
| `Importer un email`             | Ajouter un fichier `.eml` à l’historique.                                             |
| `Changer les tags`              | Cocher les étiquettes du dossier (urgent, médiation, attente prestataire…).           |
| `Affecter à un référent`        | Désigner le collaborateur suivi, avec une note optionnelle.                           |

Les actions proposées à la planification sont des **verbes métier** (joindre le locataire, analyser le dossier, clôturer…). Choisissez celui qui décrit vraiment ce qui doit se passer.

### Répondre au locataire

Choisissez un **format** : `Via Aravis` (si votre organisme l’a branché), `SMS / RCS`, `Courriel`, ou `Via la poste`.

Renseignez l’objet et le message. Pour un RCS : téléphone, message, actions proposées (`Réponse`, `Appel`, `Lien`), et le `SMS de secours`.

| Bouton                 | Rôle                                                                                   |
| ---------------------- | -------------------------------------------------------------------------------------- |
| `Rédiger avec {agent}` | Propose un texte à partir du dossier. **Un message locataire initial est nécessaire.** |
| `Exporter en DOCX`     | Courrier postal : télécharge le document.                                              |
| `Injecter dans Aravis` | Ouvre le logiciel externe, puis demande `Avez-vous envoyé cette réponse avec Aravis ?` |
| `Envoyer`              | Envoie depuis PIERRE lorsque le canal le permet.                                       |
| `Annuler`              | Ferme sans enregistrer.                                                                |

### Point de situation et notes

`Générer un point de situation` : le texte apparaît dans le champ, puis `Enregistrer` — confirmation `Point de situation enregistré`.

Sur une note de l’historique dont vous êtes l’auteur : `Répondre`, `Modifier`, `Supprimer`. La suppression est définitive (`Cette action est irréversible. Tout le fil disparaîtra de l’historique.`).

## Bonnes pratiques

- **Laissez une trace avant de changer de panier.** La note explique le passage au collègue suivant.
- **Mentionnez avec `@`** plutôt que d’envoyer un e-mail à côté : la personne est notifiée dans PIERRE.
- **Relisez la réponse générée** avant d’envoyer. L’assistant prépare ; vous validez.
- **Actualisez** après un nouvel import : le tableau ne se met pas à jour tout seul en continu.

## Si quelque chose ne va pas

| Situation                                      | Que faire                                                                              |
| ---------------------------------------------- | -------------------------------------------------------------------------------------- |
| `Aucune réclamation importée.`                 | Un administrateur doit déposer `core.reclamations.csv` et reconstruire l’encyclopédie. |
| `Message locataire requis pour la génération.` | Saisissez ou importez d’abord le message du locataire.                                 |
| `Coordonnée du destinataire indisponible`      | Complétez téléphone ou e-mail dans vos données, ou changez de canal.                   |
| `Impossible d’envoyer le message`              | Vérifiez le canal et réessayez ; à défaut, passez par le courrier ou Aravis.           |
| La pastille de notification reste              | Rouvrez le dossier : l’ouverture marque la notification comme lue.                     |
