# Comment déployer PIERRE ?

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

> [!IMPORTANT]
> Une seule instance de PIERRE est déployable par serveur.

## Faire héberger PIERRE (le plus simple)

Si vous ne souhaitez pas gérer l'infrastructure, le projet PIERRE propose une **offre d'hébergement managé** :

- Déploiement et paramétrage clé en main sur serveur dédié
- Mises à jour automatiques (dernière version en permanence)
- Suivi et monitoring inclus
- Hébergement chez l'hébergeur de votre choix
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
6. Renommer le fichier `.env.example` en `.env` et le compléter, notamment `AUTH_PASSWORD`.
7. Lancer `bun dev:server` pour démarrer PIERRE.
8. PIERRE est accessible à `http://localhost:3000`.
9. [Télécharger la dernière version](https://github.com/charnould/pierre/releases) de l'application (`.dmg ` ou `.exe`), l'installer, la lancer et enfin saisir :

- serveur : `http://localhost:3000`
- Email : `admin@pierre-ia.org`
- Mot de passe : la valeur de `AUTH_PASSWORD` dans `.env`

10. Et voilà, PIERRE fonctionne !

### Déployer pour la première fois PIERRE sur un serveur

Pour déployer PIERRE sur un serveur, il est indispensable d'être parvenu à le faire fonctionner en local.

1. Installer `Docker Desktop` et le lancer ([instructions](https://www.docker.com/products/docker-desktop/)). `Docker` gérera la conteneurisation.
2. Lancer `gem install kamal` pour installer `Kamal` (≥`2.11.0`) qui gérera le déploiement ([instructions](https://kamal-deploy.org/docs/installation/)).
3. Disposer d'un VPS et être en capacité de s'y connecter via `ssh` (avec une clef ou mot de passe). Les ports `80` (`http`) et `443` (`https`) doivent impérativement être ouverts.
4. Finaliser les modifications du fichier `.env` que vous avez créé précédemment.
5. Saisir dans votre terminal `bun deploy:setup`.
6. PIERRE est accessible à l'adresse URL de votre serveur (prévoir quelques minutes pour la génération des certificats SSL).
7. [Dans la dernière version](https://github.com/charnould/pierre/releases) de l'application (`.dmg ` ou `.exe`), saisir :
   - serveur : celui renseigné dans `.env` pour `HOST`
   - Email : `admin@pierre-ia.org`
   - Mot de passe : la valeur de `AUTH_PASSWORD` dans `.env`
8. Et voilà, PIERRE est déployé et accessible depuis le réseau !

> Si vous le souhaitez il est tout à fait possible d'exposer PIERRE sur le réseau sans utiliser un serveur tiers en utilisant - par exemple - [Tailscale](https://tailscale.com/).

### Redéployer PIERRE

PIERRE — et notamment sa base de connaissances — évolue régulièrement et suit la convention `semver`. Pour le mettre à jour :

> [!WARNING]
> Cette version repart d'un schéma SQLite neuf et ne migre aucune donnée. Avant son premier
> déploiement, arrêtez l'instance puis supprimez `datastore.sqlite`, `datastore.sqlite-wal`,
> `datastore.sqlite-shm` et le contenu généré de `datastores/knowledge`. Ne supprimez jamais
> `datastores/files`, qui contient les fichiers sources.

1. Saisir `bun pierre:version` pour connaître la dernière version disponible.
2. Consulter les [releases](https://github.com/charnould/pierre/releases) pour connaître les modifications et éventuels _breaking changes_.
3. Mettre à jour votre fork/clone.
4. Ouvrir l’application, puis `Administration` → `Paramétrage`, et suivre le [guide de paramétrage](03-customize.md).
5. Saisir `bun deploy` dans votre terminal pour redéployer.

# Étapes suivantes

– Personnaliser PIERRE
– Apprendre à PIERRE vos données

- Afficher PIERRE sur votre site internet, extranet-locataire ou intranet
