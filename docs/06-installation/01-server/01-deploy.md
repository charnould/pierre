# Héberger & déployer PIERRE

## Faire héberger PIERRE (le plus simple)

Si vous ne souhaitez pas gérer l'infrastructure, le projet PIERRE propose une **offre d'hébergement managé** :

- Déploiement et paramétrage clé en main sur serveur dédié
- Mises à jour automatiques (dernière version en permanence)
- Suivi et monitoring inclus
- Hébergement chez l'hébergeur de votre choix
- Aucune compétence technique requise côté bailleur

Adresser un email à charnould@pierre-ia.org pour en savoir plus.

## Héberger PIERRE (self-hosting)

### Prérequis

Avant de déployer PIERRE, vérifier que vous disposez de :

| Prérequis         | Détail                                                             |
| ----------------- | ------------------------------------------------------------------ |
| **Serveur**       | Ubuntu ou Debian, `x86_64`, avec `/dev/kvm`                        |
| **Ports ouverts** | `80` (HTTP) et `443` (HTTPS)                                       |
| **Accès SSH**     | Clef ou mot de passe, en root                                      |
| **Clé API LLM**   | Anthropic, OpenAI ou un fournisseur compatible avec son API        |
| **DNS**           | Le DNS du nom choisi doit pointer vers le serveur, **sans proxy**. |

>

> [!IMPORTANT]
> Recommandation de serveur : `/dev/kvm` est la seule contrainte matérielle **(nul besoin de GPU)**. Nous recommandons un serveur d'une configuration équivalente ou supérieure à [EX44](https://www.hetzner.com/dedicated-rootserver/ex44) (minimum 64 GB de RAM). Une seule instance de PIERRE est déployable par serveur.

> Certains hébergeurs n'ouvrent pas le `22` : `ssh` prend alors `-p` et `scp` prend `-P`, par exemple `ssh -p 2234 root@le-serveur`.

### Déployer PIERRE sur un serveur

Connecté en root, une commande installe les services et démarre PIERRE sur le domaine. Le DNS doit déjà pointer vers le serveur.

```bash
curl -fsSL https://github.com/charnould/pierre/releases/download/cli-0.9.14/install.sh | sh -s -- --host assistant.exemple.org
```

Si le CLI est déjà en place :

```bash
pierre install --host assistant.exemple.org
```

L'installation s'arrête tout de suite si la machine n'est pas `x86_64` ou si `/dev/kvm` est absent. La même commande la reprend.

PIERRE génère le mot de passe administrateur et les secrets d'authentification, puis les affiche une seule fois si le démarrage réussit. Pour changer le domaine d'une instance déjà en service, la même commande conserve les secrets et n'affiche plus le mot de passe.

Si le domaine public ne répond pas, la configuration précédente est restaurée. La tentative reste enregistrée : relancer la même commande réutilise les mêmes secrets.

L'intelligence et les canaux se règlent ensuite dans le bureau, `Administration` → `Prestataires`. Le CLI ne les affiche pas. Une instance déjà en service n'utilise plus les anciennes variables `AI_*` et `CM_*`. Si ces valeurs sont encore dans `/etc/pierre.env`, recopiez-les dans le bureau avant un prochain `pierre install --host`, qui réécrit le fichier sans elles.

### Vérifier

```bash
pierre
```

La commande affiche l'état et les commandes, puis rend la main. Le code de sortie vaut `0` lorsque le site, le serveur et le classement répondent.

Les autres codes sont `1` pour un échec ou un élément obligatoire indisponible, et `2` pour une commande mal écrite.

`pierre env` affiche `HOST`, `AUTH_PASSWORD`, `AUTH_SECRET` et `AUTH_BEARER`, sans couleur ni commentaire. La commande est réservée à root. Elle sert à relire le mot de passe administrateur, affiché une seule fois, et le jeton `AUTH_BEARER` des dépôts automatisés. Ne partagez pas sa sortie.

La base, les fichiers et l'image vivent dans `/var/lib/pierre`. Remplacer l'exécutable ne les touche pas.

Pour reprendre une base qui vivait dans Docker : copier `datastore.sqlite` à la racine de `/var/lib/pierre`, et les dossiers `files/`, `knowledge/` et `uploads/` à côté. Rien d'autre ne migre.

Toutes les données de PIERRE sont regroupées sous `/var/lib/pierre` :

### Les commandes

| Commande                        | Effet                                                     |
| ------------------------------- | --------------------------------------------------------- |
| `pierre`                        | Affiche l'état et les commandes.                          |
| `pierre install --host DOMAINE` | Installe les services.                                    |
| `pierre update`                 | Met à jour l'ensemble des services.                       |
| `pierre restart`                | Redémarre l'ensemble des services.                        |
| `pierre backup`                 | Sauvegarde la base de données.                            |
| `pierre logs`                   | Affiche les journaux.                                     |
| `pierre env`                    | Affiche le domaine et les secrets d'authentification.     |
| `pierre remove`                 | Supprime l'ensemble des services et des données.          |

Une option s'écrit `--option valeur`. `--option=valeur` est refusé.

`pierre install` exige `--host`.

`pierre logs` ouvre les 200 dernières lignes puis suit les nouvelles. Dans un terminal, `Ctrl+C` quitte, les flèches défilent, `/` recherche, `n` poursuit la recherche et `F` reprend le direct.

`pierre remove` retire les services, l'exécutable, `/etc/pierre.env`, le site Caddy, les micro-VM, smolvm et `/var/lib/pierre`.

## Faire fonctionner PIERRE en local

> Utile pour améliorer le code ou contribuer au projet.

Les instructions ci-après sont valables pour **macOS** ; elles doivent être compatible avec **Windows** via [`WSL`](https://learn.microsoft.com/fr-fr/windows/wsl/install).

1. Installer `Bun` (≥ `1.4.x`) et vérifier sa bonne installation ([instructions](https://bun.sh/docs/installation)).
2. Installer `SQLite3` et vérifier sa bonne installation ([instructions](https://www.sqlite.org/download.html)).
3. Forker/cloner le présent dépôt.
4. Lancer `bun install` dans votre terminal pour installer les dépendances.
5. Construire l'image locale avec `bun --filter @pierre/server microvm:build:macos`. La commande télécharge et vérifie la version smolvm épinglée.
6. Renommer le fichier `.env.example` en `.env` et le compléter.
7. Dans votre terminal, lancer `bun dev:server` pour démarrer PIERRE Serveur (`http://localhost:3000` affiche une icône de verrou). La commande installe la dernière release [carl](../../../03-core-models-hlm/CARL.md) dans `server/models/carl` lorsque le modèle est absent, incomplet ou plus ancien. Le premier lancement télécharge l'archive. Si ce téléchargement échoue, le serveur ne démarre pas.
8. Dans un autre terminal, lancer `bun dev:desktop` pour monter l'application desktop (elle se lance automatiquement).
9. Renseigner dans l'application :

- serveur : `http://localhost:3000`
- Email : `admin@pierre-ia.org`
- Mot de passe : la valeur de `AUTH_PASSWORD` dans `.env`

10. Dans le bureau, `Administration` → `Prestataires`, enregistrez l'intelligence. Les variables `AI_*` et `CM_*` du `.env` ne sont pas lues. Le fichier écrit est `server/datastores/providers.json`.
11. Et voilà, PIERRE fonctionne — ne reste plus qu'à [le paramétrer](docs/05-user-manual) !
