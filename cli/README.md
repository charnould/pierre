# cli PIERRE

Binaire autonome qui installe et administre un serveur PIERRE. Le script `scripts/install.sh` ne fait que le télécharger.

## Commandes

| Commande            | Droits                         | Effet                                        |
| ------------------- | ------------------------------ | -------------------------------------------- |
| `pierre`            | root si PIERRE est installé    | Tableau de bord, ou état texte hors terminal |
| `pierre install`    | root, Linux x86_64, `/dev/kvm` | Installe le serveur                          |
| `pierre update`     | root                           | Met à jour le serveur et ONNX                |
| `pierre update-cli` | root                           | Met à jour seulement ce programme            |
| `pierre carl`       | root                           | Installe une version de carl                 |
| `pierre configure`  | root                           | Modifie le bloc dotenv                       |
| `pierre env`        | root                           | Affiche le bloc dotenv, secrets inclus       |
| `pierre restart`    | root                           | Redémarre le service                         |
| `pierre backup`     | root                           | Sauvegarde SQLite via le serveur             |
| `pierre logs`       | root                           | Journaux dans `less`                         |
| `pierre remove`     | root                           | Désinstalle après confirmation               |
| `pierre help`       | aucun                          | Liste les commandes                          |
| `pierre --version`  | aucun                          | Tag de release `cli-x.y.z`                   |

Hors terminal, les commandes écrivent le résultat et rendent la main. `pierre help` et `pierre --version` ne demandent pas root.

Les futures commandes qui liront les données de PIERRE passeront par l’API HTTP et `AUTH_BEARER`. Le cli n’écrit pas dans SQLite, sauf l’appel `backup` du binaire serveur.

## Versions

- serveur : plus grand tag stable `server-x.y.z`
- carl : plus grand tag `carl-x.y.z`
- cli : plus grand tag stable `cli-x.y.z`

Une release `cli-*` ne change pas la version du serveur.

## Compilation

```bash
bun build --compile --target=bun-linux-x64 --no-compile-autoload-dotenv \
  cli/src/main.ts --outfile cli/dist/pierre-cli-linux-x64
```
