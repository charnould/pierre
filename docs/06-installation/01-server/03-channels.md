# Canaux de communication

## Introduction

Pierre propose nativement l'ensemble des canaux de communication nécessaire aux bailleurs sociaux pour exercer leurs métiers et ouvre des perspectives encore inexplorées :

- `RCS` (avec un repli automatique sur le `SMS`)
- `email` (transactionnel ou marketing)
- `courrier` (lettre postal simple)
- `LRAR` - Lettre postale recommandée avec accusé de réception
- `LRE AR24` - Lettre recommandée électronique, strict équivalent juridique du `LRAR`
- `ERE` - Envoi Recommandé Electronique simple
  - Consentement du destinataire : non obligatoire
  - Identification de l’expéditeur et du destinataire : non
  - Anonymat de l’expéditeur : oui
  - Accusé de réception : le destinataire a 15 jours pour accuser réception
  - Preuves : preuve de dépôt, d’envoi, de réception, de refus, de négligence et de non distribution.

> TODO: mettre toutes les noems Eidas & cie respectés et applicable pour prouver la souveraineté.

## RCS (+ fallback SMS) + Email transactionnel

CM.COM - RCS + SMS + Email transactionnel
https://developers.cm.com/messaging/docs/rcs-text-message
https://developers.cm.com/messaging/docs/rcs-media-message
https://developers.cm.com/messaging/docs/rcs-suggested-replies-messages
https://developers.cm.com/messaging/docs/rcs-rich-card-messages
https://developers.cm.com/messaging/docs/rcs-carousel-messages

### Prestataire

L'envoi et la réception de `RCS`/`SMS` et `email` sont proposés via `CM.com`.

`CM.com` est un acteur européen majeur du messaging et de la communication conversationnelle (SMS, RCS, email…). Société néerlandaise cotée, elle a réalisé 259 M€ de chiffre d’affaires en 2025, avec une activité répartie en Europe, en Asie-Pacifique et aux Amériques.

### Définitions

L'**email** est ....

Le **RCS** (Rich Communication Services) en est le successeur. Le locataire lit le message dans l’application de messagerie déjà installée (Messages sur iPhone, Google Messages ou Samsung Messages sur Android), sans nouvelle application. Le RCS permet des messages plus longs, des boutons, des sélections, des accusés de lecture et des pièces jointes.

Le **SMS** (Short Message Service) est le message texte classique, disponible sur tous les téléphones.

PIERRE tente d’abord le RCS. Si l’envoi échoue immédiatement ou si `CM.com` signale ensuite un échec de livraison (imcompatibilité du téléphone contacté), PIERRE lance automatiquement une tentative par SMS.

### Compatibilité

Les clients `CM.com` constatent plus de 85 % de compatibilité RCS en France (août 2026).

- **Android** — Le RCS est activé par défaut sur la plupart des téléphones récents dès que l’app SMS par défaut est Google Messages (cas le plus courant en France) ou Samsung Messages. Un Android sans RCS peut recevoir le SMS de secours.

- **iPhone** — En principe, le RCS est activé par défaut à partir d’iOS 18. Les iPhone plus anciens peuvent recevoir le SMS de secours.

### Coûts et charge de travail

Ordres de grandeur, à confirmer avec `CM.com` lors de vos échanges.

| Canal | Paramétrage       | Usage                                 | Temps DSI |
| ----- | ----------------- | ------------------------------------- | --------- |
| RCS   | ~500 € (une fois) | à l’unité (message ou conversation)   | ~2 h      |
| SMS   | inclus            | à l’unité (160 caractères)            | n/a       |
| EMAIL | inclus            | à partir de 50€/mois pour 100K emails | 1h        |

### Paramétrage

#### 1. Ouvrir les canaux chez `CM.com`

Contacter **Elodia Esteve (Partner manager — `elodia.esteve@cm.com`)** et indiquer vouloir ouvrir les services nécessaires au projet `BECKREL/PIERRE` pour ouvrir un canal **RCS (+ fallback SMS)** et un canal **email transactionnel** .

Indiquer également :

- Les SMS doivent être en notification sans le STOP. En effet, par défaut, `CM.com` ajoute une mention de type "STOP 00xxxxxxxxxxx" à la fin des SMS ; il est néanmoins possible de retirer cette mention.
- Messages entrants RCS : l'url vers https://assistant.pierre-ia.org/webhook/rcs toujours en POST.

Ne pas hésiter à mettre [charnould@pierre-ia.org](mailto:charnould@pierre-ia.org) en copie.

#### 2. Paramétrer PIERRE et `CM.com`

| Variable                  | Valeur                                                                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `CM_RCS_PRODUCT_TOKEN`    | Product token UUID (avec tirets), dans _Channels → API Access and Settings → Authentication → Product Tokens_. Ce n’est ni l’Account ID, ni l’API Key. |
| `CM_RCS_FROM`             | Nom d’expéditeur RCS, identique à celui de l’agent enregistré chez `CM.com` (souvent 11 caractères alphanumériques au plus).                           |
| `CM_RCS_WEBHOOK_SECRET`   | Secret partagé, créé avec `openssl rand -hex 32`, puis recopié dans CM.com.                                                                            |
| `CM_EMAIL_PRODUCT_TOKEN`  | Product token UUID de l’Email Gateway, dans _Settings → Integration_.                                                                                  |
| `CM_EMAIL_WEBHOOK_SECRET` | Secret webhook copié depuis CM.com, _Settings → Integration_. Il n’est pas généré par PIERRE.                                                          |

