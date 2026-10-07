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

### Déployer PIERRE sur un serveur

Le DNS du nom choisi doit pointer vers le serveur, **sans proxy**. Les ports `80` et `443` sont ouverts. Certains hébergeurs n'ouvrent pas le `22` : les commandes prennent alors `-p` pour `ssh` et `-P` pour `scp`, par exemple `ssh -p 2234 root@le-serveur`.

Connecté en root :

```bash
curl -fsSL https://github.com/charnould/pierre/releases/download/cli-0.9.4/install.sh | sh
```

L'installation s'arrête tout de suite si la machine n'est pas `x86_64` ou si `/dev/kvm` est absent. Sinon elle demande de coller un bloc `dotenv` complet, terminé par `END` :

```dotenv
HOST=assistant.exemple.org
AUTH_PASSWORD=mot-de-passe-initial
AUTH_SECRET=AUTO
AUTH_BEARER=AUTO
AI_TYPE=anthropic
AI_BASE_URL=https://api.anthropic.com
AI_API_KEY=cle-api
CM_PRODUCT_TOKEN=
CM_FROM=
CM_WEBHOOK_SECRET=AUTO
END
```

Les dix clés sont obligatoires. `AUTO` génère les secrets techniques lors de la première installation. Laisser les trois variables CM vides — `AUTO` est accepté pour le secret — désactive CM.com ; renseigner CM nécessite un Product Token UUID, un expéditeur et un secret ou `AUTO`.

Le collage est masqué. PIERRE parse le texte sans l'exécuter, teste le fournisseur LLM puis affiche un récapitulatif sans secret avant l'installation.

L'installation affiche seulement les étapes et leur état. Les détails techniques sont écrits dans `/var/log/pierre-install.log`. Les réponses restent dans `/etc/pierre.env.pending` pendant l'opération ; `/etc/pierre.env` n'est publié qu'une fois le serveur prêt. Après une erreur, relancer simplement :

```bash
pierre install
```

Pour automatiser l'installation, enregistrer le bloc sans la ligne `END`, puis utiliser `pierre install < pierre.env`.

La base, les fichiers et l'image vivent dans `/var/lib/pierre`. Remplacer l'exécutable ne les touche pas.

Pour reprendre une base qui vivait dans Docker : copier `datastore.sqlite` à la racine de `/var/lib/pierre`, et les dossiers `files/`, `knowledge/` et `uploads/` à côté. Rien d'autre ne migre.

### Données sur le serveur

Toutes les données de PIERRE sont regroupées sous `/var/lib/pierre` :

| Chemin                                                    | Contenu                                                                                                        |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `/var/lib/pierre/datastore.sqlite`                        | Base SQLite principale : utilisateurs, activités, réclamations et configuration.                               |
| `/var/lib/pierre/files/`                                  | Sources persistantes importées dans le catalogue de connaissances et Core Data.                                |
| `/var/lib/pierre/uploads/{configuration}/{conversation}/` | Pièces jointes temporaires d'une conversation, supprimées avec son environnement d'exécution.                  |
| `/var/lib/pierre/knowledge/`                              | Index de connaissances générés ; ils sont reconstruisibles depuis la configuration et les sources de `files/`. |
| `/var/lib/pierre/backups/datastore.sqlite`                | Dernière sauvegarde cohérente créée par `pierre backup`.                                                       |

