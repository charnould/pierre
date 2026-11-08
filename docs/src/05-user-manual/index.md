# Manuel utilisateur

Ce manuel décrit l’usage quotidien de l’**application desktop PIERRE** : se connecter, ouvrir un métier, traiter un dossier, et — pour les administrateurs — ouvrir PIERRE aux collègues et lui donner les documents de l’organisme.

Il s’adresse aux **collaborateurs** et aux **référents** qui utilisent l’outil, pas à ceux qui l’installent. L’installation et le premier compte administrateur sont dans [Installation & Paramétrage](../06-installation/index.md). La préparation des fichiers avant dépôt est dans [Préparer vos documents pour PIERRE](./20-admin-encyclopedie.md#préparer-vos-documents-pour-pierre).

## Comment lire ces pages

Chaque écran a **sa** page. Le plan est le même partout, pour que vous retrouviez vos marques :

| Rubrique                   | Ce que vous y trouvez                                       |
| -------------------------- | ----------------------------------------------------------- |
| À quoi ça sert             | Le travail que l’écran permet de faire.                     |
| Qui peut y accéder         | Compte connecté, module, chatbot, ou statut administrateur. |
| Lire l’écran               | Ce que vous voyez : colonnes, tiroirs, états vides.         |
| Les actions                | Les boutons, dans l’ordre d’un vrai usage.                  |
| Bonnes pratiques           | Quelques habitudes qui évitent les allers-retours.          |
| Si quelque chose ne va pas | Les messages de l’application et la suite à donner.         |

Les mots écrits comme dans l’application (`Accueil`, `Reconstruire`) sont ceux de l’interface. Un clic sur un lien interne ouvre la page du métier voisin (réclamation → impayé, accueil → paramètres, etc.).

## Organisation

Les pages sont numérotées pour rester dans le même ordre à l’écran, dans le dépôt, et dans le sommaire ci-dessous — qui se **reconstruit tout seul** à partir des fichiers du dossier.

| Préfixe de fichier           | Partie          | Contenu                                    |
| ---------------------------- | --------------- | ------------------------------------------ |
| `01`–`09`                    | Prendre en main | Accueil, connexion et réglages personnels. |
| `10`–`19`                    | Modules métier  | Les écrans de travail ouverts aujourd’hui. |
| `20` et suivants (`admin-…`) | Administration  | Encyclopédie et comptes.                   |

Une nouvelle page qui suit cette convention apparaît dans le sommaire au prochain build, sans modifier cet index à la main.

## Ce que vous n’y trouverez pas

Ces écrans existent dans les droits ou dans l’administration. Ils n’ont pas de page dans ce manuel :

- métiers à l’écran encore vide : `Renouveler les assurances`, `Piloter la relocation`, `Piloter les attributions`, `Piloter les ventes`. Cocher le module affiche la porte.

## Ouvrir PIERRE

1. Au premier lancement, [Paramètres](./02-parametres.md) affiche le formulaire de connexion (serveur, e-mail, mot de passe).
2. Après connexion, vous arrivez sur l’[accueil](./01-accueil.md) : les métiers auxquels vous avez droit, et ce qui vous attend.
3. L’entrée `Administration` n’apparaît dans la barre de titre que si votre compte est **administrateur**. Le premier compte se crée à l’installation : [Administrer PIERRE avec une interface graphique](../06-installation/01-server.md).

## Sommaire

<!-- docs-pages -->

### Prendre en main

- [Accueil](./01-accueil.md) — L’Accueil est le point d’entrée après la connexion : les métiers auxquels vous avez droit, et quatre colonnes pour ce qui vous attend aujourd’hui.
- [Paramètres](./02-parametres.md) — Paramètres est l’écran de connexion quand vous n’êtes pas encore identifié, puis celui de votre compte une fois connecté : nom, avatar, compagnon, extraits de l’accueil.

### Modules métier

- [Discuter](./10-discuter.md) — Discuter est la conversation avec l’assistant de l’organisme. Vous posez une question, joignez un fichier si besoin, et PIERRE répond à partir de l’encyclopédie et des données auxquelles votre profil a droit.
- [Traiter les réclamations](./11-reclamations.md) — Traiter les réclamations est le tableau des demandes locataires importées dans PIERRE. Vous y ouvrez un dossier, voyez le contexte, laissez une trace, répondez, et faites avancer le travail.
- [Piloter les impayés](./12-impayes.md) — Piloter les impayés est le tableau des dossiers de recouvrement, classés par phase. Vous y lisez la dette, contactez, laissez une trace, et construisez un plan d’apurement.
- [Créer des automatisations](./13-automatisations.md) — Créer des automatisations permet de faire travailler PIERRE à heure fixe pour produire un rapport d’analyse destiné à l’équipe.
- [Contacter par lots](./14-contacter-par-lots.md) — Contacter par lots prépare un traitement de masse : une audience de locataires, un enchaînement de canaux (RCS, SMS, courriel, courrier), un aperçu ligne à ligne, puis un envoi réel ou un simple avancement des dossiers.
- [Obtenir une synthèse](./15-synthese.md) — Obtenir une synthèse produit un texte de briefing sur un locataire, un client, un lot ou un bâtiment, pour une période donnée. Vous arrivez à un rendez-vous avec le contexte déjà rassemblé.

### Administration

- [Administration · Encyclopédie](./20-admin-encyclopedie.md) — L’Encyclopédie est le catalogue des documents et données que vous confiez à PIERRE. C’est à partir de ce catalogue que l’agent répond « comme un collègue de l’organisme » : procédures internes, coordonnées, consignes, exports métier.
- [Administration · Utilisateurs](./21-admin-utilisateurs.md) — L’écran Utilisateurs sert à ouvrir PIERRE aux collaborateurs de l’organisme : qui peut se connecter, quels modules il voit, quels assistants il peut interroger, et qui a le droit d’administrer.
- [Administration · Prestataires](./22-admin-prestataires.md) — L’écran Prestataires règle le nom de l’organisme, son fuseau, le modèle qui répond, et les canaux RCS et email. Une valeur enregistrée affiche une coche. Un secret enregistré affiche un masque, jamais la clé.
- [Administration · Agents conversationnels](./23-admin-chatbot.md) — L’écran Agents conversationnels règle les assistants de l’organisme : l’agent public, accessible aux collaborateurs et aux tiers externes, et les autres agents, réservés aux collaborateurs auxquels on les attribue. L’agent public a un JSON, un prompt système et une icône. Chaque autre agent a un JSON et un prompt système.
- [Administration · Conversations](./24-admin-conversations.md) — L’écran Conversations sert à relire ce que les personnes ont demandé à un assistant, puis à qualifier la qualité de l’échange pour les administrateurs qui amélioreront ensuite l’encyclopédie ou les prompts système.
- [Administration · Statistiques](./25-admin-statistiques.md) — L’écran Statistiques sert à voir combien le modèle de langage consomme, et à ouvrir le journal d’un traitement lorsque une réponse semble anormale.
- [Paramétrer les impayés](./26-admin-repayment.md) — repayment.json règle le module « Impayés ». On le colle dans Administration → Impayés → Configuration. Les textes affichés sont en français. Les clés sont en anglais.

<!-- docs-pagesstop -->
