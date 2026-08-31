# Personnalisation

## Modifier et paramétrer PIERRE (self-hosting)

> [!NOTE]
> Dans les instructions ci-dessous, nous considérons un bailleur social fictif nommé `Pierre Habitat` dont le site institutionnel est accessible à `pierre-habitat.fr` et qui a déployé sa propre version de PIERRE à l'adresse/IP `180.81.82.83`.

## Modifier l'interface de l'agent IA

<img src="./personnalisation-de-pierre.webp" height="400" />

1. Dans le répertoire `./customization/chatbots`, supprimer tous les répertoires à l'exception de `default` (vous pouvez modifier ou dupliquer `default`).
2. Créer une icône `system.svg` et remplacer la précédente dans `default`. Cette icône est celle qui apparaît dans l'interface de l'agent IA (au-dessus de « Bonjour 👋 »).
3. [Générer les icônes](https://www.pwabuilder.com/imageGenerator) qui permettront d'ajouter votre agent IA sur l'écran d'accueil des smartphones de vos utilisateurs et remplacer celles dans le dossier `icons` (les icônes Windows ne sont pas nécessaires). Conserver la structure du répertoire et le nommage des fichiers (automatique).
4. Modifier `config.ts` :  
   – `id` avec le nom exact du répertoire  
   – `greeting` qui est le message d'accueil de votre agent IA  
   – `examples` qui sont les exemples proposés après votre message d'accueil  
   – `disclaimer` qui est le message s'affichant après chaque réponse générée (ex : _Une IA peut se tromper, vérifier les informations._).
5. Modifier dans `manifest.json` :  
   – `short_name` par le nom souhaité de votre agent IA  
   – `start_url` par `https://180.81.82.83/?config=default` (ou par le nom du répertoire que vous avez créé)
6. Votre chatbot personnalisé est disponible à http://localhost:3000/?config=PIERRE-habitat.

> [!TIP]
> Pour vous assurer que `config.ts` est correctement paramétré, notamment lors des montées de version qui peuvent en modifier la structure, lancer `bun pierre:config`.

## Modifier la personnalité de l'agent IA

Si vous avez personnalisé visuellement votre agent IA (_cf._ supra), il affiche bien les icônes et les salutations de votre organisme, mais **il ne se présente pas encore comme l'agent IA de votre organisme** (essayez en lui demandant qui il est !). Pour modifier cela, modifier `AGENTS.md` (préférez l'anglais). Ce fichier suit la convention standard des systèmes agentiques : Pi le lit depuis son répertoire de travail (`/knowledge`) au démarrage de chaque VM.
