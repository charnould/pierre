# Obtenir une synthèse

`Obtenir une synthèse` produit un **texte de briefing** sur un locataire, un client, un lot ou un bâtiment, pour une période donnée. Vous arrivez à un rendez-vous avec le contexte déjà rassemblé.

Cette page décrit uniquement l’écran `Obtenir une synthèse`. Les données utilisées sont celles publiées dans l’[encyclopédie](./20-admin-encyclopedie.md). Pour une question libre, sans numéro interne, préférez [Discuter](./10-discuter.md).

## Sommaire

<!-- toc maxdepth:3 -->

- [À quoi ça sert](#à-quoi-ça-sert)
- [Qui peut y accéder](#qui-peut-y-accéder)
- [Lire l’écran](#lire-lécran)
- [Remplir le formulaire](#remplir-le-formulaire)
  - [Objet de la synthèse](#objet-de-la-synthèse)
  - [Période](#période)
  - [Contexte et fichiers](#contexte-et-fichiers)
- [Générer et relire](#générer-et-relire)
- [Bonnes pratiques](#bonnes-pratiques)
- [Si quelque chose ne va pas](#si-quelque-chose-ne-va-pas)

<!-- tocstop -->

## À quoi ça sert

La synthèse sert à **préparer un échange** : visite, commission, appel d’un locataire. PIERRE relit les données mises à disposition sur l’identifiant que vous saisissez, dans la période demandée, et rédige un texte que vous pouvez copier.

Ce n’est pas un dossier vivant : il n’y a pas d’historique d’actions à y laisser. Pour agir, ouvrez ensuite le métier concerné.

## Qui peut y accéder

Les personnes connectées dont le compte inclut le module `Obtenir une synthèse`.

## Lire l’écran

Deux panneaux, dès l’ouverture :

| Côté   | Titre utile | Contenu                                                               |
| ------ | ----------- | --------------------------------------------------------------------- |
| Gauche | Contexte    | Formulaire : objet, identifiant, période, précisions, pièces jointes. |
| Droite | Résultat    | La synthèse, ou l’état vide.                                          |

Une poignée entre les deux permet d’élargir l’un ou l’autre.

À droite, tant que rien n’est généré : `Aucune synthèse` — `Complétez le formulaire à gauche, puis générez la synthèse.`

Si l’instance connaît vos exports, une carte `Données disponibles` liste les tables importées. Une table `absente` ne pourra pas nourrir la synthèse : `Les synthèses reflètent les données mises à disposition et peuvent donc être incomplètes.`

## Remplir le formulaire

### Objet de la synthèse

`De quoi souhaitez-vous une synthèse ?`

| Choix       | Champ d’identifiant   | Exemple de saisie |
| ----------- | --------------------- | ----------------- |
| `Locataire` | `Numéro du locataire` | `18732`           |
| `Client`    | `Numéro du client`    | `CLI-4521`        |
| `Lot`       | `Numéro du lot`       | `00297-00099`     |
| `Bâtiment`  | `Numéro du bâtiment`  | `00297`           |

L’identifiant est **interne** (celui de vos exports). Sans lui, le bouton de génération reste inactif.

Changer d’objet **efface** une synthèse déjà produite.

### Période

`Quelle période inclure ?` — `Bornes incluses`. Un curseur va de 2000 à 2029. La sélection s’affiche sous la forme `2015 – 2020`.

### Contexte et fichiers

`Contexte additionnel` (optionnel) : précisions utiles pour orienter le texte (objet du rendez-vous, point de vigilance).

`Pièces jointes` (optionnel) : `Déposez des fichiers ici` ou `Parcourir`. Mêmes limites que la discussion : jusqu’à 5 fichiers, PDF / Office / images / texte, 10 Mo chacun, 20 Mo au total. Échec de lecture : `Impossible de lire l'une des pièces jointes.`

## Générer et relire

| Commande                      | Rôle                                                         |
| ----------------------------- | ------------------------------------------------------------ |
| `Générer la synthèse`         | Premier lancement.                                           |
| `Regénérer la synthèse`       | Relance avec le même formulaire (ou après une modification). |
| `Cmd` ou `Ctrl` + `Entrée`    | Équivalent du bouton.                                        |
| `Échap` pendant la génération | Annule la génération en cours.                               |
| `Échap` avant toute synthèse  | Revient à l’accueil et **vide** le formulaire.               |

Le titre du résultat reprend l’objet et l’identifiant, par exemple `Synthèse locataire · 18732`, plus la période. Le texte est mis en forme (titres, listes, tableaux). Pendant le travail : `Réflexion` ou `Génération`.

La consigne suivie par l’agent n’est pas livrée avec l’instance. Dans `Administration`, onglet `Paramétrage`, entrée `Synthèses`, collez [Réaliser une synthèse](../03-core-intelligence-hlm/prompts/Réaliser%20une%20synthèse.md), puis `Enregistrer`. Le module reste « non paramétré » tant que cette entrée n’est pas complète.

`Copier` place le texte dans le presse-papiers (`Copié` le confirme). Il n’y a pas d’export Word sur cet écran.

En cas d’échec : `Erreur de génération.` sous le formulaire.

## Bonnes pratiques

- **Utilisez le vrai identifiant interne**, pas le nom du locataire. La synthèse ne cherche pas « Mme Dupont ».
- **Resserrez la période** autour de ce dont vous avez besoin : vingt-neuf années produisent un texte plus dilué.
- **Dites l’objet du rendez-vous** dans le contexte additionnel : PIERRE oriente le briefing.
- **Regardez `Données disponibles` avant de vous étonner d’un trou.** Une table absente explique une synthèse courte.

## Si quelque chose ne va pas

| Situation                                       | Que faire                                                                                              |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Le bouton reste grisé                           | Saisissez un identifiant, et vérifiez que la période est cohérente.                                    |
| `Erreur de génération.`                         | Réessayez ; si cela revient, contrôlez l’identifiant et les données publiées.                          |
| La synthèse ignore tout un pan de la vie du lot | L’export correspondant n’est pas dans l’encyclopédie, ou n’est pas affecté à ce module.                |
| L’écran est blanc au premier instant            | Attendez une seconde : les largeurs de panneaux se chargent.                                           |
| Vous vouliez garder le texte                    | `Copier` avant de quitter : `Échap` (sans synthèse) ou l’accueil de la barre de titre referme l’écran. |
