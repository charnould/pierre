# Administration · Utilisateurs

L’écran `Utilisateurs` sert à ouvrir PIERRE aux collaborateurs de l’organisme : qui peut se connecter, quels modules il voit, quels assistants il peut interroger, et qui a le droit d’administrer.

Cette page décrit uniquement l’écran `Administration` → `Utilisateurs`. Les documents que PIERRE a le droit de lire se règlent dans [Administration · Encyclopédie](./20-admin-encyclopedie.md). Chaque personne règle ensuite son nom et son avatar dans [Paramètres](./02-parametres.md).

## Sommaire

<!-- toc maxdepth:3 -->

- [À quoi ça sert](#à-quoi-ça-sert)
- [Qui peut y accéder](#qui-peut-y-accéder)
- [Lire l’écran](#lire-lécran)
- [Les profils d’accès](#les-profils-daccès)
  - [Créer un profil](#créer-un-profil)
  - [Modifier un profil](#modifier-un-profil)
  - [Supprimer un profil](#supprimer-un-profil)
  - [Modules que vous pouvez cocher](#modules-que-vous-pouvez-cocher)
- [Les utilisateurs](#les-utilisateurs)
  - [Créer un compte](#créer-un-compte)
  - [Modifier un compte](#modifier-un-compte)
  - [Profil ou droits personnalisés](#profil-ou-droits-personnalisés)
  - [Le statut administrateur](#le-statut-administrateur)
  - [Affecter un profil à plusieurs personnes](#affecter-un-profil-à-plusieurs-personnes)
  - [Importer un CSV](#importer-un-csv)
  - [Supprimer un compte](#supprimer-un-compte)
- [Ce que PIERRE empêche (volontairement)](#ce-que-pierre-empêche-volontairement)
- [Bonnes pratiques](#bonnes-pratiques)
- [Si quelque chose ne va pas](#si-quelque-chose-ne-va-pas)

<!-- tocstop -->

## À quoi ça sert

Sans compte, un collaborateur ne peut pas ouvrir l’application. Cet écran permet de :

1. **Créer des profils d’accès** — des gabarits (chargé de gestion, cadre de proximité, recouvrement…) qui préremplissent les droits.
2. **Créer et tenir à jour les comptes** — adresse e-mail, mot de passe, rattachement à un profil ou droits individuels, statut administrateur.
3. **Affecter un même profil à plusieurs personnes** en une fois.
4. **Importer un fichier** pour créer des comptes ou renouveler des mots de passe en lot.

Le statut **administrateur** est indépendant du profil : on peut être chargé de gestion _et_ administrateur, ou cadre _sans_ être administrateur.

## Qui peut y accéder

Uniquement les **administrateurs**, depuis `Administration` → `Utilisateurs`.

## Lire l’écran

Deux rubriques se succèdent, sans être mélangées.

| Rubrique       | Ce que vous y voyez                                                 |
| -------------- | ------------------------------------------------------------------- |
| `Profils`      | Les gabarits d’accès (nom, nombre de modules, nombre d’assistants). |
| `Utilisateurs` | Tous les comptes, avec leur profil, leur statut, et les actions.    |

Chaque rubrique affiche son effectif (`3 profils`, `12 utilisateurs`) et ses propres boutons.

## Les profils d’accès

Un profil est un **modèle** : « ces personnes voient ces modules et peuvent parler à ces assistants ».

Ce n’est pas un métier dans le SI, ni le profil d’un document dans l’[encyclopédie](./20-admin-encyclopedie.md). C’est uniquement un raccourci pour ne pas recocher les mêmes cases à chaque nouveau compte.

### Créer un profil

1. Dans la rubrique `Profils`, cliquez sur `Créer`.
2. Donnez un **nom** clair pour l’organisme (`Chargé de gestion locative`, `Recouvrement`, `Direction de proximité`…).
3. Cochez les **modules** auxquels ce gabarit donne accès.
4. Cochez les **chatbots** (assistants) que ces personnes pourront interroger.
5. Cliquez sur `Créer`.

Le nom est obligatoire. Deux profils ne peuvent pas porter le même nom.

### Modifier un profil

Cliquez sur la ligne ou sur l’icône crayon. Vous pouvez changer le nom, les modules et les assistants.

> [!IMPORTANT]
> Dès que vous enregistrez, **tous les comptes rattachés à ce profil** voient leurs accès mis à jour. Vous n’avez pas à rouvrir chaque fiche utilisateur.

### Supprimer un profil

L’icône corbeille demande confirmation. La suppression est définitive.

Un profil **encore attribué à au moins une personne** ne peut pas être supprimé. Le message affiché est : `Ce profil est encore affecté à des utilisateurs.` Détachez d’abord ces personnes (passez-les en `Personnalisé` ou sur un autre profil), puis supprimez le gabarit.

### Modules que vous pouvez cocher

Ce sont les modules de travail de l’application, tels qu’ils apparaissent à l’écran :

- `Traiter les réclamations`
- `Créer des automatisations`
- `Contacter par lots`
- `Obtenir une synthèse`
- `Piloter les impayés`
- `Renouveler les assurances`
- `Piloter la relocation`
- `Piloter les attributions`
- `Piloter les ventes`

Les **chatbots** proposés sont les agents internes enregistrés dans `Administration` → `Paramétrage` → `Chatbot`. L’agent public `default` n’est pas une case à cocher : il est disponible pour tout collaborateur connecté dès que son entrée est prête et que `enabled` vaut `true`.

> [!NOTE]
> Cocher un module n’ouvre pas un écran encore en cours d’invention. Aujourd’hui, les équipes travaillent dans les modules décrits dans ce manuel. Les autres cases préparent les droits pour plus tard.

## Les utilisateurs

Chaque ligne montre :

| Colonne       | Contenu                                                                                                                                             |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Case à cocher | Pour une affectation de profil en lot.                                                                                                              |
| Identité      | Avatar, **nom d’usage**, adresse e-mail. Le nom d’usage est celui que la personne a renseigné dans ses réglages ; à défaut, la partie avant le `@`. |
| Profil        | Nom du gabarit, ou `Personnalisé` si les droits ont été cochés à la main.                                                                           |
| Statut        | `Administrateur` ou `Utilisateur`.                                                                                                                  |
| Actions       | Modifier, supprimer.                                                                                                                                |

Cliquez sur la ligne ou sur le crayon pour ouvrir la fiche.

### Créer un compte

1. Dans la rubrique `Utilisateurs`, cliquez sur `Créer`.
2. Saisissez l’**adresse e-mail** professionnelle — c’est l’identifiant de connexion. Elle ne pourra plus être changée ensuite.
3. Un **mot de passe** est proposé automatiquement. Vous pouvez le remplacer. Il doit faire entre 8 et 128 caractères.
4. Affichez-le (icône œil) et **copiez-le** pour le transmettre à la personne par un canal sûr.
5. Choisissez un **profil** d’accès, ou laissez `Personnalisé` pour cocher modules et chatbots à la main.
6. Activez `Administrateur` seulement si cette personne doit ouvrir `Administration`.
7. Cliquez sur `Créer`.

> [!CAUTION]
> Notez le mot de passe **avant** de fermer la fenêtre. PIERRE ne le réaffichera pas. Pour en donner un nouveau plus tard, rouvrez la fiche et saisissez un `Nouveau mot de passe`.

### Modifier un compte

Même fenêtre, titre `Modifier l’utilisateur`.

- L’e-mail est **verrouillé**.
- Le champ mot de passe s’appelle `Nouveau mot de passe`. Laissez-le vide pour ne pas le changer.
- Si vous changez **votre propre** mot de passe, PIERRE vous déconnecte : reconnectez-vous avec le nouveau.

### Profil ou droits personnalisés

| Affectation     | Comportement                                                                                                           |
| --------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Un profil nommé | Les cases modules et chatbots sont **grisées** : elles suivent le gabarit. Modifier le gabarit met à jour la personne. |
| `Personnalisé`  | Vous cochez librement modules et chatbots pour **cette** personne seulement.                                           |

Passer de `Personnalisé` à un profil **écrase** les cases individuelles par celles du gabarit.

### Le statut administrateur

L’interrupteur `Administrateur` est **hors profil**. Deux personnes sur le même gabarit « chargé de gestion » peuvent, l’une, administrer PIERRE, et l’autre non.

Un administrateur peut :

- ouvrir `Administration` (encyclopédie, utilisateurs, et les rubriques à venir) ;
- créer ou modifier les comptes et les profils ;
- déposer et publier des documents.

### Affecter un profil à plusieurs personnes

1. Cochez les comptes concernés (il n’y a pas de « tout sélectionner »).
2. Le bouton `Affecter un profil` apparaît.
3. Choisissez le gabarit dans le menu.

Tous les comptes cochés passent sur ce profil. Leurs accès deviennent ceux du gabarit. Les cases se décochent ensuite.

Le bouton n’apparaît que si au moins une personne est cochée. Il est indisponible s’il n’existe encore aucun profil.

### Importer un CSV

`Importer un CSV` sert à **créer des comptes** ou à **renouveler des mots de passe** en lot — pas à poser les droits.

Le fichier doit être un CSV de **moins de 1 Mo**, **sans ligne d’en-tête**, avec **exactement deux colonnes** :

```text
marie.dupont@organisme.fr,MotDePasseTemporaire1
jean.martin@organisme.fr,MotDePasseTemporaire2
```

| Règle                            | Détail                                                                                                                                                                      |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Colonne 1                        | Adresse e-mail valide.                                                                                                                                                      |
| Colonne 2                        | Mot de passe entre 8 et 128 caractères.                                                                                                                                     |
| Pas de doublon                   | Une même adresse ne doit figurer qu’une fois.                                                                                                                               |
| Votre propre ligne               | Interdite. Changez votre mot de passe depuis votre fiche, pas par import.                                                                                                   |
| Compte déjà existant             | Seul le mot de passe change. Le profil, les modules et le statut administrateur sont **conservés**.                                                                         |
| Nouvelle adresse                 | Un compte est créé : **non administrateur**, **aucun module**, **aucun chatbot**, **aucun profil**. Il faudra ensuite lui affecter un profil (fiche ou affectation en lot). |
| Une seule erreur dans le fichier | **Rien n’est importé.** Corrigez la ligne indiquée, puis renvoyez le fichier entier.                                                                                        |

À la fin, un message indique combien de comptes ont été **créés** et combien ont été **mis à jour**.

> [!TIP]
> L’usage le plus sûr : importer pour ouvrir les comptes et poser les mots de passe temporaires, puis affecter les profils dans l’écran. Transmettez chaque mot de passe par un canal sûr ; vous pourrez en poser un nouveau plus tard depuis la fiche.

### Supprimer un compte

L’icône corbeille demande confirmation : `Le compte … sera supprimé définitivement.`

La personne ne peut plus se connecter. Cette action est irréversible.

## Ce que PIERRE empêche (volontairement)

Ces garde-fous évitent de se retrouver sans personne pour administrer l’instance, ou de se fermer la porte.

| Action                                                 | Résultat                                                                 |
| ------------------------------------------------------ | ------------------------------------------------------------------------ |
| Supprimer **votre** propre compte                      | Refusé : `Vous ne pouvez pas supprimer votre propre compte.`             |
| Retirer **votre** propre droit administrateur          | Refusé : `Vous ne pouvez pas retirer votre propre accès administrateur.` |
| Supprimer ou rétrograder **le dernier** administrateur | Refusé. Il doit toujours en rester au moins un.                          |
| Supprimer un profil encore attribué                    | Refusé tant que des comptes y sont rattachés.                            |
| Créer un compte avec une adresse déjà utilisée         | Refusé.                                                                  |

Pour quitter vos fonctions d’administrateur : un **autre** administrateur retire votre statut, ou supprime votre compte, après avoir vérifié qu’il reste au moins un administrateur.

## Bonnes pratiques

- **Créez les profils avant les comptes.** Un gabarit nommé évite de recocher les mêmes cases vingt fois.
- **Un profil = un vrai rôle** dans l’organisme (`Chargé de gestion`, `Recouvrement`), pas une personne.
- **Peu d’administrateurs.** Le statut ouvre l’encyclopédie et les comptes : réservez-le à ceux qui paramètrent PIERRE.
- **Copiez le mot de passe avant de fermer** la fiche, puis transmettez-le par un canal sûr.
- **Importez d’abord, affectez ensuite.** Le CSV ouvre les comptes ; les droits se posent dans l’écran.

## Si quelque chose ne va pas

| Situation                            | Que faire                                                                                       |
| ------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `Utilisateurs indisponibles`         | Vérifiez la connexion à l’instance, puis `Réessayer`.                                           |
| `Aucun profil` / `Aucun utilisateur` | États normaux en début de déploiement. Créez d’abord un ou deux gabarits, puis les comptes.     |
| L’import est refusé                  | Le message cite souvent la **ligne** en cause (e-mail invalide, mot de passe trop court, etc.). |
| « Ce profil est encore affecté… »    | Passez les personnes concernées sur un autre profil ou en `Personnalisé`.                       |
| Vous ne voyez pas `Administration`   | Votre compte n’est pas administrateur. Demandez à un administrateur de vous l’accorder.         |
