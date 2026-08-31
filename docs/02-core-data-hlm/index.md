# Introduction

> Spécification v.1.0.0-alpha.1

L'IA agentique ne commence pas avec plus de données, **mais avec de meilleures données**. Un Agent IA (« Harness + LLM ») a besoin d'un socle de données clair pour comprendre, raisonner et agir sur les **problématiques quotidiennes des bailleurs sociaux**.

Ces **« Core Data HLM »** ne sont pas un clone des SI : c'est un **modèle de données minimal et auto-explicatif**, conçu pour couvrir la quasi-totalité des besoins métiers courants et des cas d’usage agentique (IA) du mouvement HLM, sans multiplier les exports.

Ce référentiel est né des travaux entre Grand Dijon Habitat et [PIERRE](https://www.pierre-ia.org) à l'été 2026.

## Core Data HLM _vs._ PIERRE

**Ce document** définit les **data-primitives HLM** : cinq fichiers plats, quelques colonnes obligatoires et un socle normatif partagé — un compromis pour qu'un agent IA formule, de façon autonome, des requêtes SQL (ou équivalentes) correctes, sans imposer une quarantaine d'exports SI.

Le référentiel décrit **ce que le bailleur exporte** et rend disponible ; **PIERRE** est une « plateforme agentique open source HLM » qui ingère, enrichit et consomme concrètement ce référentiel.

La distinction compte : les exports restent injectables dans Claude Cowork, Codex, OpenAI Work…, tandis que PIERRE ajoute — notamment — une interface pour répondre aux cas d'usage spécifiques au mouvement HLM à l'ère agentique.

> [!NOTE]
> Dans l’ensemble de ce référentiel, les incises (comme celle-ci) mettent en exergue les usages **propres à PIERRE** — ingestion, historisation, interface, utilisation — qui ne font pas partie de ce référentiel, mais expriment ces possibilités.

## Cinq fichiers-sources

| Fichier              | Rôle                                                            |
| -------------------- | --------------------------------------------------------------- |
| `lots_locatifs`      | Patrimoine locatif **et** occupation courante (vacance incluse) |
| `reclamations`       | Relation-client : tickets, demandes, conversations              |
| `comptes_locataires` | Grand livre locataire minimal pour reconstituer les soldes      |
| `travaux`            | Bons de commande, entretien courant, travaux de relocation...   |
| `candidats`          | Candidats à l’attribution et dossiers CALEOL                    |

**Il n'y a volontairement pas de fichier « locataire »** : au lieu d'une table centralisée, chaque fichier porte des clés (`id_locataire`, `id_client`) qui permettent de lier les données entre eux via le **socle normatif partagé**. L'état courant du locataire se reconstitue depuis `lots_locatifs` ; les historiques d'interactions, de mouvements financiers et d'interventions-travaux restent dans leurs fichiers respectifs, reliés par ces clés transversales.

Le croisement des cinq fichiers ouvre un très large champ de cas d’usage.

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

> [!NOTE]
> À l’import, PIERRE **reconstruit** sa base à partir de chaque export complet — aligné sur le référentiel ci-dessus. De plus, PIERRE **historise** certaines colonnes entre exports successifs pour pouvoir — par exemple — suivre l’évolution de l’affectation des réclamations aux collaborateurs. L’historisation par PIERRE **ne modifie pas** ce que le bailleur doit exporter : toujours une photographie **complète** à chaque fois.

## Pourquoi cinq fichiers ?

Ces fichiers incarnent un compromis : le **moins** de fichiers pour couvrir le **plus** de cas d'usage-métiers à l'ère agentique.

- **Simplicité** — patrimoine, occupation, mouvements financiers, relation-client, travaux et candidats couvrent l’essentiel avec un nombre minimal d’exports.
- **Jointures prévisibles** — le socle normatif partagé sur les cinq tables permet à tout agent IA d’écrire du SQL stable en toute autonomie et de procéder à des agrégations sans jointure excessive.

Les possibilités d’enrichissement — colonnes libres ou tables additionnelles — sont détaillées dans la section « [Extensibilités](#extensibilités) ».

## Pourquoi des fichiers plats ?

Les SI HLM savent déjà produire des exports tabulaires. Les `API`, `MCP` et `CLI` sont des interfaces parfaitement valables (et souhaitables), mais les éditeurs historiques ne les généraliseront pas — ni à court ni à moyen terme — à l’échelle du mouvement qui accuse déjà des retards d'innovation.

D’où le choix du **plus petit dénominateur commun** : un fichier plat que chaque bailleur peut livrer ; le référentiel garantit un vocabulaire commun, quelle que soit la singularité de chaque système d’information. Les règles concrètes (CSV, structure tabulaire, noms de fichiers…) sont décrites dans [Conventions](docs/02-data-primitives/01-conventions/index.md).

## Pourquoi du français explicite ?

Ces exports alimentent d’abord un agent IA, mais doivent rester **impérativement lisibles par l’être humain**. Si une équipe métier ne comprend pas ces données, une IA ne les exploitera pas mieux, aussi sophistiquée soit-elle. L’agent doit ainsi pouvoir **découvrir en autonomie** les concepts, les tables et les jointures. Le fichier-source est souvent sa seule documentation.

Trois principes guident le nommage :

1. **Découverte autonome du schéma** — l'agent déduit le contenu, les jointures possibles à partir des noms des fichiers, des colonnes et des volumes (`1:1`, `1:N`) qu'il observe.
2. **Langue métier** — le français correspond aux données en base, au vocabulaire quotidien des équipes HLM (locataire, quittancement, vacance…) et à la langue avec laquelle ils interagissent avec un agent.
3. **Verbosité intentionnelle** — systématiquement préférer un intitulé long et explicite à une abréviation cryptique à la fois pour les équipes et les agents. Une colonne nommée `sm2` est incompréhensible, une colonne nommée `surface_en_m2` est auto-compréhensible.

> [!NOTE]
> Dans PIERRE, le « pourquoi » et le « comment » de ces fichiers lui sont appris afin qu’elle sache nativement manipuler, joindre et agréger ces données ; celles-ci sont par ailleurs normalisées pour garantir une exploitation optimale. Pour les fondations techniques de cette approche, spécifiques à PIERRE, voir [« One SQLite File and One Harness Is Enough for French HLM »](../../03-articles/2026-05-27-rag-sqlite/index.md) (mai 2026).

## Extensibilités

Au-delà des cinq fichiers : ce socle est ouvert à l'extension.

L'extensibilité n'est **pas** propre à PIERRE — tout agent (Claude Cowork, Codex, OpenAI Work…) qui ingère des fichiers tabulaires partageant le socle normatif partagé en bénéficie à égalité.

- **Intra-fichier** — chaque bailleur peut enrichir l’un des cinq exports de toutes données pertinentes au quotidien, à condition que les noms de colonnes soient auto-explicites et qu’ils ne doublonnent pas une notion déjà couverte par le socle normatif partagé et les colonnes obligatoires. Chaque colonne libre élargit le champ des requêtes pour **n’importe quel agent**.
- **Inter-fichiers** — un bailleur peut exposer d’autres **données tabulaires** (= d'autres fichiers). Pour peu qu’elles reprennent le socle normatif partagé, tout agent IA saura automatiquement les relier aux cinq fichiers de base.

> [!NOTE]
> À titre d'exemple, Grand Dijon Habitat expose également à PIERRE son **enquête de satisfaction-locataire**, enrichie du socle normatif partagé — ce qui ouvre de nouveaux cas d’usage.

## Le vrai enjeu : la fabrique de l'export

Le goulot d'étranglement n'est pas le modèle de données — il est délibérément minimal — mais la **fabrique de l'export** côté DSI.

Bonne nouvelle : ces cinq fichiers sont **faciles et rapides à générer** depuis n'importe quel ERP, sans chantier d'intégration.

Autre levier : le monde HLM est petit et le **nombre d'ERP est réduit**. Les bailleurs équipés du même éditeur produisent des exports quasi identiques : chacun peut donc **s'appuyer sur les requêtes et recettes des autres** plutôt que de repartir de zéro. Mutualiser la fabrique de l'export accélère l'adoption à l'échelle du mouvement.
