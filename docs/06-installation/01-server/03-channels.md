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

## RCS (+ SMS)

### Prestataire

L'envoi et la réception de `RCS`/`SMS` et `email` sont proposés via `CM.com`. `CM.com` est un acteur européen majeur du messaging et de la communication conversationnelle (SMS, RCS, email…). Société néerlandaise cotée, elle a réalisé 259 M€ de chiffre d’affaires en 2025, avec une activité répartie en Europe, en Asie-Pacifique et aux Amériques.

### Définitions

Le **SMS** (Short Message Service) est le message texte classique, disponible sur tous les téléphones.

Le **RCS** (Rich Communication Services) en est le successeur. Le locataire lit le message dans l’application de messagerie déjà installée (Messages sur iPhone, Google Messages ou Samsung Messages sur Android), sans nouvelle application. Le RCS permet des messages plus longs, des boutons, des sélections, des accusés de lecture et des pièces jointes.

> TODO: mettre des capture d'écran exemple de RCS

PIERRE tente d’abord le RCS. Si l’envoi échoue immédiatement ou si `CM.com` signale ensuite un échec de livraison (imcompatibilité du téléphone contacté), PIERRE lance automatiquement une tentative par SMS.

### Compatibilité

Les clients `CM.com` constatent plus de 85 % de compatibilité RCS en France (août 2026).

- **Android** — Le RCS est activé par défaut sur la plupart des téléphones récents dès que l’app SMS par défaut est Google Messages (cas le plus courant en France) ou Samsung Messages. Un Android sans RCS peut recevoir le SMS de secours.

- **iPhone** — En principe, le RCS est activé par défaut à partir d’iOS 18. Les iPhone plus anciens peuvent recevoir le SMS de secours.

### Paramétrage

##### 1. Ouvrir les canaux chez `CM.com`

Contacter votre chargé d’affaires `CM.com` pour ouvrir un canal **RCS** et un canal **SMS** de fallback, via `Time2Chat`. Pour ce faire, prendre attache auprès de `xxx@cm.com` et indiquer vouloir ouvrir les services nécessaires au projet `Pierre` porté par Charles-Henri Arnould/BECKREL SAS. (Ne pas hésiter à mettre charnould@pierre-ia.org en copie.)

#### 2. Paramétrer PIERRE et `CM.com`

Compléter `.env` (voir `.env.example`) :

| Variable            | Valeur                                                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `CM_PRODUCT_TOKEN`  | Product token UUID (avec tirets), dans _Channels → API Access and Settings → Authentication → Product Tokens_. Ce n’est ni l’Account ID, ni l’API Key. |
| `CM_FROM`           | Nom d’expéditeur RCS, identique à celui de l’agent enregistré chez `CM.com` (souvent 11 caractères alphanumériques au plus).                           |
| `CM_WEBHOOK_SECRET` | Secret partagé. Le coller dans `.env` et dans la console `CM.com` (étape suivante).                                                                    |

Générer `CM_WEBHOOK_SECRET` avec :

```bash
openssl rand -hex 16
```

#### 3. Brancher les webhooks

Sur votre interface d'administration sur `CM.com`, dans _Channels → API Access and Settings → Delivery Status Report_ :

1. Activer _Enable Delivery Status Reports_.
2. Saisir :

| Champ         | Valeur                                                                   |
| ------------- | ------------------------------------------------------------------------ |
| HTTP endpoint | `{HOST}/webhook/rcs` — ex. `https://assistant.pierre-ia.org/webhook/rcs` |
| HTTP method   | `POST`                                                                   |
| Encoding      | `json`                                                                   |
| HTTP Header   | clé `Webhook-Secret`, valeur = `CM_WEBHOOK_SECRET`.                      |

Transmettre **cette même URL** à votre chargé d’affaires `CM.com` pour la réception des messages locataires.

> [!IMPORTANT]
> Sans le header `Webhook-Secret`, PIERRE répond `401`. Le secret ne doit figurer nulle part hors des fichiers `.env` et de la console `CM.com`.

### Coûts et charge de travail

Ordres de grandeur, à confirmer avec `CM.com` lors de vos échanges.

| Canal | Paramétrage       | Usage                               | Temps DSI |
| ----- | ----------------- | ----------------------------------- | --------- |
| RCS   | ~500 € (une fois) | à l’unité (message ou conversation) | ~2 h      |
| SMS   | inclus            | ~20 € / mois + à l’unité            | ~1 h      |

## Email

Même prestataire. L’endpoint `{HOST}/webhook/email` est réservé (même header `Webhook-Secret`).

Souscrire à l'API à la consommation

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
