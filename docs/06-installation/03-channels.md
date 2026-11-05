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

### Prestataire

L'envoi et la réception de `RCS`/`SMS` et `email` sont proposés via `CM.com`.

`CM.com` est un acteur européen majeur du messaging et de la communication conversationnelle (SMS, RCS, email…). Société néerlandaise cotée, elle a réalisé 259 M€ de chiffre d’affaires en 2025, avec une activité répartie en Europe, en Asie-Pacifique et aux Amériques.

### Définitions

L'**email** est ....

Le **RCS** (Rich Communication Services) en est le successeur. Le locataire lit le message dans l’application de messagerie déjà installée (Messages sur iPhone, Google Messages ou Samsung Messages sur Android), sans nouvelle application. Le RCS permet des messages plus longs, des boutons, des sélections, des accusés de lecture et des pièces jointes.

Le **SMS** (Short Message Service) est le message texte classique, disponible sur tous les téléphones.

PIERRE tente d’abord le RCS. Si l’envoi échoue immédiatement ou si `CM.com` signale ensuite un échec de livraison (imcompatibilité du téléphone contacté), PIERRE lance automatiquement une tentative par SMS.

> Dire dans la doc qu'il faut indiquer qu'on ne peut pas répondre au SMS (mono-directionnel)

### Compatibilité

Les clients `CM.com` constatent plus de 85 % de compatibilité RCS en France (août 2026).

- **Android** — Le RCS est activé par défaut sur la plupart des téléphones récents dès que l’app SMS par défaut est Google Messages (cas le plus courant en France) ou Samsung Messages. Un Android sans RCS peut recevoir le SMS de secours.

- **iPhone** — En principe, le RCS est activé par défaut à partir d’iOS 18. Les iPhone plus anciens peuvent recevoir le SMS de secours.

Les tarifs et le temps DSI sont dans [Les coûts](./03-costs.md).

### Paramétrage

#### 1. Ouvrir les canaux chez `CM.com`

Contacter **Elodia Esteve (Partner manager — `elodia.esteve@cm.com`)** et indiquer vouloir ouvrir les services nécessaires au projet `BECKREL/PIERRE` pour ouvrir un canal **RCS (+ fallback SMS)** et un canal **email transactionnel** .

Indiquer également :

- Les SMS doivent être en notification sans le STOP. En effet, par défaut, `CM.com` ajoute une mention de type "STOP 00xxxxxxxxxxx" à la fin des SMS ; il est néanmoins possible de retirer cette mention.
- Messages entrants RCS : l'url vers https://assistant.pierre-ia.org/webhook/rcs toujours en POST.

Ne pas hésiter à mettre [charnould@pierre-ia.org](mailto:charnould@pierre-ia.org) en copie.

#### 2. Paramétrer PIERRE et `CM.com`

Dans le bureau, `Administration` → `Prestataires`. L’écran donne les adresses à recopier chez CM.com, et le secret RCS une seule fois.

#### 3. Brancher les webhooks

Sur votre interface d'administration sur `CM.com`, dans Canaux_Channels → API Access and Settings → Business Messaging settings → Delivery Status Report_ :

1. Activer _Enable Delivery Status Reports_.
2. Saisir :

| Champ         | Valeur                                                                           |
| ------------- | -------------------------------------------------------------------------------- |
| HTTP endpoint | `{HOST}/webhook/rcs` — ex. `https://gx.pierre-ia.org/webhook/rcs`                |
| HTTP method   | `POST`                                                                           |
| Encoding      | `json`                                                                           |
| HTTP Header   | clé `Webhook-Secret`, valeur = le secret affiché une fois par PIERRE via le CLI. |

### Paramétrages des emails

Dans l’app Email Gateway de CM.com :

