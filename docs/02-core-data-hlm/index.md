##### [PIERRE](../index.md) ∕ CORE DATA HLM

# CORE DATA HLM

`> v1.0.0-alpha (2026-10-01)`

L’IA agentique ne commence pas avec plus de données. **Elle commence avec de meilleures données.** Un agent IA ne peut comprendre, raisonner et agir sur les problématiques quotidiennes des bailleurs sociaux que si les données qui lui sont exposées sont **claires, structurées et prévisibles**.

Les **Core Data HLM** ne sont pas un nouvel export du SI, ni une copie de l’existant. C’est un **socle de données minimal, auto-explicatif et extensible**, conçu pour couvrir l’essentiel des besoins métiers et des cas d’usage agentiques du mouvement HLM.

**Cinq fichiers. Quelques colonnes obligatoires. Un vocabulaire commun.**

Les Core Data HLM définissent **ce que le bailleur met à disposition** de l’agent, avec suffisamment de contexte pour lui permettre de formuler lui-même des requêtes SQL — ou équivalentes — fiables, sans imposer au SI un nouvel export à chaque cas d’usage.

Les données ainsi structurées peuvent être injectées directement dans **Claude Cowork, Codex, OpenAI Work** ou tout autre environnement agentique. **PIERRE** ajoute, notamment, une interface conçue pour exploiter ce socle sur les cas d’usage propres au mouvement HLM à l’ère agentique (_présentation à venir_).

Le référentiel est né des travaux menés entre [Grand Dijon Habitat](http://granddijonhabitat.fr/) et [PIERRE](http://127.0.0.1:4173/index.html) à l’été 2026.

## Cinq fichiers

| Fichier                       | Rôle                                                            |
| ----------------------------- | --------------------------------------------------------------- |
| `core.lots_locatifs.csv`      | Patrimoine locatif **et** occupation courante (vacance incluse) |
| `core.reclamations.csv`       | Relation-client : tickets, demandes, conversations              |
| `core.comptes_locataires.csv` | Grand livre locataire minimal pour reconstituer les soldes      |
| `core.travaux.csv`            | Bons de commande, entretien courant, travaux de relocation...   |
| `core.candidats.csv`          | Candidats à l’attribution et dossiers CALEOL                    |

**Il n'y a volontairement pas de fichier « locataire »** : au lieu d'une table centralisée, chaque fichier porte des clés (`id_locataire`, `id_client`) qui permettent de lier les données entre eux via le **socle normatif partagé**. L'état courant du locataire se reconstitue depuis `lots_locatifs` ; les historiques d'interactions, de mouvements financiers et d'interventions-travaux restent dans leurs fichiers respectifs, reliés par ces clés transversales.

#### Pourquoi cinq fichiers ?

Ces fichiers incarnent un compromis : le **moins** de fichiers pour couvrir le **plus** de cas d'usage-métiers à l'ère agentique.

- **Simplicité** — patrimoine, occupation, mouvements financiers, relation-client, travaux et candidats couvrent l’essentiel avec un nombre minimal d’exports.
- **Jointures prévisibles** — le socle normatif partagé sur les cinq tables permet à tout agent IA d’écrire du SQL stable en toute autonomie et de procéder à des agrégations sans jointure excessive.

Le croisement des cinq fichiers ouvre un très large champ de cas d’usage. Les possibilités d’enrichissement — colonnes libres ou tables additionnelles — sont détaillées dans la section « [Extensibilités](#extensibilités) ».

## Chaque fichier contient la vérité complète à l’instant T

Chaque export est **systématiquement et impérativement complet** : il contient **100 % du périmètre** documenté pour ce fichier à la date d’extraction — **pas** uniquement les nouveaux événements depuis le dernier export.

**Pour la DSI** :

- Chaque export est complet et autosuffisant : exports entiers, jamais de deltas.
- `reclamations`, `comptes_locataires`, `travaux` : **l’historique intégral** à l'instant T du périmètre dans chaque fichier.
- `lots_locatifs`, `candidats` : **l’état complet** du périmètre à l’instant T.

**Pour un agent IA** :

- **Un fichier = la vérité à l’instant T**, ancrée dans le temps par une **date d'extraction**.
- L’agent peut l’exploiter **tel quel**, sans fusionner avec d’anciens exports ni gérer des doublons inter-exports.
- Chaque nouvel export **remplace** le précédent : pas de fusion d'historiques côté agent.

## Pourquoi des fichiers plats ?

Les SI HLM savent déjà produire des exports tabulaires. Les `API`, `MCP` et `cli` sont des interfaces parfaitement valables (et souhaitables), mais les éditeurs historiques ne les généraliseront pas — ni à court ni à moyen terme — à l’échelle du mouvement qui accuse déjà des retards d'innovation.

D’où le choix du **plus petit dénominateur commun** : un fichier plat que chaque bailleur peut livrer ; le référentiel garantit un vocabulaire commun, quelle que soit la singularité de chaque système d’information. Les règles concrètes (CSV, structure tabulaire, noms de fichiers…) sont décrites dans [Conventions](docs/02-data-primitives/01-conventions/index.md).

## Pourquoi du français explicite ?

Ces exports alimentent d’abord un agent IA, mais doivent rester **impérativement lisibles par l’être humain**. Si une équipe métier ne comprend pas ces données, une IA ne les exploitera pas mieux, aussi sophistiquée soit-elle. L’agent doit ainsi pouvoir **découvrir en autonomie** les concepts, les tables et les jointures. Le fichier-source est souvent sa seule documentation.

Trois principes guident le nommage :

1. **Découverte autonome du schéma** — l'agent déduit le contenu, les jointures possibles à partir des noms des fichiers, des colonnes et des volumes (`1:1`, `1:N`) qu'il observe.
2. **Langue métier** — le français correspond aux données en base, au vocabulaire quotidien des équipes HLM (locataire, quittancement, vacance…) et à la langue avec laquelle ils interagissent avec un agent.
3. **Verbosité intentionnelle** — systématiquement préférer un intitulé long et explicite à une abréviation cryptique à la fois pour les équipes et les agents. Une colonne nommée `sm2` est incompréhensible, une colonne nommée `surface_en_m2` est auto-compréhensible.

## Extensibilités

Au-delà des cinq fichiers : ce socle est ouvert à l'extension.

L'extensibilité n'est **pas** propre à PIERRE — tout agent (Claude Cowork, Codex, OpenAI Work…) qui ingère des fichiers tabulaires partageant le socle normatif partagé en bénéficie à égalité.

- **Intra-fichier** — chaque bailleur peut enrichir l’un des cinq exports de toutes données pertinentes au quotidien, à condition que les noms de colonnes soient auto-explicites et qu’ils ne doublonnent pas une notion déjà couverte par le socle normatif partagé et les colonnes obligatoires. Chaque colonne libre élargit le champ des requêtes pour **n’importe quel agent**.
- **Inter-fichiers** — un bailleur peut exposer d’autres **données tabulaires** (= d'autres fichiers). Pour peu qu’elles reprennent le socle normatif partagé, tout agent IA saura automatiquement les relier aux cinq fichiers de base.

À titre d'exemple, Grand Dijon Habitat expose également à PIERRE son **enquête de satisfaction-locataire** ou encore son **suivi partagé avec Logissain de lutte anti-nuisibles**, enrichies du socle normatif partagé — ce qui ouvre de nouveaux cas d’usage.

<div style="display: flex; justify-content: space-between; margin-top:50px"><p>&nbsp;</p><p><a href="01-conventions.md">Conventions</a>→</p></div>
