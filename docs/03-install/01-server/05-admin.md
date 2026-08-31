# Administrer PIERRE avec une interface graphique

Si vous hébergez PIERRE :

1. Rendez-vous à l'adresse https://180.81.82.83/a (à remplacer par votre domaine/IP).
2. Saisir (la première fois) `admin@pierre-ia.org` et le mot de passe contenu dans la variable d'environnement `AUTH_PASSWORD`.
3. Vous pouvez désormais créer autant d'utilisateurs que nécessaire (n'oubliez pas de transmettre les mots de passe !) qui pourront modifier les utilisateurs ou l'encyclopédie, consulter les conversations ou les statistiques.

## Ajouter des connaissances depuis l'interface

Depuis la page `Encyclopédie`, un administrateur peut ajouter les documents propriétaires de l'organisme. Cette action alimente la base de connaissances utilisée par PIERRE pour répondre selon vos procédures, vos coordonnées et vos consignes locales.

Avant le premier import, transmettre aux équipes concernées le guide [préparer vos documents pour PIERRE](/guides/préparer-vos-documents). Il détaille les formats acceptés, la structure attendue des fichiers Word/Excel/Markdown et le rôle du fichier `_metadata.xlsx`.

1. Se connecter à https://180.81.82.83/a, puis cliquer sur `Encyclopédie`.
2. Télécharger `_metadata.xlsx`, le compléter **scrupuleusement** et le ré-uploader avec les fichiers associés.
3. **Indispensable** : [Configurer](https://github.com/charnould/pierre/blob/master/assets/default/config.ts#L188) `config.ts` de manière à permettre l'utilisation des connaissances `proprietary` et le protéger s'il utilise des données privées.
4. Toutes les nuits aux alentours de 4h du matin, la base de connaissances est automatiquement reconstruite.

## Automatiser l'upload des connaissances via cURL

Cette option permet d'automatiser/programmer le processus d'upload documentaire — particulièrement utile si vos données changent souvent ou quotidiennement (ex : présence des collaborateurs).

```bash
curl -X POST https://URL/a/knowledge \
  -H "Authorization: Bearer AUTH_BEARER" \
  -H "Authorization-Context: cli" \
  -H "Accept: application/json" \
  -F "service=pierre" \
  -F "files[]=@Carnet du patrimoine.docx" \
  -F "files[]=@Cahier de consignes.xlsx"
```

avec :

- `URL` : l'URL de votre instance de PIERRE
- `AUTH_BEARER` : la variable d'environnement `AUTH_BEARER`
- `service` : la variable d'environnement `SERVICE`
- `files[]` : le ou les fichiers à uploader

> [!NOTE]
> La présence sur le serveur de `_metadata.xlsx` est toujours **indispensable**.
