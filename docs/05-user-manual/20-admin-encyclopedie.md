# Administration · Encyclopédie

L’`Encyclopédie` est le catalogue des documents et données que vous confiez à PIERRE. C’est à partir de ce catalogue que l’agent répond « comme un collègue de l’organisme » : procédures internes, coordonnées, consignes, exports métier.

Cette page décrit uniquement l’écran `Administration` → `Encyclopédie`. Pour préparer les fichiers avant de les déposer, voir [Préparer vos documents pour PIERRE](../04-knowledge/01-preparer-vos-documents.md). Pour le contenu attendu des cinq exports patrimoniaux, voir [Core Data HLM](../02-core-data-hlm/index.md). Les comptes et les droits d’accès sont dans [Administration · Utilisateurs](./21-admin-utilisateurs.md).

## Sommaire

<!-- toc maxdepth:3 -->

- [À quoi ça sert](#à-quoi-ça-sert)
- [Qui peut y accéder](#qui-peut-y-accéder)
- [Lire l’écran](#lire-lécran)
  - [Barre du haut](#barre-du-haut)
  - [Deux rubriques, jamais mélangées](#deux-rubriques-jamais-mélangées)
- [Core Data HLM](#core-data-hlm)
- [Autres sources](#autres-sources)
- [Ajouter des fichiers](#ajouter-des-fichiers)
- [Configurer un document ou un onglet](#configurer-un-document-ou-un-onglet)
  - [Contenu](#contenu)
  - [Profils autorisés](#profils-autorisés)
  - [Modules autorisés](#modules-autorisés)
- [Publier : le bouton Reconstruire](#publier--le-bouton-reconstruire)
- [Comprendre les états d’une ligne](#comprendre-les-états-dune-ligne)
- [Actions sur une ligne](#actions-sur-une-ligne)
- [Bonnes pratiques](#bonnes-pratiques)
- [Si quelque chose ne va pas](#si-quelque-chose-ne-va-pas)

<!-- tocstop -->

## À quoi ça sert

PIERRE ne « connaît » pas votre organisme tant que vous ne lui avez pas donné vos sources. L’encyclopédie sert à :

1. **Déposer** les fichiers (courriers-types, notes de service, tableaux, exports SI).
2. **Décider qui a le droit de s’en servir** — quels assistants et quels modules métier.
3. **Publier** une version à jour, que les équipes utilisent ensuite dans leur travail quotidien.

Tant qu’un document n’est affecté à personne, il reste visible dans la liste mais **n’est transmis à aucun assistant**. Tant que vous n’avez pas reconstruit après une modification, les équipes continuent d’utiliser **la version précédente** déjà publiée.

## Qui peut y accéder

Uniquement les **administrateurs**, depuis `Administration` → `Encyclopédie`.

## Lire l’écran

La page a toujours la même organisation.

### Barre du haut

| Élément                | Rôle                                                                                                                       |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `Rechercher`           | Filtre les **autres sources** (titre, nom de fichier, nom d’onglet). Les cinq lignes Core Data restent toujours affichées. |
| Message de statut      | Indique si une reconstruction est en cours, si elle a réussi ou échoué, ou s’il faut republier.                            |
| `Reconstruire`         | Publie le catalogue actuel. Indisponible pendant une reconstruction.                                                       |
| `Ajouter des fichiers` | Ouvre le sélecteur de fichiers de votre ordinateur. Plusieurs fichiers peuvent être choisis d’un coup.                     |

### Deux rubriques, jamais mélangées

| Rubrique         | Ce que vous y voyez                                                                         |
| ---------------- | ------------------------------------------------------------------------------------------- |
| `Core Data HLM`  | Les **cinq** exports attendus du SI, même s’ils n’ont pas encore été déposés.               |
| `Autres sources` | Tous les autres documents : Word, Markdown, CSV ordinaires, onglets Excel. Affectés ou non. |

Chaque ligne d’« autres sources » est **un document** (Word, Markdown, CSV) **ou un onglet** d’un classeur Excel.

## Core Data HLM

Ce sont les cinq photographies métier que PIERRE sait relier entre elles (patrimoine, réclamations, comptes locataires, travaux, candidats).

| Fichier attendu               | Contenu métier                            |
| ----------------------------- | ----------------------------------------- |
| `core.lots_locatifs.csv`      | Patrimoine locatif et occupation courante |
| `core.reclamations.csv`       | Réclamations, demandes et relation client |
| `core.comptes_locataires.csv` | Écritures comptables des locataires       |
| `core.travaux.csv`            | Bons de travaux et interventions          |
| `core.candidats.csv`          | Candidats à l’attribution                 |

Ces noms de fichiers sont **réservés et exacts**. Un fichier nommé autrement (même « presque ») n’est pas reconnu comme Core Data : il atterrit dans `Autres sources`.

Sur chaque ligne Core Data :

- le **titre** est le nom de fichier réservé ;
- la **description** rappelle le contenu métier ;
- si rien n’a encore été déposé, l’état est `Absent` et aucune action n’est proposée.

Le titre d’une source Core Data **ne se modifie pas**. PIERRE l’impose pour que les cinq exports restent reconnaissables.

> [!IMPORTANT]
> Chaque export Core Data doit être **complet à la date d’extraction** (tout le périmètre, pas seulement les nouveautés). Un nouvel envoi **remplace** le précédent.

## Autres sources

Tout le reste de la connaissance propriétaire : procédures, carnets d’agences, listes de présence, enquêtes, classeurs de consignes, etc.

- Ligne 1 : le **titre dans l’encyclopédie** (celui que vous avez saisi, ou le nom du fichier / de l’onglet).
- Ligne 2 : le **nom du fichier** tel qu’il a été déposé, avec son extension.

Les affectations (assistants, modules) ne figurent pas dans le titre : elles apparaissent à côté, sous la forme `2 profils · 1 module`. Un survol ouvre le détail des noms.

## Ajouter des fichiers

1. Cliquez sur `Ajouter des fichiers`.
2. Choisissez un ou plusieurs fichiers parmi les formats acceptés.
3. Si au moins un fichier est nouveau ou a changé, la fenêtre de configuration s’ouvre sur le premier contenu.
4. Renseignez le titre, les droits d’usage, puis `Enregistrer`.

Formats acceptés :

| Format                                    | Usage typique                          | Comment PIERRE le lit                          |
| ----------------------------------------- | -------------------------------------- | ---------------------------------------------- |
| Word (`.docx`)                            | Notes, procédures, modèles de courrier | Comme un texte suivi                           |
| Markdown (`.md`)                          | Même usage, en texte structuré         | Comme un texte suivi                           |
| CSV (`.csv`)                              | Listes et exports tabulaires           | Un tableau ; la première ligne sert d’en-têtes |
| Excel (`.xlsx`, `.xls`, `.xlsm`, `.xlsb`) | Tableaux à plusieurs onglets           | **Un onglet = une ligne** dans l’encyclopédie  |

Les PDF, images et autres formats sont refusés.

Après l’envoi, un message confirme soit `Sources mises à jour`, soit `Fichiers inchangés` (le fichier était déjà là, à l’identique).

> [!TIP]
> Pour **mettre à jour** un document déjà présent, redéposez un fichier **portant exactement le même nom**. La configuration déjà faite (titre, droits, onglets) est conservée. Seul le contenu est remplacé.

Les fichiers déposés automatiquement par la DSI (envoi programmé) apparaissent d’abord comme `Non affecté`. Vous leur attribuez ensuite les droits dans cet écran. Les envois suivants du même nom gardent cette configuration — et, s’ils étaient déjà affectés, ils sont **publiés tout seuls**. Depuis l’écran, en revanche, la publication se fait par `Reconstruire` (voir plus bas).

## Configurer un document ou un onglet

Cliquez sur la ligne, ou sur l’icône crayon. La fenêtre s’intitule `Configurer` suivi du nom de l’onglet ou du fichier.

### Contenu

**Titre dans l’encyclopédie** — c’est le nom sous lequel le contenu est identifié. S’il est vide, PIERRE reprend le nom du fichier (sans l’extension) ou le nom de l’onglet Excel. Choisissez un titre explicite pour un humain : `Procédure trouble du voisinage`, pas `DOC_VF2`.

Sous le titre, PIERRE affiche le nom interne qu’utilisera l’agent. Il est calculé automatiquement : vous n’avez pas à le saisir.

**Ligne des en-têtes** — uniquement pour Excel. Indiquez le numéro de la ligne qui contient les noms de colonnes (souvent `1`). Les CSV utilisent toujours leur première ligne.

### Profils autorisés

Cochez les **assistants** (chatbots) et les **expertises** de PIERRE qui ont le droit de s’appuyer sur ce contenu. La liste dépend de ce qui est installé sur votre instance.

> [!IMPORTANT]
> Ces « profils » sont ceux de **l’encyclopédie** (qui a le droit de _lire_ le document). Ce ne sont **pas** les profils d’accès des collaborateurs, gérés dans [Administration · Utilisateurs](./21-admin-utilisateurs.md).

### Modules autorisés

Cochez les modules de travail concernés, par exemple `Traiter les réclamations` ou `Piloter les impayés`. Le document devient alors disponible pour les expertises de ces modules.

Les deux listes sont **indépendantes**. Vous pouvez n’autoriser que des assistants, que des modules, ou les deux.

| Situation                       | Conséquence                                               |
| ------------------------------- | --------------------------------------------------------- |
| Au moins un profil ou un module | Le contenu pourra être utilisé, **après reconstruction**. |
| Aucune case cochée              | La ligne reste `Non affecté`. Personne ne s’en sert.      |

`Enregistrer` enregistre la configuration. `Annuler` ferme sans rien changer. La suppression ne se fait pas depuis cette fenêtre : elle se fait sur la ligne.

## Publier : le bouton Reconstruire

Déposer un fichier ou changer une affectation **ne met pas encore à jour** ce que voient les équipes. L’encyclopédie déjà publiée reste en service jusqu’à ce que vous cliquiez sur `Reconstruire`.

| Message dans la barre                               | Signification                                                               |
| --------------------------------------------------- | --------------------------------------------------------------------------- |
| `Catalogue modifié — reconstruire pour publier.`    | Vous avez changé quelque chose : republiez pour que ce soit pris en compte. |
| `Dernière reconstruction : En attente` / `En cours` | La publication tourne. Le bouton `Reconstruire` est indisponible.           |
| `Dernière reconstruction : Réussie`                 | La version en service est à jour.                                           |
| `Dernière reconstruction : Échouée`                 | La tentative a échoué. **La version précédente reste en service.**          |

Pendant une reconstruction, les lignes affectées passent à `En cours`. Il n’y a pas d’écran bloquant : vous pouvez continuer à consulter le catalogue.

> [!NOTE]
> Un échec ne « casse » pas PIERRE. Les équipes gardent la dernière encyclopédie valide. Corrigez le fichier ou la configuration, puis reconstruisez.

## Comprendre les états d’une ligne

Chaque ligne porte un badge. L’icône à gauche (tableau ou document) reprend la même couleur.

| Badge          | Signification                                                                             |
| -------------- | ----------------------------------------------------------------------------------------- |
| `Absent`       | Core Data : aucun fichier n’a encore été déposé pour cet export.                          |
| `Non affecté`  | Le fichier est là, mais aucun assistant ni module n’est coché. Inutilisé.                 |
| `À construire` | Affecté, mais pas encore publié (catalogue modifié, ou jamais construit).                 |
| `En cours`     | Une reconstruction est en train de tourner.                                               |
| `OK`           | Dernière reconstruction réussie pour cette entrée.                                        |
| `KO`           | Cette entrée a échoué lors de la dernière tentative. La version précédente reste publiée. |

`Non affecté` n’est **pas** une rubrique à part : la ligne reste dans `Autres sources` (ou dans Core Data si c’est l’un des cinq exports).

À droite du badge, le compte `N profils · N modules` rappelle les droits d’usage. S’il n’y a aucune affectation, rien n’est affiché.

La date de la ligne est celle de la **dernière modification** du fichier (jour et heure).

## Actions sur une ligne

Les actions sont à droite de chaque ligne déposée. Un libellé s’affiche au survol.

| Action      | Effet                                                                                                                               |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Télécharger | Récupère le fichier tel qu’il a été déposé, sous son nom d’origine.                                                                 |
| Modifier    | Ouvre la fenêtre de configuration.                                                                                                  |
| Désaffecter | Retire tous les profils et tous les modules. La ligne reste, à l’état `Non affecté`. Visible seulement si le contenu était affecté. |
| Supprimer   | Pour un fichier Word, Markdown, CSV, ou un Excel à un seul onglet : **supprime le fichier définitivement**.                         |
| Retirer     | Pour un Excel à **plusieurs onglets** : retire **cet onglet** de l’encyclopédie, sans supprimer les autres.                         |

Une confirmation est toujours demandée. Exemples de formulations :

- fichier seul : `carnet-agences.docx sera supprimé définitivement` ;
- fichier à plusieurs lignes : le nom du fichier **et le nombre de lignes** concernées ;
- onglet : `L’onglet … de … sera retiré de l’encyclopédie`.

Désaffecter n’efface pas le fichier. Supprimer, si.

## Bonnes pratiques

- **Préparez les fichiers avant de les déposer.** Titres clairs, un sujet par section, tableaux vraiment tabulaires (pas de cellules fusionnées). Le guide de préparation évite la plupart des refus.
- **Affectez tout de suite.** Un dépôt « pour plus tard » reste `Non affecté` et ne sert à personne — y compris les Core Data.
- **Reconstruisez après chaque campagne** d’ajouts ou de corrections, puis vérifiez que les lignes concernées passent à `OK`.
- **Gardez les noms de fichiers stables** pour les mises à jour (surtout les cinq `core.*.csv` et les envois automatiques de la DSI).
- **Un titre = un sujet.** Deux documents différents ne doivent pas porter le même titre pour le même assistant : PIERRE refuse la collision.

## Si quelque chose ne va pas

| Situation                         | Que faire                                                                                              |
| --------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `Encyclopédie indisponible`       | Vérifiez que l’application est bien connectée à l’instance, puis `Réessayer`.                          |
| Un Core Data reste `Absent`       | Le fichier n’a pas le nom exact attendu, ou il n’a pas encore été déposé.                              |
| Une ligne reste `Non affecté`     | Ouvrez la configuration et cochez au moins un profil ou un module.                                     |
| Le statut demande de reconstruire | Cliquez sur `Reconstruire`, puis attendez `Réussie`.                                                   |
| Badge `KO`                        | La version précédente est toujours en service. Rouvrez le fichier, corrigez, redéposez, reconstruisez. |
| Un format est refusé              | Seuls Word, Markdown, CSV (point-virgule, UTF-8) et Excel sont acceptés.                               |
