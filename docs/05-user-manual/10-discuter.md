# Discuter

`Discuter` est la conversation avec l’assistant de l’organisme. Vous posez une question, joignez un fichier si besoin, et PIERRE répond à partir de l’encyclopédie et des données auxquelles votre profil a droit.

Cette page décrit uniquement l’écran `Discuter avec {agent}`. Ce que l’assistant a le droit de lire se règle dans [Administration · Encyclopédie](./20-admin-encyclopedie.md). Qui a le droit d’ouvrir cet écran se règle dans [Administration · Utilisateurs](./21-admin-utilisateurs.md).

## Sommaire

<!-- toc maxdepth:3 -->

- [À quoi ça sert](#à-quoi-ça-sert)
- [Qui peut y accéder](#qui-peut-y-accéder)
- [Lire l’écran](#lire-lécran)
- [Changer de profil](#changer-de-profil)
- [Joindre un fichier](#joindre-un-fichier)
- [Répondre à un questionnaire](#répondre-à-un-questionnaire)
- [Bonnes pratiques](#bonnes-pratiques)
- [Si quelque chose ne va pas](#si-quelque-chose-ne-va-pas)

<!-- tocstop -->

## À quoi ça sert

La discussion sert à **obtenir une information** ou une aide à la rédaction, sans ouvrir un dossier : procédure, coordonnées, lecture d’un export, reformulation d’un message.

Ce n’est pas le lieu pour traiter une réclamation ou un impayé : pour cela, ouvrez le métier correspondant. Si l’assistant a besoin de précisions, il peut afficher un **questionnaire** au-dessus de la zone de saisie.

## Qui peut y accéder

Toute personne connectée. L’agent public (`default`) est disponible dès qu’il est allumé dans `config.ts`. Les autres assistants n’apparaissent que s’ils ont été attribués. Sans agent public et sans attribution, l’écran peut rester vide.

## Lire l’écran

Deux zones :

| Zone              | Rôle                                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Fil de discussion | Vos messages à droite, les réponses de l’assistant en dessous.                                                            |
| Zone de saisie    | Sélecteur de profil (s’il y en a plusieurs), zone `Comment puis-je vous aider aujourd'hui ?`, trombone, bouton `Envoyer`. |

Tant que vous n’avez rien envoyé, la zone de saisie est centrée dans l’écran, avec la phrase d’accueil et les questions proposées si l’agent en a. Après le premier message, seule la saisie reste en bas, avec la mention si l’agent en a une.

Pendant que l’assistant prépare sa réponse, un indicateur `Réflexion` peut apparaître, parfois suivi du détail des outils utilisés (`Travail en cours`, `N outil(s) utilisé(s)`). Vous pouvez `Arrêter` la génération, puis `Regénérer` ou `Réessayer` si elle a échoué ou a été interrompue.

`Entrée` envoie le message. `Maj + Entrée` passe à la ligne.

## Changer de profil

Si plusieurs assistants vous sont ouverts, une liste `Profil de {agent}` apparaît à gauche de la zone de saisie. En changer **arrête** la génération en cours et **efface** la conversation : une nouvelle discussion commence.

S’il n’y a qu’un seul profil, la liste est masquée.

## Joindre un fichier

Si votre instance l’autorise, cliquez le trombone à côté d’`Envoyer`, ou glissez-déposez des fichiers sur la conversation. Le composer s’entoure d’un ring au dépôt. Formats : PDF, Office, images et fichiers texte.

| Limite             | Message typique                                              |
| ------------------ | ------------------------------------------------------------ |
| 5 fichiers maximum | `Vous pouvez joindre au maximum 5 fichiers.`                 |
| 10 Mo par fichier  | `{fichier} dépasse la limite de 10 Mo.`                      |
| 20 Mo au total     | `Les pièces jointes ne peuvent pas dépasser 20 Mo au total.` |
| Format inconnu     | `{fichier} — Le format .{ext} n'est pas pris en charge.`     |
| Doublon            | `{fichier} est déjà joint.`                                  |

Pour retirer un fichier avant l’envoi : `Retirer {nom}`.

## Répondre à un questionnaire

Quand l’assistant a besoin d’un choix, une carte s’affiche au-dessus de la saisie : questions, propositions, éventuellement `Autre réponse`. S’il y a plusieurs questions, une progression du type `1 / 3` apparaît, avec `Précédent` et `Suivant`. `Répondre` envoie ; pendant l’envoi le bouton devient `Envoi…`.

Si l’envoi échoue : `La réponse n'a pas pu être envoyée.`

## Bonnes pratiques

- **Une question = un sujet.** Mieux vaut deux messages clairs qu’un paragraphe qui mélange trois dossiers.
- **Vérifiez ce qui compte.** Vous l’avez accepté à la connexion : une réponse peut se tromper.
- **Changez de profil à dessein.** Chaque profil a ses documents ; changer de profil recommence la conversation.
- **Pour un dossier nommé**, préférez le métier (réclamation, impayé, synthèse) : l’historique du dossier y reste.

## Si quelque chose ne va pas

| Situation                                                  | Que faire                                                                  |
| ---------------------------------------------------------- | -------------------------------------------------------------------------- |
| `Configurez et connectez-vous pour accéder au chatbot.`    | Connectez-vous dans [Paramètres](./02-parametres.md).                      |
| `Chargement du chatbot…` qui ne finit pas                  | Vérifiez le réseau, puis rouvrez l’écran.                                  |
| `Impossible de charger le chatbot.`                        | Reconnectez-vous. Si cela persiste, prévenez un administrateur.            |
| `Une erreur s'est produite chez le fournisseur de modèle.` | `Réessayer`. Si l’échec revient, réessayez plus tard.                      |
| `Génération interrompue.`                                  | `Regénérer`, ou reformulez la question.                                    |
| L’écran reste vide                                         | L’agent public est éteint et aucun assistant interne ne vous est attribué. |
