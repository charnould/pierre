# Accueil

## PIERRE – Agent IA HLM open source

> [!IMPORTANT]
> PIERRE est actuellement en version `0.40.x` (consulter les [releases](https://github.com/charnould/pierre/releases)) **(documentation à remanier suite au passage en `0.40.x`)**. La **qualité de la base de connaissances est estimée à `20 %`** — elle s'améliore en continu grâce aux contributions du mouvement HLM. En cas de difficultés, créer une `issue` ou envoyer un email à charnould@pierre-ia.org.
>
> PIERRE ne connaît pas les spécificités de votre organisme (taille du parc, coordonnées des agences, procédures internes…). **Ces éléments peuvent lui être enseignés en quelques secondes.**

## Qu'est-ce que PIERRE ?

PIERRE est un **agent IA open source** et **plurilingue** au service du mouvement HLM, de ses candidats, locataires et collaborateurs.

Plus concrètement, PIERRE c'est à la fois :

1. Un **agent IA open source** qui répond 24/7/365 aux questions de premier niveau des locataires et demandeurs HLM, et épaule au quotidien les collaborateurs des bailleurs sociaux (processus, données patrimoniales, aide à la rédaction, etc.).

2. Une **base de connaissances** en **open data** ([consultation](https://github.com/charnould/pierre/tree/master/knowledge/)), utilisable indépendamment de l'agent IA et indispensable à toute [IA agentique](https://fr.wikipedia.org/wiki/Intelligence_artificielle_agentique).

## Modèles de langage (BYOK)

PIERRE fonctionne sur le principe du **« Bring Your Own LLM Key/Model »** : vous choisissez et fournissez votre propre modèle.

La configuration se fait dans `.env.production` :

```bash
AI_TYPE=openai
AI_BASE_URL=https://…
AI_MODEL=gpt-5.4
AI_API_KEY=sk-…
```

## Télémétrie

Afin de mesurer l'usage de PIERRE et comprendre quelles fonctionnalités sont utilisées, **chaque instance de PIERRE envoie automatiquement et silencieusement un ping anonyme à `pierre-ia.org`** à chaque interaction. Ce ping contient uniquement l'URL de l'instance (`HOST`) et le type d'événement — **aucune donnée personnelle, aucun contenu de conversation, rien**.

## Les coûts associés à l'usage de PIERRE

Déployer PIERRE sur un serveur génère des coûts :

- La location d'un serveur (VPS) : ~€45 par mois  
  Nul besoin de GPU, mais le serveur doit **impérativement** proposer la _nested virtualisation_.
- L'usage d'un LLM : environ $2,50 (_in_) et $15 (_out_) / MTokens

## Modifier l'interface de l'agent IA

<img src="/personnalisation-de-pierre.webp" height="400" />

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

### Demander à l'agent IA de citer ses sources

Pour que l'agent IA cite systématiquement ses sources dans ses réponses, ajouter dans `AGENTS.md` une instruction explicite (not working).

## Installer PIERRE sur votre site web

> [!IMPORTANT]
> Pour installer PIERRE sur votre site internet, il est indispensable de disposer d'une version fonctionnelle de PIERRE installée sur un VPS.

### Via une fenêtre modale

Le bouton launcher est **vôtre** (HTML + CSS). PIERRE injecte automatiquement l'iframe modale — aucune feuille de style sur votre page (hors un effet d'animation à l'apparition de la fenêtre modale).

```html
<script
  crossorigin="anonymous"
  src="https://180.81.82.83/assets/dist/js/pierre.js"
  data-pierre-config="default"
  async
></script>

<button
  type="button"
  data-pierre-open
  style="position:fixed; bottom:20px; right:20px; z-index:9999;"
>
  iA?
</button>
```

avec :

- `src` : URL absolue du serveur PIERRE (`/assets/dist/js/pierre.js`)
- `data-pierre-config` : `default` ou nom du répertoire dans `./customization/chatbots` si l'on souhaite afficher un différent profil.
- `data-pierre-open` : marque le bouton qui ouvre la modale (obligatoire)
- `style` sur le bouton : entièrement libre et à votre main

### Via une iframe

```html
<iframe
  id="PIERRE"
  title="PIERRE - l'IA de Mouvement HLM"
  style="..."
  width="450"
  height="620"
  src="http://180.81.82.83/?config=default"
>
</iframe>
```

avec :

- `style` : le style CSS de l'iframe (libre à vous de le modifier)
- `src` : l'URL d'accès à PIERRE

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

# Application desktop Windows et macOS (alpha/not-prod-ready)

PIERRE dispose d'une application desktop (Windows et macOS) [téléchargeable ici](https://github.com/charnould/pierre/releases/latest). Un lien de téléchargement est également disponible depuis la page d'accueil de l'interface d'administration.

> [!NOTE]
> **macOS** — Lors du premier lancement, macOS peut afficher un avertissement de sécurité car l'application n'est pas notarisée par Apple. Si vous voyez le message _"pierre est endommagé et ne peut pas être ouvert"_, exécutez la commande suivante dans le Terminal, puis relancez l'application :
>
> ```bash
> sudo xattr -rd com.apple.quarantine /Applications/pierre.app
> ```
>
> Vous pouvez également faire un clic droit sur l'application > **Ouvrir**, puis confirmer dans la boîte de dialogue, ou aller dans **Réglages système > Confidentialité et sécurité** et cliquer sur **Ouvrir quand même**.

> [!NOTE]
> **Windows** — Lors du premier lancement, Windows SmartScreen peut afficher _"Windows a protégé votre ordinateur"_. Cliquer sur **Informations complémentaires**, puis sur **Exécuter quand même**.

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

## Faire héberger PIERRE (le plus simple)

Si vous ne souhaitez pas gérer l'infrastructure, le projet PIERRE propose une **offre d'hébergement managé** :

- Déploiement clé en main sur serveur dédié
- Mises à jour automatiques (dernière version en permanence)
- Suivi et monitoring inclus
- Hébergement chez [Hetzner](https://www.hetzner.com/legal/legal-notice/) (Falkenstein, Allemagne - ISO 27001)
- Aucune compétence technique requise côté bailleur

Adresser un email à charnould@pierre-ia.org pour en savoir plus.

## Héberger PIERRE (self-hosting)

### Faire fonctionner PIERRE en local en 5 minutes

Les instructions ci-après sont valables sous **macOS** et **Windows** (via WSL — [sous-système Windows pour Linux](https://learn.microsoft.com/fr-fr/windows/wsl/install)).

1. Installer `Bun` (≥ `1.3.13`) et vérifier sa bonne installation ([instructions](https://bun.sh/docs/installation)).
2. Installer `SQLite3` et vérifier sa bonne installation ([instructions](https://www.sqlite.org/download.html)).
3. Installer `smol machines` (micro-VM isolées) et vérifier sa bonne installation ([instructions](https://smolmachines.com/)).
4. Forker/cloner le présent dépôt.
5. Lancer `bun install` dans votre terminal pour installer les dépendances.
6. Renommer le fichier `.env.example` en `.env.production` et le compléter.
7. Lancer `bun dev` pour démarrer PIERRE.
8. PIERRE est accessible à http://localhost:3000.

### Déployer pour la première fois PIERRE sur un serveur de production

Pour déployer PIERRE sur un serveur, il est indispensable d'être parvenu à le faire fonctionner en local.

1. Installer `Docker Desktop` et le lancer ([instructions](https://www.docker.com/products/docker-desktop/)). `Docker` gérera la conteneurisation.
2. Lancer `gem install kamal` pour installer `Kamal` (≥`2.11.0`) qui gérera le déploiement ([instructions](https://kamal-deploy.org/docs/installation/)).
3. Disposer d'un VPS et être en capacité de s'y connecter via `ssh` (avec une clef ou mot de passe). Les ports `80` (`http`) et `443` (`https`) doivent impérativement être ouverts.
4. Finaliser les modifications du fichier `.env.production` que vous avez créé précédemment.
5. Saisir dans votre terminal `bun prod:setup`.
6. PIERRE est accessible à l'adresse URL de votre serveur (prévoir quelques minutes pour la génération des certificats SSL).
7. Étapes suivantes (optionnelles et décrites ci-dessous) :  
   – Créer une seconde instance (de tests) de PIERRE sur le même serveur  
   – Personnaliser PIERRE  
   – Afficher PIERRE sur votre site internet, extranet-locataire ou intranet

### Redéployer PIERRE sur un serveur de production

PIERRE — et notamment sa base de connaissances — évolue régulièrement et suit la convention `semver`. Pour le mettre à jour :

1. Saisir `bun pierre:version` pour connaître la dernière version disponible.
2. Consulter les [releases](https://github.com/charnould/pierre/releases) pour connaître les modifications et éventuels _breaking changes_.
3. Mettre à jour votre fork/clone.
4. Saisir `bun pierre:config` pour vous assurer que `config.ts` est correctement paramétré.
5. Saisir `bun prod:deploy` dans votre terminal pour redéployer.

### Déployer et redéployer PIERRE sur un serveur de tests

Pour tester en conditions réelles les mises à jour et nouveautés de PIERRE, le plus simple est de **déployer une seconde instance** de PIERRE sur votre serveur de production.

1. Dupliquer `.env.production` en `.env.staging` et le modifier (a priori uniquement `SERVICE` et `HOST`).
2. Lancer `bun staging:setup` pour déployer la première fois.
3. Lancer `bun staging:deploy` pour redéployer.

# Modifier et paramétrer PIERRE (self-hosting)

> [!NOTE]
> Dans les instructions ci-dessous, nous considérons un bailleur social fictif nommé `Pierre Habitat` dont le site institutionnel est accessible à `pierre-habitat.fr` et qui a déployé sa propre version de PIERRE à l'adresse/IP `180.81.82.83`.
