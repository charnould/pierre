# Comment déployer PIERRE ?

## Prérequis

Avant de déployer PIERRE, vérifier que vous disposez de :

| Prérequis         | Détail                                                      |
| ----------------- | ----------------------------------------------------------- |
| **Serveur**       | Ubuntu ou Debian, `x86_64`, avec `/dev/kvm`                 |
| **Ports ouverts** | `80` (HTTP) et `443` (HTTPS)                                |
| **Accès SSH**     | Clef ou mot de passe, en root                               |
| **Clé API LLM**   | Anthropic, OpenAI ou un fournisseur compatible avec son API |

> Recommandation de serveur

> [!IMPORTANT]
> `/dev/kvm` est la seule contrainte matérielle **(nul besoin de GPU)**. Les micro-VM tournent sur le KVM de la machine. Un serveur sans KVM, ou un conteneur qui ne l'expose pas, ne convient pas.

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
7. Lancer `bun dev:server` pour démarrer PIERRE. Le classement demande un second terminal : `bun run server/carl.ts`, et le modèle dans `server/models/carl` (le zip `model.zip` de la dernière release `CARL-*`).
8. PIERRE est accessible à `http://localhost:3000`.
9. [Télécharger la dernière version](https://github.com/charnould/pierre/releases) de l'application (`.dmg ` ou `.exe`), l'installer, la lancer et enfin saisir :

- serveur : `http://localhost:3000`
- Email : `admin@pierre-ia.org`
- Mot de passe : la valeur de `AUTH_PASSWORD` dans `.env`

10. Et voilà, PIERRE fonctionne !

### Déployer PIERRE sur un serveur

Le DNS du nom choisi doit pointer vers le serveur, sans proxy. Les ports `80` et `443` sont ouverts. Certains hébergeurs n'ouvrent pas le `22` : les commandes prennent alors `-p` pour `ssh` et `-P` pour `scp`, par exemple `ssh -p 2234 root@le-serveur`.

Connecté en root :

```bash
curl -fsSL https://github.com/charnould/pierre/releases/latest/download/install.sh | bash
```

Le script s'arrête tout de suite si la machine n'est pas `x86_64` ou si `/dev/kvm` est absent. Sinon il ouvre un formulaire : le nom d'hôte, le mot de passe du compte `admin@pierre-ia.org`, le fournisseur (`anthropic` ou `openai`), son adresse et sa clé. Il essaie le fournisseur avec le modèle `claude-sonnet-5` et signale si le nom d'hôte ne pointe pas vers la machine. Puis une jauge installe les paquets, smolvm, Caddy, l'exécutable, l'image des micro-VM et le modèle CARL.

`pierre` rouvre ce menu : installer, sauvegarder la base, tout supprimer. Quand la version installée n'est plus celle de la dernière release, le menu propose aussi de mettre à jour. Une mise à jour remplace l'exécutable et ne retélécharge l'image et le modèle que si leur contenu a changé. Elle ne redemande pas le formulaire et ne touche pas à la base.

`pierre remove` demande confirmation et retire PIERRE et tout ce que l'installation a ajouté.

Pour reprendre une base qui vivait dans Docker : copier `datastore.sqlite` à la racine de `/var/lib/pierre`, et les dossiers `files/`, `knowledge/` et `uploads/` à côté. Rien d'autre ne migre.

### Vérifier

```bash
systemctl is-active pierre carl caddy
curl -fsS http://127.0.0.1:3000/up
curl -fsS https://le-nom-choisi/up
```

Le classement, avec une phrase courte, répond `200` et un objet `output` :

```bash
curl -fsS -X POST https://le-nom-choisi/api/models/carl \
  -H 'content-type: application/json' \
  -d '{"texte":"la chaudière est en panne"}'
```

### Sauvegarder la base

Le menu « Sauvegarder la base », ou directement :

```bash
pierre backup
scp root@le-serveur:/var/lib/pierre/backups/datastore.sqlite .
```

La commande écrit une copie cohérente pendant que le serveur tourne. Chaque sauvegarde remplace la précédente. `files/`, `knowledge/` et `uploads/` n'y sont pas. Si le SSH n'écoute pas sur le port `22`, `scp` prend `-P`.

### Redéployer PIERRE

Ouvrir `pierre` et choisir « Mettre à jour ». La base, `files/`, `knowledge/`, `uploads/` et `backups/` restent en place.
w

## Déploiement

Sur un serveur, PIERRE est un exécutable. [Caddy](https://caddyserver.com) termine le TLS et transmet vers `127.0.0.1:3000`, sans bufferiser le flux NDJSON. Les temps de lecture, d'écriture et d'en-têtes sont de 30 minutes, le temps d'une réponse longue.

```
Navigateur                          VPS
----------                          --------------------------------

                                    Caddy :443
                                       |
                                       v
                                    pierre  127.0.0.1:3000
                                       |-- SQLite   /var/lib/pierre
                                       |-- smolvm   /dev/kvm
                                       |-- carl     127.0.0.1:3002
```

`carl` est le même exécutable, lancé avec l'argument `carl`. Il charge le modèle et ne fait que classer. La base, les fichiers et l'image smolVM vivent dans `/var/lib/pierre` : remplacer l'exécutable ne les touche pas.

L'installation, la mise à jour, la sauvegarde et la suppression sont décrites dans [Déployer](01-deploy.md).