Le dossier `uploads/` est créé au premier envoi de pièce jointe ; il peut donc être absent sur une nouvelle installation. Copier un document directement dans `files/` ne l'ajoute pas au catalogue. Pour automatiser un dépôt, utiliser l'[API d'import par cURL](../index.md#automatiser-lupload-des-connaissances-via-curl).

### Les commandes

`pierre` sans argument ouvre le tableau de bord. Il vérifie :

- **réseau** : Caddy et l'adresse publique `https://HOST/up` ;
- **serveur** : le service PIERRE et son endpoint local ;
- **carl** : un véritable classement local ;
- **llm** : la connexion authentifiée à Anthropic ou OpenAI.

Il affiche aussi les versions installées et publiées ainsi que les liens du projet. Les flèches `↑/↓` déplacent la sélection, `Entrée` valide, `←` ou `Échap` revient en arrière et `q` quitte. Dans un script ou un pipe, `pierre` imprime le même état sans ouvrir l'interface et rend immédiatement la main.

```bash
pierre help
```

| Commande            | Effet                                                            |
| ------------------- | ---------------------------------------------------------------- |
| `pierre install`    | Installe PIERRE. Relancée, elle garde les secrets déjà en place. |
| `pierre update`     | Met à jour le serveur PIERRE et sa bibliothèque ONNX.            |
| `pierre update-cli` | Met à jour seulement le programme `pierre`.                      |
| `pierre carl`       | Met à jour carl (classification), puis redémarre le serveur.     |
| `pierre restart`    | Redémarre PIERRE (serveur) et attend qu'il soit opérationnel.    |
| `pierre backup`     | Sauvegarde les données et affiche la commande `scp`.             |
| `pierre logs`       | Consulte en direct les journaux de PIERRE et Caddy.              |
| `pierre configure`  | Modifie le domaine, le fournisseur LLM et CM.com.                |
| `pierre env`        | Affiche le bloc dotenv complet de l'instance.                    |
| `pierre remove`     | Désinstalle tout après confirmation.                             |

`pierre env` affiche volontairement toutes les valeurs, secrets inclus. La commande est réservée à root et sa sortie peut être sauvegardée ou transmise directement à `pierre configure` :

```bash
pierre env > pierre.env
pierre configure < pierre.env
```

`pierre configure` exige le bloc complet. `HOST`, les variables llm et CM.com sont modifiables sans retélécharger le serveur, carl ou les micro-VM. `AUTH_PASSWORD`, `AUTH_SECRET` et `AUTH_BEARER` doivent rester identiques : le mot de passe est un secret de bootstrap et les deux secrets techniques ont leur propre cycle. La nouvelle configuration est testée avant publication ; en cas d'échec, l'environnement et Caddy précédents sont restaurés.

`pierre carl` ouvre la liste des versions publiées : les flèches choisissent, `Entrée` installe et `←` revient sans rien changer. `pierre carl carl-1.2.0` installe cette version directement. Choisir la version déjà en place ne télécharge rien et ne redémarre pas.

Changer de version de carl peut déplacer la taxonomie et les motifs : le même message sera qualifié autrement. Les réclamations déjà enregistrées gardent leur ancienne qualification. Les automatisations qui filtrent sur un motif sont à relire. Revenir à la version précédente se fait avec la même commande. La base n'est pas réécrite.

`pierre restart` est la commande après une modification de `/etc/pierre.env`. Elle ne touche ni Caddy ni la machine. Le premier classement qui suit recharge le modèle.

`pierre logs` ouvre les 200 dernières lignes de PIERRE et Caddy, en couleur, puis suit les nouvelles. `Ctrl+C` suspend le direct, `↑/↓` et `PageUp/PageDown` font défiler, `/` recherche, `n` poursuit la recherche, `F` reprend le direct et `q` revient au menu.

`pierre remove` retire les services, l'exécutable, `/etc/pierre.env`, le site Caddy, les micro-VM, smolvm et `/var/lib/pierre`. Les paquets du système restent. Pour les retirer aussi :

```bash
apt purge caddy imagemagick ghostscript libvirglrenderer1 unzip jq
```

### Vérifier

```bash
pierre
systemctl is-active pierre caddy
curl -fsS http://127.0.0.1:3000/up
curl -fsS https://le-nom-choisi/up
```

Le classement, avec une phrase courte, répond `200` et un objet `output`. Le premier appel après un démarrage charge le modèle ; les suivants répondent dans la foulée.

```bash
curl -fsS -X POST https://le-nom-choisi/api/models/carl \
  -H 'content-type: application/json' \
  -d '{"texte":"la chaudière est en panne"}'
```

### Sauvegarder la base

```bash
pierre backup
scp root@le-serveur:/var/lib/pierre/backups/datastore.sqlite .
```

La commande écrit une copie cohérente pendant que le serveur tourne. Chaque sauvegarde remplace la précédente. `files/`, `knowledge/` et `uploads/` n'y sont pas. Si le SSH n'écoute pas sur le port `22`, `scp` prend `-P`.

Depuis le tableau de bord, l'écran de sauvegarde indique le fichier créé, la commande exacte à exécuter sur l'ordinateur qui recevra la copie et un exemple avec un port SSH différent.

### Mettre à jour

Le tableau de bord vérifie les dernières versions publiées, séparément pour le serveur, le cli et carl. Lorsqu'une version plus récente du serveur existe, il affiche la version cible et remplace l'action du menu par `Mettre à jour PIERRE vers server-x.y.z`. La mise à jour ne démarre qu'après confirmation.

```bash
pierre update
pierre update-cli
```

`pierre update` télécharge le serveur et la bibliothèque ONNX depuis une même release stable `server-x.y.z`. Les deux fichiers sont vérifiés avant toute modification. Le serveur est installé et testé ; s'il ne redémarre pas, la version précédente de ces deux fichiers est restaurée. Le cli n'est pas modifié.

`pierre update-cli` remplace seulement `/usr/local/bin/pierre`, après vérification de l'empreinte et de la version. Aucun service ni donnée n'est touché.

La base, `files/`, `knowledge/`, `uploads/`, `backups/`, carl et les micro-VM restent en place. carl conserve son propre cycle de mise à jour avec `pierre carl`. Le cli a son propre cycle, publié sous les tags `cli-x.y.z`.

### Déploiement

Sur un serveur, PIERRE est un exécutable. [Caddy](https://caddyserver.com) termine le TLS et transmet vers `127.0.0.1:3000`, sans bufferiser le flux NDJSON. Les temps de lecture, d'écriture et d'en-têtes sont de 30 minutes, le temps d'une réponse longue.

```
Navigateur                          VPS
----------                          --------------------------------

                                    Caddy :443
                                       |
                                       v
                                    pierre  127.0.0.1:3000
                                       |-- SQLite   /var/lib/pierre
                                       |-- carl     en mémoire
                                       |-- smolvm   /dev/kvm
```

carl est chargé par le serveur au premier classement. Sans modèle, le site démarre et le classement répond 503.

L'application Electron Desktop n'est pas installée sur le VPS. Le serveur contient le binaire PIERRE dans `/usr/local/lib/pierre`, sa bibliothèque ONNX et ses données. Le programme d'administration est distinct : `/usr/local/bin/pierre`. Les assets web nécessaires au serveur sont intégrés au binaire lors de la compilation.

## Faire fonctionner PIERRE en local

> Utile pour améliorer le code ou contribuer au projet.

Les instructions ci-après sont valables pour **macOS** ; elles doivent être compatible avec **Windows** via [`WSL`](https://learn.microsoft.com/fr-fr/windows/wsl/install).

1. Installer `Bun` (≥ `1.4.x`) et vérifier sa bonne installation ([instructions](https://bun.sh/docs/installation)).
2. Installer `SQLite3` et vérifier sa bonne installation ([instructions](https://www.sqlite.org/download.html)).
3. Installer `smol` (microVM isolées) et vérifier sa bonne installation ([instructions](https://smolmachines.com/)).
4. Forker/cloner le présent dépôt.
5. Lancer `bun install` dans votre terminal pour installer les dépendances.
6. Renommer le fichier `.env.example` en `.env` et le compléter.
7. Dans votre terminal, lancer `bun dev:server` pour démarrer PIERRE Serveur (`http://localhost:3000` affiche une icône de verrou).
8. Déposer les fichiers de [carl](../../../03-core-models-hlm/CARL.md) (`model.onnx`, `labels.json`, `tokenizer.json`, `tokenizer_config.json`) dans `server/models/carl`. Ils sont dans `model.zip`, sur la release `carl-*`. Sans ces fichiers, le serveur démarre et le classement répond 503.
9. Dans un autre terminal, lancer `bun dev:desktop` pour monter l'application desktop (elle se lance automatiquement).
10. Renseigner dans l'application :

- serveur : `http://localhost:3000`
- Email : `admin@pierre-ia.org`
- Mot de passe : la valeur de `AUTH_PASSWORD` dans `.env`

11. Et voilà, PIERRE fonctionne — ne reste plus qu'à [le paramétrer](docs/05-user-manual) !
