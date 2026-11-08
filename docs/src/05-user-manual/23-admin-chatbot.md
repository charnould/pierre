# Administration · Agents conversationnels

L’écran `Agents conversationnels` règle les assistants de l’organisme : l’agent public, accessible aux collaborateurs et aux tiers externes, et les autres agents, réservés aux collaborateurs auxquels on les attribue. L’agent public a un JSON, un prompt système et une icône. Chaque autre agent a un JSON et un prompt système.

Cette page décrit uniquement la porte `Agents conversationnels` de `Administration`. Les prompts système de `Réclamations`, `Impayés`, `Synthèses` et `Générer un rapport` sont les portes voisines. Qui peut interroger un agent interne se règle dans [Administration · Utilisateurs](./21-admin-utilisateurs.md). Les documents qu’il a le droit de lire se règlent dans [Administration · Encyclopédie](./20-admin-encyclopedie.md). Le modèle de langage, le même pour tous les assistants, se règle dans [Administration · Prestataires](./22-admin-prestataires.md). La conversation est l’écran [Discuter](./10-discuter.md).

## Sommaire

<!-- toc maxdepth:3 -->

- [À quoi ça sert](#à-quoi-ça-sert)
- [Qui peut y accéder](#qui-peut-y-accéder)
- [Lire l’écran](#lire-lécran)
- [Préparer le JSON](#préparer-le-json)
- [Le chatbot public](#le-chatbot-public)
- [Les agents internes](#les-agents-internes)
- [Les clés du JSON](#les-clés-du-json)
  - [trace](#trace)
  - [Clés refusées ou ignorées](#clés-refusées-ou-ignorées)
- [Le prompt système](#le-prompt-système)
- [Ce que la personne voit](#ce-que-la-personne-voit)
- [Documents et droits](#documents-et-droits)
- [Supprimer un agent interne](#supprimer-un-agent-interne)
- [Bonnes pratiques](#bonnes-pratiques)
- [Si quelque chose ne va pas](#si-quelque-chose-ne-va-pas)

<!-- tocstop -->

## À quoi ça sert

Un assistant répond aux questions à partir de son prompt système et des documents qui lui sont ouverts. L’écran sert à en tenir un ou plusieurs.

1. **Ouvrir le chatbot public** sur l’adresse du serveur, pour les locataires et les candidats, et dans `Discuter` pour chaque collaborateur connecté.
2. **Ajouter des agents internes** (astreinte, recouvrement, gardiens) et les attribuer à des profils.
3. **Régler, pour chacun,** le nom affiché, la phrase d’accueil, les questions proposées, la mention, les pièces jointes, et ce que la personne voit du travail de l’assistant.

Le chemin complet, dans l’ordre :

1. Porte `Agents conversationnels`. Sur l’onglet `Agent public`, collez le JSON, écrivez le prompt système, déposez l’icône, `Enregistrer`.
2. Ouvrez l’onglet `Nouvel agent` (+). Collez un JSON dont `id` est libre, écrivez son prompt système, `Enregistrer`. L’onglet prend alors cet `id`. Répétez pour chaque agent.
3. Dans l’[encyclopédie](./20-admin-encyclopedie.md), affectez les documents, puis `Reconstruire`.
4. Dans [Utilisateurs](./21-admin-utilisateurs.md), cochez chaque agent interne sur les profils concernés.
5. Vérifiez le site dans un navigateur, et `Discuter` dans l’application.

Les sections suivantes détaillent chaque étape, chaque clé, et ce qui change vraiment quand vous enregistrez.

Trois noms circulent. Les tenir séparés évite la plupart des allers-retours.

| Nom                | Où vous l’écrivez                                       | Où les gens le voient                                                                                     |
| ------------------ | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Identifiant        | Clé `id` du JSON                                        | Onglet de cette page (`Agent public` pour `default`, sinon l’identifiant, par exemple `cadre-astreinte`). |
| `display`          | Clé `display` du JSON                                   | Options du menu `Profil` dans Discuter, cases `Chatbots` des comptes, profils de l’encyclopédie.          |
| Nom de l’organisme | [Prestataires](./22-admin-prestataires.md), `Organisme` | Porte `Discuter avec {nom}`, nom sous l’icône installée sur un téléphone, expéditeur des e-mails.         |

La porte `Discuter avec {nom}` suit le nom de l’organisme. Le menu `Profil` suit `display`.

## Qui peut y accéder

Les **administrateurs**, depuis `Administration` → `Agents conversationnels`.

Le réglage vaut pour tout l’organisme. Un JSON enregistré est celui de tous les postes, pas d’un seul collaborateur.

## Lire l’écran

La porte s’appelle `Agents conversationnels`. Le bandeau dit `Paramétré` quand l’agent public a ses trois pièces, et `À paramétrer` tant qu’il en manque une. Il suit ces trois pièces seulement. `enabled` à `false` peut laisser `Paramétré`. Des agents internes peuvent déjà répondre aux équipes pendant que la porte affiche encore `À paramétrer`.

Sous le titre, des onglets : `Agent public`, puis l’identifiant de chaque autre agent, puis `+` (`Nouvel agent`). Un seul agent est ouvert. Les autres restent dans la barre.

Une coche à côté de `Configuration`, `Prompt système` ou `Icône` dit que la pièce est enregistrée. Rien ne s’affiche tant qu’elle est vide. Un autre agent n’a pas d’icône.

| Zone                          | Rôle                                                                                                                                                                                |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Agent public`                | Icône, JSON, puis prompt système. Accessible aux collaborateurs et aux tiers externes.                                                                                              |
| Onglet d’un autre identifiant | JSON et prompt système. Réservé aux collaborateurs auxquels il est attribué. `Supprimer` est sur la carte. Le titre de la carte est l’identifiant.                                  |
| `Nouvel agent`                | JSON et prompt système. `id` nomme l’agent. Rien n’est créé tant que `Enregistrer` n’a pas réussi. Un brouillon vide n’est pas envoyé.                                              |
| `Configuration`               | Le JSON. Vide, le champ fait trois lignes, puis il grandit avec le texte.                                                                                                           |
| `Prompt système`              | Le texte lu au début de chaque nouvelle conversation. Vide, le champ fait trois lignes, puis il prend la hauteur du texte.                                                          |
| `Icône`                       | Le SVG de l’agent public. Le dépôt est immédiat : toast `Téléversé`.                                                                                                                |
| `Enregistrer`                 | Écrit le JSON et le prompt système de chaque agent déjà connu, et le brouillon de `Nouvel agent` s’il contient du texte. Le toast `Enregistré` dit qu’aucune pièce n’a été refusée. |

`Enregistrer` envoie les textes l’un après l’autre. Un JSON refusé n’empêche pas le prompt système d’être écrit, et l’inverse. Le message reste sous le champ en cause. Tant que l’une des pièces échoue, le toast `Enregistré` n’apparaît pas.

La première fois que la dernière pièce manquante arrive, PIERRE construit la base de l’agent avant de répondre. L’attente a lieu sur `Enregistrer`, ou sur le dépôt de l’icône quand c’était la pièce manquante. L’action reste en cours jusqu’au toast. Attendez-le.

Après un `Enregistrer` réussi, PIERRE réindente le JSON. Les valeurs sont les mêmes.

## Préparer le JSON

Le JSON est un objet : une accolade ouvrante, des lignes `clé` / valeur, une accolade fermante.

- Les clés et les phrases sont entre **guillemets doubles** : `"display": "PIERRE"`.
- `true` et `false` s’écrivent **sans** guillemets. `"true"` est un texte, et il est refusé.
- Une liste est entre crochets. Chaque phrase est entre guillemets. Une virgule sépare les éléments. Pas de virgule après le dernier.
- Pas de commentaire, pas de virgule finale, pas de guillemets simples.
- Un guillemet double à l’intérieur d’une phrase s’écrit `\"`. Une apostrophe, elle, se met telle quelle : `"Cadre d'astreinte"`.

La clé `id` nomme l’agent. Pour un agent interne, c’est aussi le libellé de l’onglet. Pour l’agent public, l’onglet dit `Agent public` et `id` reste `default`. Même casse, sans espace autour. Sur un agent déjà enregistré, `id` doit rester celui de l’onglet.

L’identifiant fait de 1 à 64 caractères. Il commence par une lettre minuscule ou un chiffre. La suite peut contenir des minuscules, des chiffres, `-` et `_`.

| Identifiant       | Résultat                                                                            |
| ----------------- | ----------------------------------------------------------------------------------- |
| `cadre-astreinte` | Accepté. C’est l’exemple à coller dans `id`.                                        |
| `recouvrement`    | Accepté.                                                                            |
| `agence_nord`     | Accepté.                                                                            |
| `gardiens2`       | Accepté.                                                                            |
| `default`         | Réservé au chatbot public. `Nouvel agent` le refuse : `Identifiant invalide`.       |
| `icons`           | Réservé aux fichiers de l’icône. `Nouvel agent` le refuse : `Identifiant invalide`. |
| `Cadre-Astreinte` | Refusé : une majuscule.                                                             |
| `cadre astreinte` | Refusé : un espace.                                                                 |
| `cadre.astreinte` | Refusé : un point.                                                                  |

L’identifiant ne se renomme pas. Pour en changer, ouvrez `Nouvel agent`, collez le JSON avec le nouvel `id`, recopiez le prompt système, enregistrez, puis supprimez l’ancien. `display`, lui, se change librement.

## Le chatbot public

`default` est le chatbot de l’adresse du serveur. Les locataires l’ouvrent dans un navigateur. Les collaborateurs le trouvent dans `Discuter`, sans case à cocher, dès qu’il est prêt et que `enabled` vaut `true`.

Prêt, pour lui : JSON valide, prompt système non vide, icône SVG. Le bandeau de la porte passe alors à `Paramétré`.

Ouvert : prêt, et `"enabled": true`. Avec `false`, la porte peut déjà dire `Paramétré`, le site affiche `Rien de public ici !`, et `Discuter` ne propose pas cet agent.

Collez ceci dans `Configuration` de l’agent public, puis adaptez les phrases.

```json
{
  "id": "default",
  "display": "PIERRE",
  "enabled": true,
  "community_knowledge": true,
  "trace": "none",
  "attachments": false,
  "greetings": [
    "Bonjour, je peux vous aider sur votre logement.",
    "Bonsoir, une question sur votre dossier ?"
  ],
  "examples": [
    "Comment déposer mon préavis ?",
    "Où payer mon loyer ?",
    "Que faire en cas de trouble de voisinage ?"
  ],
  "disclaimer": "Cette réponse est indicative. Pour une décision, contactez votre agence."
}
```

Ce JSON ouvre un chatbot public nommé PIERRE dans les listes d’administration. `enabled` à `true` le montre sur le site et dans Discuter. `community_knowledge` à `true` lui donne la base HLM partagée en plus de vos documents. `trace` à `none` laisse la réponse seule une fois qu’elle est écrite. `attachments` à `false` retire le trombone. L’écran vide tire au sort l’une des deux phrases. Sur le site, les trois questions s’affichent tant que la conversation est vide, et la mention apparaît sous la saisie dès le premier message. Dans l’application, Discuter montre la phrase d’accueil. Le détail est dans [Ce que la personne voit](#ce-que-la-personne-voit).

Écrivez ensuite le prompt système (section plus bas). Déposez l’icône. `Enregistrer`.

L’icône est un seul SVG, commun au chatbot public. Le fichier doit contenir une balise svg. PIERRE en tire les images du téléphone au moment du dépôt. Le nom affiché sous l’icône installée est le nom de l’organisme, dans [Prestataires](./22-admin-prestataires.md). Un SVG illisible est refusé : `icône illisible.` Déposez un dessin plus simple. Un fichier qui n’est pas un SVG est refusé tout de suite : `L’icône doit être un SVG`.

Pour voir le site : ouvrez dans un navigateur l’adresse déjà saisie dans [Paramètres](./02-parametres.md). La page de conversation s’affiche quand l’agent est ouvert. Sinon l’onglet s’intitule `Rien de public ici !`.

Pour fermer le site sans perdre le paramétrage, passez `enabled` à `false` et enregistrez. Les pièces restent cochées. Repassez à `true` pour rouvrir.

## Les agents internes

Un agent interne répond dans `Discuter` aux personnes dont le compte le coche. Il n’a pas de page publique, pas d’`enabled`, pas d’icône.

1. Ouvrez l’onglet `Nouvel agent` (+).
2. Collez un JSON dont `id` est libre, par exemple `cadre-astreinte`.
3. Écrivez le prompt système.
4. `Enregistrer`. L’onglet `cadre-astreinte` s’ouvre. Le panneau `+` redevient vide.
5. Recommencez pour l’agent suivant.

Astreinte, avec la base HLM partagée, les pièces jointes, et le détail du travail replié :

```json
{
  "id": "cadre-astreinte",
  "display": "Cadre d'astreinte",
  "community_knowledge": true,
  "trace": "collapsed",
  "attachments": true,
  "greetings": ["Que s'est-il passé ?"],
  "examples": [
    "Quelle est la procédure en cas de fuite d'eau la nuit ?",
    "Qui déclencher pour une mise en sécurité ?"
  ],
  "disclaimer": "Vérifiez la procédure avant d'engager une dépense."
}
```

Recouvrement, limité aux documents que vous lui affecterez, avec la liste des outils :

```json
{
  "id": "recouvrement",
  "display": "Recouvrement",
  "community_knowledge": false,
  "trace": "tools",
  "attachments": true,
  "greetings": ["Quel dossier voulez-vous éclairer ?"],
  "examples": ["Quelle est la procédure de plan d'apurement ?"],
  "disclaimer": "Cette réponse ne remplace pas la décision du chargé de recouvrement."
}
```

Le JSON public, collé sur un agent interne déjà enregistré, est refusé. D’abord `id incohérent.` Une fois `id` corrigé, `enabled` provoque `champ public interdit.` Sur `Nouvel agent`, ce même JSON est refusé tout de suite : `Identifiant invalide`. Partez du modèle interne.

Chaque agent a son prompt système, sa liste de documents et sa valeur de `community_knowledge`. Le modèle de langage est celui de [Prestataires](./22-admin-prestataires.md), le même pour tous. Changer de profil dans `Discuter` efface le fil et en ouvre un autre.

`examples` et `disclaimer` sont obligatoires aussi sur un agent interne. Discuter affiche sa phrase d’accueil.

La case à cocher n’existe qu’une fois l’agent prêt (JSON valide et prompt système enregistré). Son libellé est `display`. L’identifiant est le libellé de l’onglet et le titre de la carte. Deux agents au même `display` se ressemblent dans Discuter : donnez-leur des noms distincts.

## Les clés du JSON

Toutes les clés du tableau sont obligatoires, sauf `enabled`, qui n’existe que sur `default`. Une valeur vide, ou faite seulement d’espaces, compte comme absente.

| Clé                   | Valeurs                                  | Effet                                                                                                                                                   |
| --------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                  | L’identifiant de l’agent                 | Nomme l’onglet d’un agent interne. Sur un agent déjà enregistré, elle doit rester celle de cet onglet. Pour `default`, l’onglet affiche `Agent public`. |
| `display`             | Une phrase non vide                      | Nom humain. Menu `Profil` de Discuter, cases `Chatbots`, profils de l’encyclopédie.                                                                     |
| `enabled`             | `true` ou `false`, public seulement      | `true` ouvre le site et propose l’agent à chaque collaborateur connecté. `false` le retire des deux, sans effacer le paramétrage.                       |
| `community_knowledge` | `true` ou `false`                        | `true` ajoute la [base HLM partagée](../04-core-intelligence-hlm/index.md) aux documents de l’organisme. `false` limite l’agent à ces documents.        |
| `trace`               | `none`, `tools`, `collapsed`, `expanded` | Ce que la personne voit du travail de l’assistant. Détail au tableau suivant.                                                                           |
| `attachments`         | `true` ou `false`                        | `true` affiche le trombone et accepte le dépôt de fichiers. `false` les retire. Plafonds : [Discuter](./10-discuter.md).                                |
| `greetings`           | Une liste d’au moins une phrase          | Sur l’écran encore vide, une seule de ces phrases, tirée au sort, sur le site et dans Discuter. Une seule entrée fixe la phrase.                        |
| `examples`            | Une liste d’au moins une phrase          | Sur le site public, toutes les phrases sous la saisie tant que la conversation est vide. Le survol l’affiche en gris dans le champ. Un clic l’envoie.   |
| `disclaimer`          | Une phrase non vide                      | Sur le site public, la mention sous la saisie à partir du premier message. L’écran vide en est dépourvu.                                                |

`greetings`, `examples` et `disclaimer` s’affichent tels quels, sans mise en forme. Pour plusieurs accueils ou plusieurs questions, ajoutez des éléments à la liste. Vous ne pouvez pas enregistrer une liste vide : le minimum est une phrase dans chaque liste, et une mention.

### trace

| Valeur      | Pendant la réponse            | Une fois la réponse écrite                                                          |
| ----------- | ----------------------------- | ----------------------------------------------------------------------------------- |
| `none`      | `Réflexion` peut apparaître.  | Rien du travail ne reste. C’est le réglage du chatbot public.                       |
| `tools`     | Les outils utilisés.          | Le résumé `N outil(s) utilisé(s)`, replié. Le texte de réflexion reste caché.       |
| `collapsed` | Réflexion et outils, repliés. | Le résumé `Réflexion pendant … · N outil(s) utilisé(s)`. Le détail s’ouvre au clic. |
| `expanded`  | Réflexion et outils, ouverts. | Le même détail, laissé ouvert.                                                      |

`none` convient aux locataires. `collapsed` ou `tools` convient aux équipes qui veulent voir d’où vient la réponse. `expanded` laisse ce détail ouvert en permanence : réservez-le à un agent de travail, pas au site public.

### Clés refusées ou ignorées

Le JSON s’arrête aux clés du tableau. Voici ce qui arrive aux autres.

| Clé dans le JSON                     | Message, ou suite                                                                                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `instructions`, `prompt`             | `prompt système hors du JSON.` Le prompt système est le champ du dessous.                                                                  |
| `custom_data`                        | Sur le public : `custom_data retiré.` Sur un interne : `champ public interdit.`                                                            |
| `enabled` sur un agent interne       | `champ public interdit.`                                                                                                                   |
| `reasoning_effort`                   | Ignorée. L’effort du modèle se règle dans [Prestataires](./22-admin-prestataires.md), pour toute l’instance.                               |
| Toute autre clé (`model`, `name`, …) | Elle peut être enregistrée, et le bandeau peut passer à `Paramétré`. L’assistant reste fermé. Retirez la clé, puis enregistrez de nouveau. |

Le modèle, l’adresse et la clé du prestataire se règlent dans [Prestataires](./22-admin-prestataires.md), pour toute l’instance. Une conversation déjà ouverte garde l’ancien modèle jusqu’à sa fin.

## Le prompt système

Le prompt système est le métier de l’assistant : à qui il parle, sur quel ton, quoi faire quand le document ne contient pas la réponse. Les procédures et les exports, eux, se déposent dans l’[encyclopédie](./20-admin-encyclopedie.md).

Le champ accepte le Markdown (titres, listes, emphase). Un prompt système vide est refusé : `AGENTS.md vide.`

Point de départ pour un chatbot public :

```markdown
Tu es l'assistant des locataires de cet organisme.

Tu vouvoies. Tu réponds en français, en peu de phrases. Tu t'appuies sur les documents de la base. Si la base ne contient pas la réponse, tu le dis, et tu n'inventes rien.

<!-- KNOWLEDGE_SCHEMA_HERE -->
```

PIERRE ajoute tout seul la date et l’heure au début de chaque nouvelle conversation, dans le fuseau réglé dans [Prestataires](./22-admin-prestataires.md). Vous n’avez pas à les écrire.

La ligne `<!-- KNOWLEDGE_SCHEMA_HERE -->` est un emplacement. Quand la base de l’agent existe, PIERRE y place la description des données que l’assistant peut interroger. Laissez cette ligne si l’assistant doit chercher dans les documents. Un prompt système sans cette ligne reste valable : la description n’est simplement pas insérée.

Un prompt système long, déjà rédigé pour un chatbot public, est dans [le fichier d’exemple](../04-core-intelligence-hlm/Param%C3%A9trages%20de%20PIERRE/Agents%20conversationnels/Agent%20public.md). Il est en anglais. Reprenez-en la structure, et réécrivez l’identité dans la langue et le ton de l’organisme. Gardez la ligne `<!-- KNOWLEDGE_SCHEMA_HERE -->`.

Une conversation déjà commencée garde le prompt système qu’il a lu à son premier message. Le prompt système que vous venez d’enregistrer est celui des conversations suivantes. Changer de profil dans `Discuter` en ouvre une nouvelle.

## Ce que la personne voit

Deux écrans lisent le même JSON.

| Moment                   | Site public                                                                                                         | Discuter, dans l’application                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Écran vide               | Une phrase de `greetings`, tirée au sort, puis toutes les `examples`.                                               | La même phrase d’accueil.                                                                               |
| Questions                | Le survol les affiche en gris à la place de `Comment puis-je vous aider aujourd'hui ?`. Un clic envoie la question. | Le champ garde `Comment puis-je vous aider aujourd'hui ?`.                                              |
| Après le premier message | La phrase et les questions partent. `disclaimer` reste sous la saisie.                                              | La phrase d’accueil part. La saisie reste.                                                              |
| Menu                     | Le site est l’agent `default`.                                                                                      | `Profil de {nom de l’organisme}`, dès qu’un assistant est ouvert. La valeur affichée est son `display`. |

Les options du menu sont les `display`, triés en français, public compris. L’ordre suit donc les noms choisis. Avec un seul assistant, le menu a une seule option. En choisir un autre arrête la réponse en cours et efface le fil.

Un agent interne vit dans ce menu. Ses `examples` et son `disclaimer` sont enregistrés parce que le JSON les exige. Le site public montre `default`.

`attachments` à `true` affiche le trombone, sur le site et dans Discuter. On peut aussi déposer des fichiers sur la conversation. Plafonds et formats : [Discuter](./10-discuter.md), 5 fichiers, 10 Mo par fichier, 20 Mo en tout. `false` retire le trombone.

`trace` suit le tableau de la section précédente, sur les deux écrans.

Phrase d’accueil, questions, mention, pièces jointes, trace et `display` sont lus à l’ouverture. Rouvrez le site ou Discuter pour les voir.

## Documents et droits

L’assistant répond avec deux sources, selon `community_knowledge`.

| `community_knowledge` | Ce que l’assistant peut lire                                                                                                                                        |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `true`                | La base HLM partagée du mouvement (procédures générales, spécificités locales, pages de référence), plus les documents de votre encyclopédie qui lui sont affectés. |
| `false`               | Seulement ces documents. Sans affectation, il ne dispose que de son prompt système, et il dira souvent qu’il n’a pas l’information.                                 |

La base partagée est décrite dans [Core Intelligence HLM](../04-core-intelligence-hlm/index.md). Vos documents restent ceux de l’organisme. Un agent à `true` voit les deux. Un agent à `false` ne voit pas la base partagée, même si un autre agent de la même instance l’a.

L’assistant n’apparaît dans les profils de l’encyclopédie qu’une fois prêt. Pour le public, l’icône fait partie de « prêt ». Cochez-le sur les documents, puis `Reconstruire`. Tant que vous n’avez pas reconstruit, les équipes continuent de lire la version déjà publiée. Le détail est dans [Administration · Encyclopédie](./20-admin-encyclopedie.md).

L’agent interne n’apparaît dans les cases `Chatbots` qu’une fois prêt. Le public n’y est jamais : il est proposé à chaque personne connectée dès qu’il est ouvert. Cochez l’interne sur un [profil](./21-admin-utilisateurs.md), ou sur un compte en `Personnalisé`. Le libellé de la case est `display`.

| Vous enregistrez                                             | Ce qui suit                                                                                                                    |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| La dernière pièce manquante                                  | PIERRE construit la base de cet agent avant de répondre. Avec `community_knowledge` à `true`, la base partagée en fait partie. |
| Le prompt système seul, base déjà construite                 | Le texte est mis à jour. Toute l’encyclopédie n’est pas reconstruite. Les nouvelles conversations lisent ce prompt système.    |
| `community_knowledge`                                        | La base de l’agent est reconstruite. L’enregistrement attend la fin. `true` y ajoute la base partagée. `false` l’en retire.    |
| `enabled`, `display`, l’accueil, `trace`, les pièces jointes | Pas de reconstruction. Rouvrez `Discuter` ou le site.                                                                          |
| Une affectation dans l’encyclopédie                          | `Reconstruire` sur l’encyclopédie, pour que la version en service change.                                                      |

Si la reconstruction échoue, le toast reprend le message, et la configuration peut déjà être écrite. Dans l’encyclopédie, une reconstruction échouée laisse la version précédente en service. Corrigez, puis recommencez.

## Supprimer un agent interne

`Supprimer` est sur la carte de chaque agent sauf l’agent public. La confirmation dit : `L’agent {identifiant} et son prompt système seront supprimés.`

L’agent disparaît des onglets, de `Discuter`, et des cases à cocher. Les comptes et les profils qui l’avaient coché gardent cet identifiant en mémoire : si vous recréez le même identifiant et que vous l’enregistrez de nouveau, ces personnes le retrouvent, et les documents de l’encyclopédie qui lui étaient affectés aussi, après une reconstruction.

Le chatbot public ne se supprime pas. Pour le retirer de la vue, passez `enabled` à `false`.

## Bonnes pratiques

- **Le public d’abord.** JSON, prompt système, icône, `enabled` à `true`, puis un essai dans le navigateur.
- **Un identifiant par rôle**, stable et parlant : `cadre-astreinte`, `recouvrement`. Le `display` est la phrase que les équipes lisent.
- **`trace` à `none` et `attachments` à `false` sur le public.** Les équipes qui doivent voir les outils ou joindre une lettre ont un agent interne.
- **`community_knowledge` à `true` pour le public**, si les locataires doivent obtenir les réponses générales du logement social avant même que vos procédures soient déposées. **`false` pour un agent étroit**, qui ne doit lire qu’un fonds nommé dans l’encyclopédie.
- **Gardez `<!-- KNOWLEDGE_SCHEMA_HERE -->`** dans un prompt système qui cherche dans les documents.
- **Créez l’agent, puis cochez-le.** La case et le profil d’encyclopédie apparaissent quand il est prêt.
- **`Enregistrer` écrit chaque agent**, y compris le brouillon de `Nouvel agent` s’il contient du texte. Un brouillon vide n’est pas envoyé.
- **Aucun secret dans le JSON ni dans le prompt système.** La clé du modèle est dans Prestataires.

## Si quelque chose ne va pas

Le message du champ est aussi celui du toast. Pour les lignes du tableau qui citent un message de PIERRE, la pièce refusée reste non écrite. L’autre pièce du même `Enregistrer` peut, elle, l’être. Le toast `Enregistré` apparaît quand le JSON et le prompt système sont tous les deux acceptés.

Un échec de reconstruction laisse un toast d’erreur alors que le texte vient d’être écrit. La base déjà en service ne change pas. Voir [Documents et droits](#documents-et-droits).

| Message                                                               | Suite                                                                                                            |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `JSON invalide.`                                                      | Guillemets doubles, virgules entre les lignes, pas de virgule après la dernière, pas de commentaire.             |
| `JSON objet requis.`                                                  | Le fichier est une liste ou un texte. Entourez-le d’accolades.                                                   |
| `id incohérent.`                                                      | Sur un agent déjà enregistré, la clé `id` n’est pas celle de l’onglet. Remettez-la.                              |
| `Identifiant invalide`                                                | Sur `Nouvel agent` : minuscules, chiffres, `-`, `_`. Pas `default`, pas `icons`, pas de majuscule, pas d’espace. |
| `Identifiant déjà utilisé.`                                           | Cet `id` est déjà un onglet. Le fichier existant n’est pas écrasé.                                               |
| `display requis.`                                                     | Écrivez un `display` non vide.                                                                                   |
| `community_knowledge requis.` `attachments requis.` `enabled requis.` | La valeur est `true` ou `false`, sans guillemets. `enabled` seulement sur `default`.                             |
| `trace requis.`                                                       | Une des quatre valeurs : `none`, `tools`, `collapsed`, `expanded`.                                               |
| `greetings requis.` `examples requis.`                                | Une liste d’au moins une phrase.                                                                                 |
| `greetings[0] requis.` `examples[1] requis.`                          | La phrase à cette position est vide. Le numéro commence à zéro : `[0]` est la première.                          |
| `disclaimer requis.`                                                  | Une phrase non vide.                                                                                             |
| `prompt système hors du JSON.`                                        | Retirez `instructions` et `prompt`. Écrivez le prompt système dans son champ.                                    |
| `custom_data retiré.`                                                 | Retirez `custom_data` du JSON public.                                                                            |
| `champ public interdit.`                                              | Sur un agent interne, retirez `enabled` et `custom_data`.                                                        |
| `AGENTS.md vide.`                                                     | Écrivez le prompt système, puis enregistrez de nouveau.                                                          |
| `L’icône doit être un SVG`                                            | Déposez un `.svg`.                                                                                               |
| `icon.svg requis.`                                                    | Le fichier ne contient pas la balise svg.                                                                        |
| `icône illisible.`                                                    | La conversion vers le téléphone a échoué. Déposez un SVG plus simple.                                            |
| `chatbot inconnu.`                                                    | L’identifiant n’est pas un agent interne supprimable.                                                            |
| `Enregistrement refusé` `Suppression refusée` `Téléversement refusé`  | L’instance n’a pas répondu. Vérifiez la connexion, puis recommencez.                                             |
| Bandeau `Paramétré`, et le site dit `Rien de public ici !`            | `enabled` vaut `false`, ou une clé inconnue empêche l’ouverture.                                                 |
| `Impossible de charger le chatbot.` dans Discuter                     | Même cause. Retirez toute clé absente du tableau, vérifiez `enabled` pour le public, rouvrez l’écran.            |
| La case de l’agent manque dans Utilisateurs                           | L’agent n’est pas prêt : JSON et prompt système, les deux enregistrés. Le public n’a jamais de case.             |
| L’agent manque dans les profils de l’encyclopédie                     | Même chose. Pour le public, l’icône compte aussi.                                                                |
| Le locataire ne voit pas vos procédures                               | Affectez les documents à cet assistant, puis `Reconstruire`.                                                     |
| L’équipe ne voit pas l’agent interne                                  | Cochez-le sur le profil, ou sur le compte en `Personnalisé`.                                                     |
