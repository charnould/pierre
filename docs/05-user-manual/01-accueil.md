# Accueil

L’`Accueil` est le point d’entrée après la connexion : les métiers auxquels vous avez droit, et quatre colonnes pour ce qui vous attend aujourd’hui.

Cette page décrit uniquement l’écran `Accueil`. La connexion se fait dans [Paramètres](./02-parametres.md). Les droits (qui voit quels métiers) se règlent dans [Administration · Utilisateurs](./21-admin-utilisateurs.md).

## Sommaire

<!-- toc maxdepth:3 -->

- [À quoi ça sert](#à-quoi-ça-sert)
- [Qui peut y accéder](#qui-peut-y-accéder)
- [Lire l’écran](#lire-lécran)
  - [Les métiers](#les-métiers)
  - [Les quatre colonnes](#les-quatre-colonnes)
- [La barre de titre](#la-barre-de-titre)
  - [Tiroir Notifications](#tiroir-notifications)
  - [Tiroir Tâches](#tiroir-tâches)
- [Bonnes pratiques](#bonnes-pratiques)
- [Si quelque chose ne va pas](#si-quelque-chose-ne-va-pas)

<!-- tocstop -->

## À quoi ça sert

L’accueil n’est pas un tableau de bord à chiffres. C’est le point d’entrée de la journée :

1. **Ouvrir un métier** en un clic (réclamations, impayés, discussion…).
2. **Voir ce qui vous concerne** : notifications, vos tâches, les tâches que vous avez déléguées, l’activité des collègues suivis.
3. **Revenir au dossier** sans chercher : un clic sur une ligne ouvre le bon tiroir.

## Qui peut y accéder

Toute personne connectée. Les portes de métiers dépendent de **vos** droits : un collaborateur sans le module `Piloter les impayés` ne voit pas cette porte. La porte de discussion apparaît dès que vous êtes connecté.

## Lire l’écran

L’écran a toujours la même composition, de haut en bas.

### Les métiers

En haut, une rangée de portes. Chaque porte porte le verbe de l’application. Seuls les métiers que votre compte autorise sont affichés.

| Porte                       | Ouvre                            |
| --------------------------- | -------------------------------- |
| `Discuter avec {agent}`     | La conversation avec l’assistant |
| `Traiter les réclamations`  | Le tableau des réclamations      |
| `Piloter les impayés`       | Le tableau des dossiers d’impayé |
| `Créer des automatisations` | Les routines programmées         |
| `Contacter par lots`        | Les traitements de masse         |
| `Obtenir une synthèse`      | Le formulaire de synthèse        |

`{agent}` est le nom de l’assistant de l’instance (souvent Pierre).

> [!NOTE]
> D’autres métiers existent déjà dans les droits (`Renouveler les assurances`, `Piloter la relocation`, `Piloter les attributions`, `Piloter les ventes`) mais leurs écrans ne sont pas encore ouverts. Ils n’apparaissent pas sur l’accueil.

### Les quatre colonnes

Sous les métiers, quatre colonnes côte à côte. Chacune montre un **extrait** (le nombre d’éléments se règle dans `Paramètres` → `Accueil`). `Tout voir` ouvre le tiroir complet.

| Colonne                     | Contenu                                                                       | Vide                                         |
| --------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------- |
| `Mes notifications`         | Ce qui vous a été signalé (dossiers, routines, traitements).                  | `Aucune notification` — `Vous êtes à jour.`  |
| `Mes tâches`                | Actions ouvertes **qui vous sont assignées**, regroupées en retard / à venir. | `Aucune tâche` — `Rien d’ouvert.`            |
| `Tâches que j’ai assignées` | Actions que **vous** avez déléguées à un collègue.                            | `Aucune tâche assignée` — `Rien de délégué.` |
| `Activités`                 | Chronologie des personnes que vous suivez.                                    | `Aucune activité`                            |

Un clic sur une notification de réclamation ou d’impayé ouvre le dossier. Un clic sur une notification d’automatisation ouvre le **rapport** correspondant. Un clic sur une tâche ouvre le dossier auquel elle est rattachée.

## La barre de titre

Toujours visible une fois connecté, à côté des contrôles de fenêtre :

| Bouton             | Rôle                                                                              |
| ------------------ | --------------------------------------------------------------------------------- |
| Accueil            | Revient à cet écran.                                                              |
| Tâches             | Ouvre le tiroir `Mes tâches` / `Tâches assignées`.                                |
| Notifications      | Ouvre le tiroir `Notifications` / `Activités`. Une pastille indique les non-lues. |
| Paramètres         | Compte, compagnon, déconnexion.                                                   |
| Administration     | Visible seulement si vous êtes administrateur.                                    |
| Manuel-utilisateur | Ouvre ce manuel dans le navigateur. Toujours en dernier.                          |

Les deux tiroirs (tâches et notifications) ne sont jamais ouverts en même temps.

### Tiroir Notifications

Deux onglets : `Notifications` et `Activités`.

- Filtre : `Afficher uniquement les non-lues` ou tout voir.
- `Tout lu` marque d’un coup ce qui reste à lire.
- Survol d’une ligne lue : `Marquer comme non lue`.
- `Fermer les notifications` referme le tiroir.

L’onglet `Activités` demande de choisir **qui suivre** (`Qui suivre` : collègues et, si vous le souhaitez, vous-même). Sans personne suivie, la colonne reste vide.

### Tiroir Tâches

Deux onglets : `Mes tâches` et `Tâches assignées`. Dans chaque onglet, les actions sont groupées en `En retard` et `Prochaines`.

## Bonnes pratiques

- **Commencez ici le matin.** Les colonnes disent ce qui attend une décision, pas ce qui est déjà clos.
- **Ouvrez `Tout voir` plutôt que de tout afficher sur l’accueil.** L’accueil est un extrait ; le tiroir est la liste complète.
- **Suivez les collègues avec qui vous travaillez vraiment.** Trop de suivis noie la colonne `Activités`.
- **Cliquez la notification, ne cherchez pas le dossier.** PIERRE ouvre le bon tiroir et, le cas échéant, l’événement concerné.

## Si quelque chose ne va pas

| Situation                                           | Que faire                                                                                            |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Une porte métier manque                             | Votre compte n’a pas ce module (ou aucun chatbot, pour la discussion). Demandez à un administrateur. |
| Les colonnes sont vides alors que le travail tourne | Vérifiez le filtre « non-lues » dans le tiroir, et qui vous suivez.                                  |
| Une notification d’automatisation n’ouvre rien      | Le rapport s’ouvre dans une fenêtre à part ; s’il est vide, relancez l’automatisation.               |
| Le compagnon n’apparaît pas sur le bureau           | Il est peut-être désactivé dans `Paramètres` → `Compagnon`.                                          |
