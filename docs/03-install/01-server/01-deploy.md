# Déploiement : Kamal + Docker

PIERRE se déploie en une commande grâce à [**Kamal**](https://kamal-deploy.org/) qui orchestre Docker sur le VPS.

```
Machine locale                          VPS
--------------                          -------------------------------------

                                        +-- Kamal proxy (SSL/TLS + HTTP/2) --+
$ bun prod:deploy                       |   ^                                |
     |                                  |   | :443                           |
     |-- docker build (amd64)           |   |                                |
     |-- push -> registry local :5555   |   v                                |
     |-- kamal deploy ----------------> |  Docker container (PIERRE)         |
                                        |   |-- Bun runtime                  |
                                        |   |-- smolvm binary                |
                                        |   |-- /dev/kvm (nested virt.)      |
                                        |   |-- volume datastores/ (SQLite)  |
                                        +------------------------------------+
```

Kamal gère :

- Le **build Docker** en `amd64`
- Un **registry Docker local** sur le VPS (port `5555`)
- Le **proxy SSL automatique** (via Let's Encrypt) avec un timeout de 600s pour les longues requêtes IA
- Le **déploiement sans interruption** (_zero-downtime_) par swap de containers
- La **persistance des données** : le volume `datastores/` survit aux redéploiements

Il est possible de déployer **plusieurs instances** sur un même VPS (ex : production + staging).

## Comment déployer PIERRE ?

## Prérequis

Avant de déployer PIERRE, vérifier que vous disposez de :

| Prérequis         | Détail                                                                   |
| ----------------- | ------------------------------------------------------------------------ |
| **Serveur**       | Linux, virtualisation imbriquée activée (`/dev/kvm` exposé au container) |
| **Ports ouverts** | `80` (HTTP) et `443` (HTTPS)                                             |
| **Accès SSH**     | Clef ou mot de passe                                                     |
| **Clé API LLM**   | OpenAI, Anthropic ou tout provider compatible OpenAI API                 |

> [!IMPORTANT]
> La **nested virtualisation** (virtualisation imbriquée) est la seule contrainte matérielle de PIERRE **(nul besoin de GPU)**. Elle est indispensable pour que les smolVMs puissent s'exécuter à l'intérieur du container Docker. La plupart des VPS la proposent en option ou nativement.

## Faire héberger PIERRE (le plus simple)

Si vous ne souhaitez pas gérer l'infrastructure, le projet PIERRE propose une **offre d'hébergement managé** :

- Déploiement clé en main sur serveur dédié
- Mises à jour automatiques (dernière version en permanence)
- Suivi et monitoring inclus
- Hébergement chez [Hetzner](https://www.hetzner.com/legal/legal-notice/) (Falkenstein, Allemagne - ISO 27001)
- Aucune compétence technique requise côté bailleur

Adresser un email à charnould@pierre-ia.org pour en savoir plus.

## Héberger PIERRE (self-hosting)

### Faire fonctionner PIERRE en local en 5 minutes

Les instructions ci-après sont valables sous **macOS** et **Windows** (via WSL — [sous-système Windows pour Linux](https://learn.microsoft.com/fr-fr/windows/wsl/install)).

1. Installer `Bun` (≥ `1.4.x`) et vérifier sa bonne installation ([instructions](https://bun.sh/docs/installation)).
2. Installer `SQLite3` et vérifier sa bonne installation ([instructions](https://www.sqlite.org/download.html)).
3. Installer `smol machines` (micro-VM isolées) et vérifier sa bonne installation ([instructions](https://smolmachines.com/)).
4. Forker/cloner le présent dépôt.
5. Lancer `bun install` dans votre terminal pour installer les dépendances.
6. Renommer le fichier `.env.example` en `.env.production` et le compléter.
7. Lancer `bun dev` pour démarrer PIERRE.
8. PIERRE est accessible à http://localhost:3000.

### Déployer pour la première fois PIERRE sur un serveur de production

Pour déployer PIERRE sur un serveur, il est indispensable d'être parvenu à le faire fonctionner en local.

1. Installer `Docker Desktop` et le lancer ([instructions](https://www.docker.com/products/docker-desktop/)). `Docker` gérera la conteneurisation.
2. Lancer `gem install kamal` pour installer `Kamal` (≥`2.11.0`) qui gérera le déploiement ([instructions](https://kamal-deploy.org/docs/installation/)).
3. Disposer d'un VPS et être en capacité de s'y connecter via `ssh` (avec une clef ou mot de passe). Les ports `80` (`http`) et `443` (`https`) doivent impérativement être ouverts.
4. Finaliser les modifications du fichier `.env.production` que vous avez créé précédemment.
5. Saisir dans votre terminal `bun prod:setup`.
6. PIERRE est accessible à l'adresse URL de votre serveur (prévoir quelques minutes pour la génération des certificats SSL).
7. Étapes suivantes (optionnelles et décrites ci-dessous) :  
   – Créer une seconde instance (de tests) de PIERRE sur le même serveur  
   – Personnaliser PIERRE  
   – Afficher PIERRE sur votre site internet, extranet-locataire ou intranet

### Redéployer PIERRE sur un serveur de production

PIERRE — et notamment sa base de connaissances — évolue régulièrement et suit la convention `semver`. Pour le mettre à jour :

1. Saisir `bun pierre:version` pour connaître la dernière version disponible.
2. Consulter les [releases](https://github.com/charnould/pierre/releases) pour connaître les modifications et éventuels _breaking changes_.
3. Mettre à jour votre fork/clone.
4. Saisir `bun pierre:config` pour vous assurer que `config.ts` est correctement paramétré.
5. Saisir `bun prod:deploy` dans votre terminal pour redéployer.

### Déployer et redéployer PIERRE sur un serveur de tests

Pour tester en conditions réelles les mises à jour et nouveautés de PIERRE, le plus simple est de **déployer une seconde instance** de PIERRE sur votre serveur de production.

1. Dupliquer `.env.production` en `.env.staging` et le modifier (a priori uniquement `SERVICE` et `HOST`).
2. Lancer `bun staging:setup` pour déployer la première fois.
3. Lancer `bun staging:deploy` pour redéployer.