1. Ajouter le domaine d’envoi, par exemple `dribble.football`. Publier les différents CNAME d’envoi.
2. Activer la réception et publier le MX vers `mx.email.cm.com`. Ce MX reçoit tout le courrier du domaine.
3. Activer le suivi d’ouverture. Le suivi des clics reste désactivé.
4. Dans Paramètre de l'email → Integration, copier le Product Token (jeton de produit), l’identifiant de compte (ID de compte), et copier le Webhook Secret.
5. Dans Paramètre de l'email → webhooks, enregistrer l’adresse `Webhook email` affichée par PIERRE comme webhook d’événements et, si le champ est distinct, comme webhook de réception.
6. Dans le bureau, `Administration` → `Prestataires`, enregistrer le domaine, le jeton, l’identifiant de compte et le secret du webhook.

Dans le JSON des réclamations, `email_from` doit être une adresse de ce domaine. Dans le JSON des impayés, c’est `senderEmail`, par exemple `loyer@dribble.football`. Les réponses suivent cette adresse. Les bounces restent gérés par CM.com et arrivent par le webhook.

## Courrier postal et électronique

### Prestataire

Le courrier postal simple, `LRAR`, `LRE AR24` et `ERE` sont proposés via le Groupe `La Poste`. `La Poste` (et ses filiales à 100 % `Docaposte` et `Maileva`) constitue un acteur français de tout autre dimension. `Docaposte` compte 6 500 collaborateurs, plus de 50 000 clients, 61 sites en France et 878 M€ de chiffre d’affaires en 2025. `Maileva`, sa plateforme d’échanges documentaires, représente à elle seule 62,6 M€ de CA en 2024 et s’appuie notamment sur des infrastructures et données hébergées en France.

### Définitions

### Paramétrage

##### 1. Ouvrir les canaux chez `La Poste`

Prendre attache auprès de `alexis.chiariglione@docaposte.fr` et indiquer vouloir ouvrir les services nécessaires au projet `Pierre` porté par Charles-Henri Arnould/BECKREL SAS. (Ne pas hésiter à mettre `charnould@pierre-ia.org` en copie.)

##### 2. Paramétrer PIERRE

Dans le bureau, `Administration` → `Prestataires` → `Courrier (via La Poste)`.

Renseigner l’identifiant client, le secret, l’utilisateur et le mot de passe Maileva. Un utilisateur `sandbox.*` utilise automatiquement la sandbox. Un utilisateur réel utilise automatiquement la production : il suffit de remplacer les identifiants.

L’adresse expéditeur sert au courrier simple et au LRAR. L’identifiant d’expéditeur électronique et la clé TOTP servent à l’ERE et à la LRE. Pierre conserve la clé TOTP chiffrée et génère les codes à usage unique. Tous les envois LRE partent sous cet expéditeur commun ; l’historique conserve l’utilisateur Pierre qui a déclenché l’envoi.

Une LRE vers un particulier exige la référence d’une preuve de consentement déjà recueillie. Maileva a confirmé par écrit que la clé TOTP peut rester chiffrée sur le serveur, que Pierre génère les codes, et qu’un seul expéditeur électronique couvre l’organisme.

Pierre interroge Maileva toutes les 6 minutes.

### Disclaimer

En contactant les chargés d'affaire `La Poste`, vous faites deux choses :

- accélérer l'ouverture des services car le référent sait parfaitement de quoi il retourne
- faire de Pierre un apporteur d'affaire permettant de financer - sans impact pour vous - le projet Pierre. Merci de votre soutien !

## Signature électronique

### Prestataire

Le courrier postal simple, `LRAR`, `LRE AR24` et `ERE` sont proposés via le Groupe `La Poste`. `La Poste` (et ses filiales à 100 % `Docaposte` et `Maileva`) constitue un acteur français de tout autre dimension. `Docaposte` compte 6 500 collaborateurs, plus de 50 000 clients, 61 sites en France et 878 M€ de chiffre d’affaires en 2025. `Maileva`, sa plateforme d’échanges documentaires, représente à elle seule 62,6 M€ de CA en 2024 et s’appuie notamment sur des infrastructures et données hébergées en France.
