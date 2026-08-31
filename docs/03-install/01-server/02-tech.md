# Architecture et fonctionnement technique

## Sécurité, confidentialité & RGPD

PIERRE est pensé pour être hébergé sur l'infrastructure choisie par l'organisme HLM ou par **pierre-ia.org**. Les données propriétaires, les contenus extraits et les conversations sont uniquement stockés sur l'instance déployée. Lorsqu'un utilisateur interroge PIERRE, le contenu nécessaire à la réponse peut être transmis au modèle de langage configuré/choisi par l'organisme.

Les questions RGPD, DPO, localisation des données, rôles de responsabilité et traitements associés sont détaillés dans la note dédiée : [Data Protection Officer](/guides/data-protection-officer).

## Contribuer au code source

Pour contribuer au code source, créer une `issue` dans GitHub et suivre les us et coutumes des projets open source. Les `releases` de PIERRE [sont consultables ici](https://github.com/charnould/pierre/releases).

## Technologies

| Composant                   | Technologie                                                                               |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| Runtime                     | [Bun](https://bun.sh) (MIT)                                                               |
| Framework                   | [Hono](https://hono.dev) (MIT)                                                            |
| Agent IA (« Harness »)      | [Pi](https://pi.dev) (MIT)                                                                |
| Isolation des conversations | [smol machines](https://smolmachines.com/), micro-VMs via KVM (Apache-2.0)                |
| Base de données             | SQLite via `bun:sqlite` (Public Domain)                                                   |
| Déploiement                 | [Kamal](https://kamal-deploy.org) (MIT) via [Docker](https://www.docker.com) (Apache-2.0) |
| LLM                         | BYOK — OpenAI / OpenAI-compatible / Anthropic                                             |

## Vue d'ensemble technique

L'application sert l'interface web, isole chaque conversation dans une micro-VM, monte la base de connaissances autorisée dans cette VM, puis laisse l'agent explorer les fichiers utiles avant de répondre.

Contrairement à un simple chatbot qui injecte un contexte fixe dans un LLM, PIERRE **raisonne, explore et lit des fichiers de façon autonome**. C'est cette capacité — lire dynamiquement les bonnes sources plutôt que tout envoyer aveuglément — qui lui permet de travailler sur des bases de connaissances importantes et de répondre à des questions complexes nécessitant de « raisonnner ».

```
Navigateur / Widget / Apps              VPS (production)
--------------------------              ----------------------------------------

                                        +-- Docker container ------------------+
+----------+   GET /ai                  |                                      |
|          | -------------------------> |  Hono (Bun)                          |
|  Client  |                            |    |                                 |
|          | <------------------------- |    |-- authenticate                  |
+----------+   NDJSON stream            |    |-- parse AIContext               |
               {type:"text_delta",...}  |    |-- save user message (SQLite)    |
               {type:"message_end",...} |    |-- streamChatAnswer()            |
               {type:"stream_end"}      |         |                            |
                                        |         v                            |
                                        |    streamCopilot()                   |
                                        |         |                            |
                                        +---------+----------------------------+
                                                  |
                                                  | JSONL stdin/stdout
                                                  v
                                        +-- smolVM (micro-VM) ----------------+
                                        |                                     |
                                        |  Pi                                 |
                                        |  (RPC mode)                         |
                                        |         |                           |
                                        |         |-- lit /knowledge/**       |
                                        |         |-- appelle le LLM (BYOK)   |
                                        |         |-- génére la réponse       |
                                        |                                     |
                                        |  /knowledge (volume monté)          |
                                        |  |-- Vie du bail/                   |
                                        |  |-- Charges locatives/             |
                                        |  |-- Données propriétaires          |
                                        |  |-- ...                            |
                                        +-------------------------------------+
```

## Isolation par conversation : les smolVMs

C'est une particularité important de l'architecture de PIERRE pour du « privacy by design ».

**Chaque conversation active dispose de sa propre micro-VM isolée** (via [smol machines](https://smolmachines.com/)). Concrètement :

1. À l'arrivée d'un premier message, PIERRE crée une micro-VM légère.
2. La base de connaissance applicable est **montée en lecture** à l'intérieur de la VM.
3. **Pi** est démarré en mode RPC (stdin/stdout JSONL) à l'intérieur de cette VM.
4. Un processus hôte (`PiRpcClient`) communique avec Pi via les flux stdin/stdout du sous-processus.
5. La conversation se déroule : Pi lit `AGENTS.md` (instructions système) et les fichiers de la base de connaissances, raisonne, et répond.
6. Après **30 minutes d'inactivité**, la VM est automatiquement détruite.

```
  Serveur hôte
  +------------------------------------------------------------------------------+
  |                                                                              |
  |   vm-registry (Map<convId, VmEntry>)                                         |
  |                                                                              |
  |   conversation_abc  -->  smolVM "conversation_abc"   PiRpcClient (stdin/stdout)   |
  |   conversation_def  -->  smolVM "conversation_def"   PiRpcClient (stdin/stdout)   |
  |   conversation_xyz  -->  smolVM "conversation_xyz"   PiRpcClient (stdin/stdout)   |
  |                                                                              |
  |   [timer 30min inactivité -> destroyVm()]                                    |
  |   [cleanup orphelins au démarrage]                                           |
  +------------------------------------------------------------------------------+
```

**Pourquoi cette approche ?**

| Propriété                      | Sans smolVM                | Avec smolVM                         |
| ------------------------------ | -------------------------- | ----------------------------------- |
| Isolation des conversations    | ✗ Contexte partagé         | ✓ VM étanche par conv.              |
| Fichiers accessibles à l'agent | Injectés manuellement      | Montés nativement dans `/knowledge` |
| Sécurité des écritures         | Aucune garantie            | Écritures bloquées hors `/tmp/`     |
| Session persistante            | Reconstituée à chaque tour | Conservée nativement dans Pi        |

## Le flux de streaming (NDJSON)

PIERRE ne retourne pas une réponse monolithique — il **streame** la réponse en temps réel vers le client. Le protocole utilisé est le **NDJSON** (Newline-Delimited JSON) : chaque événement est une ligne JSON terminée par `\n`.

```
Pi (VM)                 streamCopilot()           Client
     |                         |                        |
     |  agent_start            |                        |
     | --------------------->  |                        |
     |  text_delta "Bon"       |   {type:"text_delta",  |
     | --------------------->  | -- contentIndex:0,     >
     |  text_delta "jour"      |      delta:"Bon"}      |
     | --------------------->  | -- {type:"text_delta", >
     |  tool_start             |      ...}              |
     | --------------------->  | ---------------------> |
     |                         | {type:"tool_execution_ |
     |                         |  start", ...}          |
     |  tool_result            |                        |
     | --------------------->  | {type:"tool_execution_ |
     |  text_delta "Voici…"    |  end", ...}            |
     | --------------------->  | -- {type:"text_delta"}>|
     |  agent_end              |   {type:"stream_end"}  |
     | --------------------->  | ---------------------> |
```
