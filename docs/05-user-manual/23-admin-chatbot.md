# Administration · Chatbot

L’écran `Chatbot` règle les assistants de l’organisme : le chatbot public ouvert aux locataires, et les agents internes attribués aux collaborateurs. Chaque assistant a un JSON, une consigne, et le chatbot public a aussi une icône.

Cette page décrit uniquement la porte `Chatbot` de `Administration`. Les consignes de `Réclamations`, `Impayés`, `Synthèses` et `Générer un rapport` sont les portes voisines. Qui peut interroger un agent interne se règle dans [Administration · Utilisateurs](./21-admin-utilisateurs.md). Les documents qu’il a le droit de lire se règlent dans [Administration · Encyclopédie](./20-admin-encyclopedie.md). Le modèle de langage, le même pour tous les assistants, se règle dans [Administration · Prestataires](./22-admin-prestataires.md). La conversation est l’écran [Discuter](./10-discuter.md).

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
- [La consigne](#la-consigne)
- [Ce que la personne voit](#ce-que-la-personne-voit)
- [Documents et droits](#documents-et-droits)
- [Supprimer un agent interne](#supprimer-un-agent-interne)
- [Bonnes pratiques](#bonnes-pratiques)
- [Si quelque chose ne va pas](#si-quelque-chose-ne-va-pas)

<!-- tocstop -->

## À quoi ça sert

Un assistant répond aux questions à partir de sa consigne et des documents qui lui sont ouverts. L’écran sert à en tenir un ou plusieurs.

1. **Ouvrir le chatbot public** sur l’adresse du serveur, pour les locataires et les candidats, et dans `Discuter` pour chaque collaborateur connecté.
2. **Ajouter des agents internes** (astreinte, recouvrement, gardiens) et les attribuer à des profils.
3. **Régler, pour chacun,** le nom affiché, la phrase d’accueil, les questions proposées, la mention, les pièces jointes, et ce que la personne voit du travail de l’assistant.

Le chemin complet, dans l’ordre :

1. Porte `Chatbot`. Laissez `default · public`. Collez le JSON public, écrivez la consigne, déposez l’icône, `Enregistrer`.
2. Saisissez un identifiant, `Ajouter`, collez le JSON interne, écrivez sa consigne, `Enregistrer`. Répétez pour chaque agent.
3. Dans l’[encyclopédie](./20-admin-encyclopedie.md), affectez les documents, puis `Reconstruire`.
4. Dans [Utilisateurs](./21-admin-utilisateurs.md), cochez chaque agent interne sur les profils concernés.
5. Vérifiez le site dans un navigateur, et `Discuter` dans l’application.

Les sections suivantes détaillent chaque étape, chaque clé, et ce qui change vraiment quand vous enregistrez.

Trois noms circulent. Les tenir séparés évite la plupart des allers-retours.

| Nom                | Où vous l’écrivez                                       | Où les gens le voient                                                                             |
| ------------------ | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Identifiant        | Menu `Agent`, et la clé `id`                            | Dans ce menu seulement (`default · public`, `cadre-astreinte · interne`).                         |
| `display`          | Clé `display` du JSON                                   | Options du menu `Profil` dans Discuter, cases `Chatbots` des comptes, profils de l’encyclopédie.  |
| Nom de l’organisme | [Prestataires](./22-admin-prestataires.md), `Organisme` | Porte `Discuter avec {nom}`, nom sous l’icône installée sur un téléphone, expéditeur des e-mails. |

La porte `Discuter avec {nom}` suit le nom de l’organisme. Le menu `Profil` suit `display`.

## Qui peut y accéder

Les **administrateurs**, depuis `Administration` → `Chatbot`.

Le réglage vaut pour tout l’organisme. Un JSON enregistré est celui de tous les postes, pas d’un seul collaborateur.

## Lire l’écran

La porte s’appelle `Chatbot`. Le bandeau dit `Paramétré` quand le chatbot public a ses trois pièces, et `Pas paramétré` tant qu’il en manque une. Il suit ces trois pièces seulement. `enabled` à `false` peut laisser `Paramétré`. Des agents internes peuvent déjà répondre aux équipes pendant que la porte affiche encore `Pas paramétré`.

En haut de l’écran, la liste `Pièces`. Un cercle tant que la pièce manque, une coche quand elle est là. Le libellé change avec l’état.

| Agent   | Pièce    | Cercle                         | Coche                       |
| ------- | -------- | ------------------------------ | --------------------------- |
| Public  | JSON     | `Enregistrer la configuration` | `Configuration enregistrée` |
| Public  | Consigne | `Enregistrer la consigne`      | `Consigne enregistrée`      |
| Public  | Icône    | `Déposer l’icône SVG`          | `Icône SVG déposée`         |
| Interne | JSON     | `Enregistrer la configuration` | `Configuration enregistrée` |
| Interne | Consigne | `Enregistrer la consigne`      | `Consigne enregistrée`      |

Un agent interne n’a pas d’icône.

| Zone                                 | Rôle                                                                                                 |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `Agent`                              | L’assistant dont vous éditez le JSON et la consigne.                                                 |
| Champ à côté, puis `Ajouter`         | Prépare un nouvel identifiant. Rien n’est créé tant que `Enregistrer` n’a pas réussi.                |
| `Supprimer`                          | Retire l’agent interne affiché, et sa consigne. Absent sur `default`.                                |
| `Configuration de {id}`              | Le JSON.                                                                                             |
| `Consigne de {id}`                   | Le texte lu au début de chaque nouvelle conversation.                                                |
| `Icône d’installation sur téléphone` | Le SVG du chatbot public. Le dépôt est immédiat : toast `Téléversé`.                                 |
| `Enregistrer`                        | Écrit le JSON et la consigne de l’agent affiché. Le toast `Enregistré` dit que les deux sont passés. |

`Enregistrer` envoie les deux textes l’un après l’autre. Un JSON refusé n’empêche pas la consigne d’être écrite, et l’inverse. Le message reste sous le champ en cause. Tant que l’un des deux échoue, le toast `Enregistré` n’apparaît pas.

> [!CAUTION]
> Enregistrez avant de changer d’agent dans le menu. Sinon le texte en cours est remplacé par ce qui est déjà enregistré, ou par un champ vide si l’agent n’a encore jamais été enregistré.

La première fois que la dernière pièce manquante arrive, PIERRE construit la base de l’agent avant de répondre. L’attente a lieu sur `Enregistrer`, ou sur le dépôt de l’icône quand c’était la pièce manquante. L’action reste en cours jusqu’au toast. Attendez-le.

Après un `Enregistrer` réussi, PIERRE réindente le JSON. Les valeurs sont les mêmes.

## Préparer le JSON

Le JSON est un objet : une accolade ouvrante, des lignes `clé` / valeur, une accolade fermante.

- Les clés et les phrases sont entre **guillemets doubles** : `"display": "PIERRE"`.
- `true` et `false` s’écrivent **sans** guillemets. `"true"` est un texte, et il est refusé.
- Une liste est entre crochets. Chaque phrase est entre guillemets. Une virgule sépare les éléments. Pas de virgule après le dernier.
- Pas de commentaire, pas de virgule finale, pas de guillemets simples.
- Un guillemet double à l’intérieur d’une phrase s’écrit `\"`. Une apostrophe, elle, se met telle quelle : `"Cadre d'astreinte"`.

La clé `id` est **exactement** l’identifiant choisi dans le menu, même casse, sans espace autour.

L’identifiant fait de 1 à 64 caractères. Il commence par une lettre minuscule ou un chiffre. La suite peut contenir des minuscules, des chiffres, `-` et `_`.

| Identifiant       | Résultat                                                                 |
| ----------------- | ------------------------------------------------------------------------ |
| `cadre-astreinte` | Accepté. C’est l’exemple du champ.                                       |
| `recouvrement`    | Accepté.                                                                 |
| `agence_nord`     | Accepté.                                                                 |
| `gardiens2`       | Accepté.                                                                 |
| `default`         | Réservé au chatbot public. `Ajouter` le refuse : `Identifiant invalide`. |
| `icons`           | Réservé aux fichiers de l’icône. Ne l’utilisez pas.                      |
| `Cadre-Astreinte` | Refusé : une majuscule.                                                  |
| `cadre astreinte` | Refusé : un espace.                                                      |
| `cadre.astreinte` | Refusé : un point.                                                       |

L’identifiant ne se renomme pas. Pour en changer, ajoutez un autre agent, recopiez le JSON en mettant le nouvel `id`, recopiez la consigne, enregistrez, puis supprimez l’ancien. `display`, lui, se change librement.

## Le chatbot public

`default` est le chatbot de l’adresse du serveur. Les locataires l’ouvrent dans un navigateur. Les collaborateurs le trouvent dans `Discuter`, sans case à cocher, dès qu’il est prêt et que `enabled` vaut `true`.

Prêt, pour lui : JSON valide, consigne non vide, icône SVG. Le bandeau de la porte passe alors à `Paramétré`.

Ouvert : prêt, et `"enabled": true`. Avec `false`, la porte peut déjà dire `Paramétré`, le site affiche `Rien de public ici !`, et `Discuter` ne propose pas cet agent.

Collez ceci dans `Configuration de default`, puis adaptez les phrases.

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

Écrivez ensuite la consigne (section plus bas). Déposez l’icône. `Enregistrer`.

L’icône est un seul SVG, commun au chatbot public. Le fichier doit contenir une balise svg. PIERRE en tire les images du téléphone au moment du dépôt. Le nom affiché sous l’icône installée est le nom de l’organisme, dans [Prestataires](./22-admin-prestataires.md). Un SVG illisible est refusé : `icône illisible.` Déposez un dessin plus simple. Un fichier qui n’est pas un SVG est refusé tout de suite : `L’icône doit être un SVG`.

Pour voir le site : ouvrez dans un navigateur l’adresse déjà saisie dans [Paramètres](./02-parametres.md). La page de conversation s’affiche quand l’agent est ouvert. Sinon l’onglet s’intitule `Rien de public ici !`.

Pour fermer le site sans perdre le paramétrage, passez `enabled` à `false` et enregistrez. Les pièces restent cochées. Repassez à `true` pour rouvrir.

## Les agents internes

Un agent interne répond dans `Discuter` aux personnes dont le compte le coche. Il n’a pas de page publique, pas d’`enabled`, pas d’icône.

1. Dans le champ à droite du menu, écrivez l’identifiant, par exemple `cadre-astreinte`.
2. `Ajouter`. Le menu affiche `cadre-astreinte · interne`. Les deux champs sont vides.
3. Collez un JSON dont `id` est exactement cet identifiant.
4. Écrivez la consigne.
5. `Enregistrer`, et attendez le toast si c’est la première fois.
6. Recommencez pour l’agent suivant.

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

Le JSON public, collé sur un agent interne, est refusé. D’abord `id incohérent.` Une fois `id` corrigé, `enabled` provoque `champ public interdit.` Partez du modèle interne.

Chaque agent a sa consigne, sa liste de documents et sa valeur de `community_knowledge`. Le modèle de langage est celui de [Prestataires](./22-admin-prestataires.md), le même pour tous. Changer de profil dans `Discuter` efface le fil et en ouvre un autre.

`examples` et `disclaimer` sont obligatoires aussi sur un agent interne. Discuter affiche sa phrase d’accueil.

La case à cocher n’existe qu’une fois l’agent prêt (JSON valide et consigne enregistrée). Son libellé est `display`. L’identifiant, lui, reste dans le menu `Agent`. Deux agents au même `display` se ressemblent dans la liste : donnez-leur des noms distincts.

## Les clés du JSON

Toutes les clés du tableau sont obligatoires, sauf `enabled`, qui n’existe que sur `default`. Une valeur vide, ou faite seulement d’espaces, compte comme absente.

| Clé                   | Valeurs                                  | Effet                                                                                                                                                 |
| --------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                  | L’identifiant de l’agent, à l’identique  | Rattache ce JSON à l’agent affiché dans le menu.                                                                                                      |
| `display`             | Une phrase non vide                      | Nom humain. Menu `Profil` de Discuter, cases `Chatbots`, profils de l’encyclopédie.                                                                   |
| `enabled`             | `true` ou `false`, public seulement      | `true` ouvre le site et propose l’agent à chaque collaborateur connecté. `false` le retire des deux, sans effacer le paramétrage.                     |
| `community_knowledge` | `true` ou `false`                        | `true` ajoute la [base HLM partagée](../04-core-intelligence-hlm/index.md) aux documents de l’organisme. `false` limite l’agent à ces documents.      |
| `trace`               | `none`, `tools`, `collapsed`, `expanded` | Ce que la personne voit du travail de l’assistant. Détail au tableau suivant.                                                                         |
| `attachments`         | `true` ou `false`                        | `true` affiche le trombone et accepte le dépôt de fichiers. `false` les retire. Plafonds : [Discuter](./10-discuter.md).                              |
| `greetings`           | Une liste d’au moins une phrase          | Sur l’écran encore vide, une seule de ces phrases, tirée au sort, sur le site et dans Discuter. Une seule entrée fixe la phrase.                      |
| `examples`            | Une liste d’au moins une phrase          | Sur le site public, toutes les phrases sous la saisie tant que la conversation est vide. Le survol l’affiche en gris dans le champ. Un clic l’envoie. |
| `disclaimer`          | Une phrase non vide                      | Sur le site public, la mention sous la saisie à partir du premier message. L’écran vide en est dépourvu.                                              |

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
| `instructions`, `prompt`             | `consigne hors du JSON.` La consigne est le champ du dessous.                                                                              |
| `custom_data`                        | Sur le public : `custom_data retiré.` Sur un interne : `champ public interdit.`                                                            |
| `enabled` sur un agent interne       | `champ public interdit.`                                                                                                                   |
| `reasoning_effort`                   | Ignorée. L’effort du modèle se règle dans [Prestataires](./22-admin-prestataires.md), pour toute l’instance.                               |
| Toute autre clé (`model`, `name`, …) | Elle peut être enregistrée, et le bandeau peut passer à `Paramétré`. L’assistant reste fermé. Retirez la clé, puis enregistrez de nouveau. |

Le modèle, l’adresse et la clé du prestataire se règlent dans [Prestataires](./22-admin-prestataires.md), pour toute l’instance. Une conversation déjà ouverte garde l’ancien modèle jusqu’à sa fin.

## La consigne

La consigne est le métier de l’assistant : à qui il parle, sur quel ton, quoi faire quand le document ne contient pas la réponse. Les procédures et les exports, eux, se déposent dans l’[encyclopédie](./20-admin-encyclopedie.md).

Le champ accepte le Markdown (titres, listes, emphase). Une consigne vide est refusée : `AGENTS.md vide.`

Point de départ pour un chatbot public :

```markdown
Tu es l'assistant des locataires de cet organisme.

Tu vouvoies. Tu réponds en français, en peu de phrases. Tu t'appuies sur les documents de la base. Si la base ne contient pas la réponse, tu le dis, et tu n'inventes rien.

<!-- KNOWLEDGE_SCHEMA_HERE -->
```

PIERRE ajoute tout seul la date et l’heure au début de chaque nouvelle conversation, dans le fuseau réglé dans [Prestataires](./22-admin-prestataires.md). Vous n’avez pas à les écrire.

La ligne `<!-- KNOWLEDGE_SCHEMA_HERE -->` est un emplacement. Quand la base de l’agent existe, PIERRE y place la description des données que l’assistant peut interroger. Laissez cette ligne si l’assistant doit chercher dans les documents. Une consigne sans cette ligne reste valable : la description n’est simplement pas insérée.

Une consigne longue, déjà rédigée pour un chatbot public, est dans [le fichier d’exemple](../04-core-intelligence-hlm/settings/default.md). Elle est en anglais. Reprenez-en la structure, et réécrivez l’identité dans la langue et le ton de l’organisme. Gardez la ligne `<!-- KNOWLEDGE_SCHEMA_HERE -->`.

Une conversation déjà commencée garde la consigne qu’elle a lue à son premier message. La consigne que vous venez d’enregistrer est celle des conversations suivantes. Changer de profil dans `Discuter` en ouvre une nouvelle.

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
| `false`               | Seulement ces documents. Sans affectation, il ne dispose que de sa consigne, et il dira souvent qu’il n’a pas l’information.                                        |

La base partagée est décrite dans [Core Intelligence HLM](../04-core-intelligence-hlm/index.md). Vos documents restent ceux de l’organisme. Un agent à `true` voit les deux. Un agent à `false` ne voit pas la base partagée, même si un autre agent de la même instance l’a.

L’assistant n’apparaît dans les profils de l’encyclopédie qu’une fois prêt. Pour le public, l’icône fait partie de « prêt ». Cochez-le sur les documents, puis `Reconstruire`. Tant que vous n’avez pas reconstruit, les équipes continuent de lire la version déjà publiée. Le détail est dans [Administration · Encyclopédie](./20-admin-encyclopedie.md).

L’agent interne n’apparaît dans les cases `Chatbots` qu’une fois prêt. Le public n’y est jamais : il est proposé à chaque personne connectée dès qu’il est ouvert. Cochez l’interne sur un [profil](./21-admin-utilisateurs.md), ou sur un compte en `Personnalisé`. Le libellé de la case est `display`.

| Vous enregistrez                                             | Ce qui suit                                                                                                                    |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| La dernière pièce manquante                                  | PIERRE construit la base de cet agent avant de répondre. Avec `community_knowledge` à `true`, la base partagée en fait partie. |
| La consigne seule, base déjà construite                      | Le texte est mis à jour. Toute l’encyclopédie n’est pas reconstruite. Les nouvelles conversations lisent cette consigne.       |
| `community_knowledge`                                        | La base de l’agent est reconstruite. L’enregistrement attend la fin. `true` y ajoute la base partagée. `false` l’en retire.    |
| `enabled`, `display`, l’accueil, `trace`, les pièces jointes | Pas de reconstruction. Rouvrez `Discuter` ou le site.                                                                          |
| Une affectation dans l’encyclopédie                          | `Reconstruire` sur l’encyclopédie, pour que la version en service change.                                                      |

Si la reconstruction échoue, le toast reprend le message, et la configuration peut déjà être écrite. Dans l’encyclopédie, une reconstruction échouée laisse la version précédente en service. Corrigez, puis recommencez.

## Supprimer un agent interne

`Supprimer` est sur tous les agents sauf `default`. La confirmation dit : `L’agent {identifiant} et sa consigne seront supprimés.`

L’agent disparaît du menu, de `Discuter`, et des cases à cocher. Les comptes et les profils qui l’avaient coché gardent cet identifiant en mémoire : si vous recréez le même identifiant et que vous l’enregistrez de nouveau, ces personnes le retrouvent, et les documents de l’encyclopédie qui lui étaient affectés aussi, après une reconstruction.

Le chatbot public ne se supprime pas. Pour le retirer de la vue, passez `enabled` à `false`.

## Bonnes pratiques

- **Le public d’abord.** JSON, consigne, icône, `enabled` à `true`, puis un essai dans le navigateur.
- **Un identifiant par rôle**, stable et parlant : `cadre-astreinte`, `recouvrement`. Le `display` est la phrase que les équipes lisent.
- **`trace` à `none` et `attachments` à `false` sur le public.** Les équipes qui doivent voir les outils ou joindre une lettre ont un agent interne.
- **`community_knowledge` à `true` pour le public**, si les locataires doivent obtenir les réponses générales du logement social avant même que vos procédures soient déposées. **`false` pour un agent étroit**, qui ne doit lire qu’un fonds nommé dans l’encyclopédie.
- **Gardez `<!-- KNOWLEDGE_SCHEMA_HERE -->`** dans une consigne qui cherche dans les documents.
- **Créez l’agent, puis cochez-le.** La case et le profil d’encyclopédie apparaissent quand il est prêt.
- **Enregistrez avant de changer d’agent** dans le menu.
- **Aucun secret dans le JSON ni dans la consigne.** La clé du modèle est dans Prestataires.

## Si quelque chose ne va pas

Le message du champ est aussi celui du toast. Pour les lignes du tableau qui citent un message de PIERRE, la pièce refusée reste non écrite. L’autre pièce du même `Enregistrer` peut, elle, l’être. Le toast `Enregistré` apparaît quand le JSON et la consigne sont tous les deux acceptés.

Un échec de reconstruction laisse un toast d’erreur alors que le texte vient d’être écrit. La base déjà en service ne change pas. Voir [Documents et droits](#documents-et-droits).

| Message                                                               | Suite                                                                                                 |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `JSON invalide.`                                                      | Guillemets doubles, virgules entre les lignes, pas de virgule après la dernière, pas de commentaire.  |
| `JSON objet requis.`                                                  | Le fichier est une liste ou un texte. Entourez-le d’accolades.                                        |
| `id incohérent.`                                                      | La clé `id` et l’agent du menu sont deux textes différents.                                           |
| `display requis.`                                                     | Écrivez un `display` non vide.                                                                        |
| `community_knowledge requis.` `attachments requis.` `enabled requis.` | La valeur est `true` ou `false`, sans guillemets. `enabled` seulement sur `default`.                  |
| `trace requis.`                                                       | Une des quatre valeurs : `none`, `tools`, `collapsed`, `expanded`.                                    |
| `greetings requis.` `examples requis.`                                | Une liste d’au moins une phrase.                                                                      |
| `greetings[0] requis.` `examples[1] requis.`                          | La phrase à cette position est vide. Le numéro commence à zéro : `[0]` est la première.               |
| `disclaimer requis.`                                                  | Une phrase non vide.                                                                                  |
| `consigne hors du JSON.`                                              | Retirez `instructions` et `prompt`. Écrivez la consigne dans son champ.                               |
| `custom_data retiré.`                                                 | Retirez `custom_data` du JSON public.                                                                 |
| `champ public interdit.`                                              | Sur un agent interne, retirez `enabled` et `custom_data`.                                             |
| `AGENTS.md vide.`                                                     | Écrivez la consigne, puis enregistrez de nouveau.                                                     |
| `Identifiant invalide`                                                | Minuscules, chiffres, `-`, `_`. Pas `default`, pas de majuscule, pas d’espace.                        |
| `L’icône doit être un SVG`                                            | Déposez un `.svg`.                                                                                    |
| `icon.svg requis.`                                                    | Le fichier ne contient pas la balise svg.                                                             |
| `icône illisible.`                                                    | La conversion vers le téléphone a échoué. Déposez un SVG plus simple.                                 |
| `chatbot inconnu.`                                                    | L’identifiant n’est pas un agent interne supprimable.                                                 |
| `Enregistrement refusé` `Suppression refusée` `Téléversement refusé`  | L’instance n’a pas répondu. Vérifiez la connexion, puis recommencez.                                  |
| Bandeau `Paramétré`, et le site dit `Rien de public ici !`            | `enabled` vaut `false`, ou une clé inconnue empêche l’ouverture.                                      |
| `Impossible de charger le chatbot.` dans Discuter                     | Même cause. Retirez toute clé absente du tableau, vérifiez `enabled` pour le public, rouvrez l’écran. |
| La case de l’agent manque dans Utilisateurs                           | L’agent n’est pas prêt : JSON et consigne, les deux enregistrés. Le public n’a jamais de case.        |
| L’agent manque dans les profils de l’encyclopédie                     | Même chose. Pour le public, l’icône compte aussi.                                                     |
| Le locataire ne voit pas vos procédures                               | Affectez les documents à cet assistant, puis `Reconstruire`.                                          |
| L’équipe ne voit pas l’agent interne                                  | Cochez-le sur le profil, ou sur le compte en `Personnalisé`.                                          |
