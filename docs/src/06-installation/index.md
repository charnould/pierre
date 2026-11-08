## Automatiser l'upload des connaissances via cURL

L'API permet de programmer le dépôt de documents ou de fichiers Core Data sans écrire directement sur le disque du serveur.

Préparer l'adresse de l'instance et le secret `AUTH_BEARER`. Root peut le récupérer avec `pierre env`. Le placer dans le gestionnaire de secrets de l'automatisation, jamais dans un script versionné :

```bash
PIERRE_TOKEN=$(pierre env | awk -F= '$1 == "AUTH_BEARER" { print substr($0, index($0, "=") + 1) }')
```

```bash
export PIERRE_URL="https://assistant.pierre-ia.org"
export PIERRE_TOKEN="secret-auth-bearer"

curl --fail-with-body --silent --show-error --retry 3 \
  --request POST "$PIERRE_URL/knowledge/sources" \
  --header "Authorization: Bearer $PIERRE_TOKEN" \
  --header "Accept: application/json" \
  --form "files[]=@/chemin/indicateurs.csv" \
  --form "files[]=@/chemin/manuel.docx"
```

Une importation réussie répond `201 Created` avec les sources créées ou mises à jour.

Règles :

- le champ multipart est `files[]` et peut être répété pour envoyer plusieurs fichiers ;
- ne pas ajouter manuellement `Content-Type` : cURL génère la frontière multipart ;
- la requête complète est limitée à 100 Mo ;
- les formats acceptés sont `.csv`, `.md`, `.docx`, `.xlsx`, `.xls`, `.xlsm` et `.xlsb` ;
- un nouveau document apparaît comme `Non affecté` jusqu'à ce qu'un administrateur lui attribue ses profils ;
- renvoyer un fichier portant le même nom met à jour son contenu sans perdre son affectation ;
- un fichier dont les octets n’ont pas changé ne réécrit rien ;
- les fichiers Core Data utilisent la même route et un nom contractuel, par exemple `core.reclamations.csv` ;
- un classeur Excel est refusé si ses en-têtes ne sont pas sur la première ligne, si une colonne n’a pas de nom, si deux colonnes portent le même nom, ou s’il contient une cellule fusionnée ;
- copier un fichier sur le disque du serveur ne met pas à jour le catalogue : seul cet endpoint importe.

Le serveur transforme immédiatement chaque fichier et ne conserve pas l’original. Le Markdown et les tableaux importés vivent dans `/var/lib/pierre/datastore.sqlite`. `pierre backup` suffit donc à sauvegarder ces imports. `/var/lib/pierre/uploads/` contient uniquement les pièces jointes temporaires des conversations.
