## Automatiser l'upload des connaissances via cURL

Cette option permet d'automatiser/programmer le processus d'upload documentaire — particulièrement utile si vos données changent souvent ou quotidiennement (ex : présence des collaborateurs).

```bash
curl -X POST https://URL/api/admin/knowledge/sources \
  -H "Authorization: Bearer AUTH_BEARER" \
  -H "Accept: application/json" \
  -F "files[]=@Carnet du patrimoine.docx" \
  -F "files[]=@indicateurs.csv" \
  -F "files[]=@Cahier de consignes.xlsx"
```

avec :

- `URL` : l'URL de votre instance de PIERRE
- `AUTH_BEARER` : la variable d'environnement `AUTH_BEARER`
- `files[]` : le ou les fichiers à uploader

> [!NOTE]
> Un nouveau fichier importé par cURL apparaît comme `Non affecté`. Un administrateur lui attribue ensuite ses profils dans l'application desktop. Les mises à jour suivantes du même nom conservent cette configuration.
