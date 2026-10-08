##### [PIERRE](../index.md) ∕ CORE DATA HLM

# CORE DATA HLM

L’IA agentique HLM ne commence pas avec plus de données, **elle commence avec de meilleures données.** Un agent IA ne peut comprendre, raisonner et agir sur les problématiques quotidiennes des bailleurs sociaux que si les données qui lui sont exposées sont **claires, structurées et prévisibles**.

Les **Core Data HLM** ne sont pas une copie du SI, c’est un **socle de données minimal, auto-explicatif et extensible**, conçu pour couvrir l’essentiel des besoins-métiers et des cas d’usage agentiques du mouvement HLM.

**Cinq fichiers. Quelques colonnes obligatoires. Un vocabulaire commun.**

Les Core Data HLM peuvent être injectées directement dans tout environnement agentique : **Hermes, Pi, Claude Cowork, Codex**, etc. **PIERRE** ajoute une interface spécifique, conçue pour exploiter ce socle de données et agir concrétement sur les processus HLM à l’ère agentique (_présentation à venir_).

Le référentiel est né des travaux menés à l'été 2026 avec [Grand Dijon Habitat](http://granddijonhabitat.fr).

Vous souhaitez contribuer à ce référentiel, proposer des améliorations, mettre à disposition d'autres bailleurs la requête IKOS, ULIS, ACG (ou autres) permettant l'export de ces données ? Envoyer un email à [charnould@pierre-ia.org](mailto:charnould@pierre-ia.org).

## Cinq fichiers

| Fichier                                                                         | Rôle                                                            | Spécification  |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------- | -------------- |
| [`core.lots_locatifs.csv`](docs/02-core-data-hlm/03-lots-locatifs.md)           | Patrimoine locatif **et** occupation courante (vacance incluse) | `v1.0.0`       |
| [`core.comptes_locataires.csv`](docs/02-core-data-hlm/07-comptes-locataires.md) | Grand livre locataire pour reconstituer les soldes              | `v1.0.0`       |
| [`core.reclamations.csv`](docs/02-core-data-hlm/04-reclamations.md)             | Relation-client : tickets, demandes, conversations              | `v1.0.0-alpha` |
| [`core.travaux.csv`](docs/02-core-data-hlm/05-travaux.md)                       | Bons de commande, entretien courant, travaux de relocation      | `v1.0.0-alpha` |
| [`core.candidats.csv`](docs/02-core-data-hlm/06-candidats.md)                   | Candidats à l’attribution et dossiers CALEOL                    | `v1.0.0-alpha` |

**Il n'y a volontairement pas de fichier « locataire »** : au lieu d'une table centralisée, chaque fichier porte des clés (`id_locataire`, `id_client`) qui permettent de relier les données entre elles via le [socle normatif partagé](docs/02-core-data-hlm/02-socle.md). L'état courant du locataire se reconstitue depuis `lots_locatifs` ; les historiques d'interactions, de mouvements financiers et d'interventions-travaux restent dans leurs fichiers respectifs, reliés par ces clés transversales.

#### Pourquoi cinq fichiers ?

Ces fichiers incarnent un compromis : le **moins** de fichiers pour couvrir le **plus** de cas d'usage-métiers à l'ère agentique.

- **Simplicité** — patrimoine, occupation, mouvements financiers, relation-client, travaux et candidats couvrent l’essentiel avec un nombre minimal d’exports.
- **Jointures prévisibles** — le socle normatif partagé sur les cinq tables permet à tout agent IA d’écrire du SQL stable en toute autonomie et de procéder à des agrégations sans jointure excessive.