`AUTH_PASSWORD`, `AUTH_SECRET`, `AUTH_BEARER` et `CM_RCS_WEBHOOK_SECRET` se préparent avec la même commande, lancée séparément pour chaque valeur :

```bash
openssl rand -hex 32
```

Sur un serveur déjà installé, exporter le bloc actuel, modifier les trois lignes CM puis le réappliquer :

```bash
pierre env > pierre.env
# Modifier les variables CM_RCS_* et CM_EMAIL_*
pierre configure < pierre.env
rm -f pierre.env
```

Les douze variables doivent rester présentes. Pour désactiver un canal, vider tout son groupe. Pour changer le secret webhook RCS, générer une nouvelle valeur avec `openssl rand -hex 32`, puis la recopier dans CM.com.

PIERRE redémarre automatiquement après validation. Si la nouvelle configuration ne fonctionne pas, les valeurs précédentes sont restaurées.

#### 3. Brancher les webhooks

Sur votre interface d'administration sur `CM.com`, dans _Channels → API Access and Settings → Delivery Status Report_ :

1. Activer _Enable Delivery Status Reports_.
2. Saisir :

| Champ         | Valeur                                                            |
| ------------- | ----------------------------------------------------------------- |
| HTTP endpoint | `{HOST}/webhook/rcs` — ex. `https://gx.pierre-ia.org/webhook/rcs` |
| HTTP method   | `POST`                                                            |
| Encoding      | `json`                                                            |
| HTTP Header   | clé `Webhook-Secret`, valeur = `CM_RCS_WEBHOOK_SECRET`.           |

Dans _Channels_, profil RCS, section _Incoming messages_, enregistrer `{HOST}/webhook/rcs?webhook_secret={CM_RCS_WEBHOOK_SECRET}`. Cette console n’accepte pas de header : le secret est le paramètre `webhook_secret`.

> [!IMPORTANT]
> Sans le header `Webhook-Secret` ou le paramètre `webhook_secret`, PIERRE répond `401`. Le secret ne doit figurer nulle part hors des fichiers `.env` et de la console `CM.com`.

### Paramétrages des emails (15 minutes)

1. Se rendre sur `https://app.eu.mailgun.com/mg/sending/domains`.
2. Cliquez sur `Add new Domain`.
3. Dans `Domain name`, inscrire votre domaine _avec impérativement un sous-domaine_
   (ex : `mail.actionlogemenet.fr`).
4. S'assurer que la région est bien `EU`.
5. Dans `Advanced Settings`, sélectionner `Use automatic sender security`
6. Cliquer sur le bouton `Add Domain`
7. Se rendre sur `https://app.eu.mailgun.com/settings/api_security`, créer une `Mailgun API keys` (conserver la clef générée) et récupérer la `HTTP webhook signing key`
8. Se connecter à votre registrar et renseigner l'intégralité des DNS (Sending records, Receiving records, Tracking records, Authentication records).
9. Dans le JSON du module (`tickets` ou `repayment`), renseigner `email_from`, par exemple `loyer@mail.dribble.football`.

## Courrier postal et électronique

### Prestataire

Le courrier postal simple, `LRAR`, `LRE AR24` et `ERE` sont proposés via le Groupe `La Poste`. `La Poste` (et ses filiales à 100 % `Docaposte` et `Maileva`) constitue un acteur français de tout autre dimension. `Docaposte` compte 6 500 collaborateurs, plus de 50 000 clients, 61 sites en France et 878 M€ de chiffre d’affaires en 2025. `Maileva`, sa plateforme d’échanges documentaires, représente à elle seule 62,6 M€ de CA en 2024 et s’appuie notamment sur des infrastructures et données hébergées en France.

### Définitions

### Paramétrage

##### 1. Ouvrir les canaux chez `La Poste`

Prendre attache auprès de `alexis.chiariglione@docaposte.fr` et indiquer vouloir ouvrir les services nécessaires au projet `Pierre` porté par Charles-Henri Arnould/BECKREL SAS. (Ne pas hésiter à mettre `charnould@pierre-ia.org` en copie.)

### Disclaimer

En contactant les chargés d'affaire `La Poste`, vous faites deux choses :

- accélérer l'ouverture des services car le référent sait parfaitement de quoi il retourne
- faire de Pierre un apporteur d'affaire permettant de financer - sans impact pour vous - le projet Pierre. Merci de votre soutien !

## Signature électronique

### Prestataire

Le courrier postal simple, `LRAR`, `LRE AR24` et `ERE` sont proposés via le Groupe `La Poste`. `La Poste` (et ses filiales à 100 % `Docaposte` et `Maileva`) constitue un acteur français de tout autre dimension. `Docaposte` compte 6 500 collaborateurs, plus de 50 000 clients, 61 sites en France et 878 M€ de chiffre d’affaires en 2025. `Maileva`, sa plateforme d’échanges documentaires, représente à elle seule 62,6 M€ de CA en 2024 et s’appuie notamment sur des infrastructures et données hébergées en France.
