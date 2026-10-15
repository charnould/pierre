# Architecture et fonctionnement technique

## Contribuer au code source

Pour contribuer au code source, créer une `issue` dans GitHub et suivre les us et coutumes des projets open source. Les `releases` de PIERRE [sont consultables ici](https://github.com/charnould/pierre/releases).

## Technologies

| Composant                   | Technologie                                                                |
| --------------------------- | -------------------------------------------------------------------------- |
| Langage                     | JavaScript/TypeScript                                                      |
| Runtime                     | [Bun](https://bun.sh) (MIT)                                                |
| Framework                   | [Hono](https://hono.dev) (MIT)                                             |
| Harness                     | [Pi](https://pi.dev) (MIT)                                                 |
| Isolation des conversations | [smol machines](https://smolmachines.com/), micro-VMs via KVM (Apache-2.0) |
| Base de données             | SQLite via `bun:sqlite` (Public Domain)                                    |
| Déploiement                 | [Caddy](https://caddyserver.com) (Apache-2.0)                              |
| Application desktop         | [Electron](https://www.electronjs.org) (MIT)                               |
| LLM                         | BYOK — OpenAI / OpenAI-compatible / Anthropic                              |

## Isolation par conversation : les smolVMs

C'est une particularité important de l'architecture de PIERRE pour du « privacy by design ».

**Chaque conversation ou réflexion active dispose de sa propre micro-VM isolée** (via [smol machines](https://smolmachines.com/)). Concrètement :

1. Au démarrage d'une réflexion ou conversation, PIERRE crée une micro-VM.
2. La base de connaissances applicable est **montée en lecture** à l'intérieur de la VM.
3. **Pi** est démarré en mode RPC (`stdin`/`stdout JSONL`) à l'intérieur de cette VM.
4. Un processus hôte communique avec Pi via les flux `stdin`/`stdout` du sous-processus.
5. La réflexion/conversation se déroule : Pi lit `AGENTS.md` (instructions système) et les fichiers de la base de connaissances, raisonne, et répond.
6. Après **30 minutes d'inactivité**, la VM est automatiquement détruite.

**Pourquoi cette approche ?**

| Propriété                      | Sans microVM               | Avec microVM                     |
| ------------------------------ | -------------------------- | -------------------------------- |
| Isolation des conversations    | ✗ Contexte partagé         | ✓ VM étanche par réflexion/conv. |
| Fichiers accessibles à l'agent | Injectés manuellement      | Montés nativement                |
| Sécurité des écritures         | Aucune garantie            | Écritures bloquées hors `/tmp/`  |
| Session persistante            | Reconstituée à chaque tour | Conservée nativement dans Pi     |
