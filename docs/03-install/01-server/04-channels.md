# Canaux de communication

## RCS et SMS

Le **SMS** (Short Message Service) est le message texte classique : 160 caractères, disponible sur tous les téléphones.

Le **RCS** (Rich Communication Services) en est le successeur. Le locataire lit le message dans l’application de messagerie déjà installée (Messages sur iPhone, Google Messages ou Samsung Messages sur Android), sans nouvelle application. Le RCS permet des messages plus longs, des boutons, des sélections, des accusés de lecture et des pièces jointes.

PIERRE adresse les locataires et candidats par RCS, avec repli automatique en SMS si le téléphone n’est pas compatible, via [`CM.com`](https://www.cm.com/). Sans ces canaux, les relances et accusés restent manuels.

### Compatibilité

Les clients `CM.com` constatent plus de 85 % de compatibilité RCS en France (août 2026).

- **Android** — Le RCS est activé par défaut sur la plupart des téléphones récents dès que l’app SMS par défaut est Google Messages (cas le plus courant en France) ou Samsung Messages. Un Android sans RCS (app tierce, RCS coupé, téléphone ancien) reçoit un SMS.

- **iPhone** — En principe, le RCS est activé par défaut à partir d’iOS 18. Les iPhone plus anciens reçoivent un SMS.

### 1. Ouvrir les canaux chez `CM.com`

Contacter votre chargé d’affaires `CM.com` pour ouvrir un canal **RCS** et un canal **SMS** de fallback, via `Time2Chat`.

### 2. Paramétrer PIERRE et `CM.com`

Compléter `.env.production` et `.env.staging` (voir `.env.example`) :

| Variable            | Valeur                                                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `CM_PRODUCT_TOKEN`  | Product token UUID (avec tirets), dans _Channels → API Access and Settings → Authentication → Product Tokens_. Ce n’est ni l’Account ID, ni l’API Key. |
| `CM_FROM`           | Nom d’expéditeur RCS, identique à celui de l’agent enregistré chez `CM.com` (souvent 11 caractères alphanumériques au plus).                           |
| `CM_WEBHOOK_SECRET` | Secret partagé. Le coller dans les deux fichiers `.env` et dans la console `CM.com` (étape suivante).                                                  |

Le générer avec :

```bash
openssl rand -hex 16
```

### 3. Brancher les webhooks

RCS et SMS partagent **un seul** endpoint. Il n’existe pas de `/webhook/sms`.

La même URL sert aux accusés de réception (_Delivery Status Reports_) et aux messages entrants.

Dans _Channels → API Access and Settings → Delivery Status Report_ :

1. Activer _Enable Delivery Status Reports_.
2. Saisir :

| Champ         | Valeur                                                                   |
| ------------- | ------------------------------------------------------------------------ |
| HTTP endpoint | `{HOST}/webhook/rcs` — ex. `https://assistant.pierre-ia.org/webhook/rcs` |
| HTTP method   | `POST`                                                                   |
| Encoding      | `json`                                                                   |
| HTTP Header   | clé `Webhook-Secret`, valeur = `CM_WEBHOOK_SECRET`                       |

Transmettre **cette même URL** à votre chargé d’affaires `CM.com` pour la réception des messages locataires.

> [!IMPORTANT]
> Sans le header `Webhook-Secret`, PIERRE répond `401`. Le secret ne doit figurer nulle part hors des fichiers `.env` et de la console `CM.com`.

### 4. Coûts et temps DSI

Ordres de grandeur, à confirmer avec `CM.com`.

| Canal | Paramétrage       | Usage                               | Temps DSI |
| ----- | ----------------- | ----------------------------------- | --------- |
| RCS   | ~500 € (une fois) | à l’unité (message ou conversation) | ~2 h      |
| SMS   | inclus            | ~20 € / mois + à l’unité            | ~1 h      |

## E-mail transactionnel

Même prestataire. L’endpoint `{HOST}/webhook/email` est réservé (même header `Webhook-Secret`).

L’envoi `CM.com` n’est pas encore raccordé : **ne pas configurer ce webhook** côté `CM.com` pour l’instant. Tarifs à confirmer.

## Signature, courrier, LRAR et LRE

Ces canaux seront documentés ici lorsqu’ils seront raccordés.