Le croisement des cinq fichiers ouvre un très large champ de cas d’usage. Les possibilités d’enrichissement ou [d'extension](#extension) — colonnes libres ou tables additionnelles — sont détaillées plus bas.

## Chaque fichier contient la vérité complète à l’instant T

Chaque export est **systématiquement et impérativement complet** : il contient **100 % du périmètre** documenté pour ce fichier à la date d’extraction — **pas** uniquement les nouveaux événements depuis le dernier export.

**Pour la DSI** :

- Chaque export est complet et autosuffisant : exports entiers, jamais de deltas.

**Pour un agent IA** :

- **Un fichier = la vérité à l’instant T**, ancrée dans le temps par une **date d'extraction**.
- L’agent peut l’exploiter **tel quel**, sans fusionner avec d’anciens exports ni gérer des doublons inter-exports.
- Chaque nouvel export **remplace** le précédent : pas de fusion d'historiques côté agent.

## Pourquoi des fichiers plats ?

Les SI HLM savent déjà produire des exports tabulaires. Les `API`, `MCP` et `CLI` sont des interfaces parfaitement valables (et souhaitables), mais les éditeurs historiques ne les généraliseront pas — ni à court ni à moyen terme — à l’échelle du mouvement qui accuse déjà des retards d'innovation.

D’où le choix du **plus petit dénominateur commun** : un fichier plat que chaque bailleur peut livrer ; le référentiel garantit un vocabulaire commun, quelle que soit la singularité de chaque système d’information. Les règles concrètes (CSV, structure tabulaire, noms de fichiers…) sont décrites dans les [conventions](docs/02-data-primitives/01-conventions/index.md).

## Pourquoi du français explicite ?

Ces exports alimentent d’abord un agent IA, mais doivent rester **impérativement lisibles par l’être humain**. Si une équipe-métier ne comprend pas ces données, une IA ne les exploitera pas mieux, aussi sophistiquée soit-elle. L’agent doit ainsi pouvoir **découvrir en autonomie** les concepts, les tables et les jointures. Le fichier-source est souvent sa seule documentation.

Trois principes guident le nommage :

1. **Découverte autonome du schéma** — l'agent déduit le contenu, les jointures possibles à partir des noms des fichiers, des colonnes et des volumes (`1:1`, `1:N`) qu'il observe.
2. **Langue métier** — le français correspond aux données en base, au vocabulaire quotidien des équipes HLM (locataire, quittancement, vacance…) et à la langue avec laquelle ils interagissent avec un agent.
3. **Verbosité intentionnelle** — systématiquement préférer un intitulé long et explicite à une abréviation cryptique à la fois pour les équipes et les agents. Une colonne nommée `sm2` est incompréhensible, une colonne nommée `surface_en_m2` est auto-compréhensible.

## Extension

Au-delà de ces cinq fichiers : ce socle est ouvert à l'extension.

L'extension n'est **pas** propre à PIERRE : tout agent (Hermes, Pi, Claude Cowork, Codex…) qui ingère des fichiers tabulaires partageant le socle normatif partagé en bénéficie à égalité.

- **Intra-fichier** — chaque bailleur peut enrichir l’un des cinq exports de toutes données pertinentes au quotidien, à condition que les noms de colonnes soient auto-explicites et qu’ils ne doublonnent pas une notion déjà couverte par le socle normatif partagé et les colonnes obligatoires. Chaque colonne libre élargit le champ des requêtes pour **n’importe quel agent**.
- **Inter-fichiers** — un bailleur peut exposer d’autres **données tabulaires** (= d'autres fichiers). Pour peu qu’elles reprennent le socle normatif partagé, tout agent IA saura automatiquement les relier aux cinq fichiers de base. À titre d'exemple, Grand Dijon Habitat expose également à PIERRE son **enquête de satisfaction-locataire** ou encore son **suivi partagé avec Logissain de lutte anti-nuisibles** — ce qui ouvre de nouveaux cas d’usage.

## Licence

« Core Data HLM » est proposée sous licence [`CC BY-NC-SA 4.0`](https://creativecommons.org/licenses/by-sa/4.0/deed.fr).

Copyright (c) 2026-aujourd'hui, Charles-Henri Arnould/BECKREL et les contributeurs.

<div style="display: flex; justify-content: space-between; margin-top:50px"><p>&nbsp;</p><p><a href="01-conventions.md">Conventions</a>→</p></div>
