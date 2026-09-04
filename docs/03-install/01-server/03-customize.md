# Personnalisation

## Modifier et paramétrer PIERRE (self-hosting)

> [!NOTE]
> Dans les instructions ci-dessous, nous considérons un bailleur social fictif nommé `Pierre Habitat` dont le site institutionnel est accessible à `pierre-habitat.fr` et qui a déployé sa propre version de PIERRE à l'adresse/IP `180.81.82.83`.

## Modifier l'interface de l'agent IA

<img src="./personnalisation-de-pierre.webp" height="400" />

1. Remplacer `./customization/branding/system.svg`. Cette icône apparaît dans l'interface de tous les agents IA de l'instance.
2. [Générer les icônes](https://www.pwabuilder.com/imageGenerator) qui permettent d'ajouter votre agent IA sur l'écran d'accueil des smartphones, puis placer les icônes Android et iOS dans `./customization/branding/icons` en conservant la structure et le nommage existants.
3. Modifier `./customization/branding/manifest.webmanifest` et remplacer `short_name` par le nom souhaité. Le manifeste est commun à tous les agents IA de l'instance.
4. Dans le répertoire `./customization/chatbots`, conserver, supprimer ou dupliquer les profils souhaités, puis modifier leur `config.ts` :
   – `id` avec le nom exact du répertoire  
   – `greeting` qui est le message d'accueil de votre agent IA  
   – `examples` qui sont les exemples proposés après votre message d'accueil  
   – `disclaimer` qui est le message s'affichant après chaque réponse générée (ex : _Une IA peut se tromper, vérifier les informations._).
5. Votre chatbot personnalisé est disponible à http://localhost:3000/?config=PIERRE-habitat.

> [!TIP]
> Pour vous assurer que `config.ts` est correctement paramétré, notamment lors des montées de version qui peuvent en modifier la structure, lancer `bun pierre:config`.

## Modifier la personnalité de l'agent IA

Si vous avez personnalisé visuellement votre agent IA (_cf._ supra), il affiche bien les icônes et les salutations de votre organisme, mais **il ne se présente pas encore comme l'agent IA de votre organisme** (essayez en lui demandant qui il est !). Pour modifier cela, modifier `AGENTS.md` (préférez l'anglais). Ce fichier suit la convention standard des systèmes agentiques : Pi le lit depuis son répertoire de travail (`/knowledge`) au démarrage de chaque VM.
