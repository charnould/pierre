# Créer des automatisations

`Créer des automatisations` permet de faire travailler PIERRE **à heure fixe** : un rapport d’analyse pour l’équipe, ou des brouillons de réponses sur des réclamations qui correspondent à vos critères.

Cette page décrit uniquement l’écran `Automatisations`. Les rapports aboutissent dans les [notifications](./01-accueil.md). Les brouillons de réponses s’appuient sur [Traiter les réclamations](./11-reclamations.md).

## Sommaire

<!-- toc maxdepth:3 -->

- [À quoi ça sert](#à-quoi-ça-sert)
- [Qui peut y accéder](#qui-peut-y-accéder)
- [Lire l’écran](#lire-lécran)
- [Créer ou modifier](#créer-ou-modifier)
  - [Champs communs](#champs-communs)
  - [Rapport d’analyse](#rapport-danalyse)
  - [Pré-génération de réponses](#pré-génération-de-réponses)
  - [Actions du propriétaire](#actions-du-propriétaire)
- [Historique et rapports](#historique-et-rapports)
- [Bonnes pratiques](#bonnes-pratiques)
- [Si quelque chose ne va pas](#si-quelque-chose-ne-va-pas)

<!-- tocstop -->

## À quoi ça sert

Une automatisation est une **routine** : un nom, une fréquence, des collaborateurs à prévenir, et un travail que PIERRE recommence tout seul.

Deux types, choisis **à la création** et ensuite figés :

| Type                         | Résultat                                                                                                                                                                                     |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Rapport d'analyse`          | Un contenu rédigé par PIERRE (points d’attention, revue de dossiers…).                                                                                                                       |
| `Pré-génération de réponses` | Des brouillons de courrier ou d’e-mail sur les réclamations qui matchent vos filtres. Les brouillons déjà produits ne sont pas régénérés. Dans la liste, le type s’affiche `Pré-génération`. |

## Qui peut y accéder

Les personnes connectées dont le compte inclut le module `Créer des automatisations`.

**Seul le propriétaire** peut modifier, lancer, désactiver ou supprimer une automatisation. Les autres voient la ligne et peuvent ouvrir les **rapports** déjà produits.

## Lire l’écran

L’en-tête affiche `Automatisations` et le nombre. À droite : recherche (`Rechercher…`) et `Créer`.

`Trier par` propose : `Dernière génération (récent)` ou `(ancien)`, `Prochaine exécution`, `Propriétaire (A→Z)`, `Nom (A→Z)`, `Type`.

Chaque ligne montre le nom, la description, les avatars des collaborateurs prévenus, le statut de la dernière exécution (`Succès` / `En échec`), la prochaine échéance, et — pour un rapport — `Historique`. Vous pouvez `Épingler` une ligne pour la garder sous les yeux.

| Situation              | Titre                                | Suite                                                    |
| ---------------------- | ------------------------------------ | -------------------------------------------------------- |
| Liste vide             | `Commencez à automatiser vos tâches` | Bouton `Créer une automatisation`.                       |
| Recherche vide         | `Aucun résultat`                     | Élargissez les mots cherchés.                            |
| Sans être propriétaire | `Modification non autorisée`         | Les rapports restent disponibles dans les notifications. |

## Créer ou modifier

`Créer` ouvre `Créer une automatisation`. Un clic sur une ligne dont vous êtes propriétaire ouvre `Modifier l'automatisation`.

### Champs communs

| Champ            | Rôle                                                                                                                                                                        |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Nom`            | Visible dans la liste et les notifications.                                                                                                                                 |
| `Description`    | Résumé dans la liste seulement.                                                                                                                                             |
| `Fréquence`      | `Périodicité` : `Quotidien`, `Hebdomadaire`, `Mensuel`, `Annuel`. Puis les jours (`Tous les jours`, `Lun–ven. (hors week-end)`, ou un jour / une date) et l’heure (`Vers`). |
| `Collaborateurs` | Personnes notifiées à chaque exécution. `Rechercher un collaborateur…`                                                                                                      |

### Rapport d’analyse

- `Rapports conservés` : combien d’éditions garder.
- `Instructions` : ce que PIERRE doit produire (texte mis en forme : titres, listes, tableaux).

### Pré-génération de réponses

- `Format de réponse` : `Réponse numérique (email)` ou `Réponse postale (courrier)`.
- `Filtres réclamations` : `Ajouter un filtre`, puis `Aperçu` pour voir `N réclamation(s) éligible(s)`.
- `Limite` : maximum de réclamations traitées à chaque exécution.

### Actions du propriétaire

| Bouton                        | Effet                                                       |
| ----------------------------- | ----------------------------------------------------------- |
| `Programmer l'automatisation` | Crée la routine (création).                                 |
| `Sauvegarder`                 | Enregistre les modifications.                               |
| `Lancer maintenant`           | Exécute tout de suite ; le résultat arrive en notification. |
| `Désactiver` / `Réactiver`    | Met en pause ou reprend le calendrier.                      |
| `Supprimer`                   | Confirmation `Supprimer cette automatisation ?`             |
| `Annuler`                     | Ferme sans enregistrer.                                     |

Messages habituels : `Automatisation créée`, `Automatisation mise à jour`, `Automatisation supprimée`, `Rapport disponible dans les notifications`, `Brouillons disponibles dans les notifications`.

## Historique et rapports

Sur une automatisation de type rapport, `Historique` ouvre `Historique des rapports` : dates, mention `Rapport` ou `N brouillons générés sur N`. Un clic ouvre le rapport (fenêtre dédiée ou notification).

S’il n’y a encore rien : `Aucun élément généré`.

Les pré-générations n’ont pas ce menu dans la liste : leurs brouillons se retrouvent dans les notifications.

## Bonnes pratiques

- **Nommez par l’usage**, pas par la technique : `Points chauds avant astreinte`, pas `AUTO_17`.
- **Prévenez les bonnes personnes**, pas tout le service. Chaque exécution notifie la liste.
- **Lancez une fois à la main** après création, pour vérifier le rapport avant d’attendre lundi matin.
- **Gardez les instructions stables.** Un texte clair dans `Instructions` vaut mieux qu’une phrase trop longue à chaque révision.

## Si quelque chose ne va pas

| Situation                                           | Que faire                                                                                      |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `Création impossible` / `Enregistrement impossible` | Vérifiez le nom, la fréquence et — pour une pré-génération — les filtres.                      |
| `Filtre obsolète`                                   | Une colonne de réclamation a changé : rouvrez les filtres et l’aperçu.                         |
| `Modification non autorisée`                        | Demandez au propriétaire, ou dupliquez l’idée dans une nouvelle routine.                       |
| Statut `En échec`                                   | Rouvrez l’automatisation, `Lancer maintenant`, puis lisez le message d’erreur en notification. |
| Personne n’a reçu le rapport                        | Vérifiez la liste `Collaborateurs` et vos notifications.                                       |
