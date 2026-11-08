# Administration · Prestataires

L’écran `Prestataires` règle le nom de l’organisme, son fuseau, le modèle qui répond, et les canaux RCS et email. Une valeur enregistrée affiche une coche. Un secret enregistré affiche un masque, jamais la clé.

Le domaine public et les secrets `AUTH_SECRET`, `AUTH_BEARER` et `AUTH_PASSWORD` ne sont pas ici. Sur un serveur, `pierre install` les écrit et `pierre env` les affiche. Sur un Mac, `bun server:env` fait la même chose dans `server/datastores/pierre.env`.

## Sommaire

<!-- toc maxdepth:3 -->

- [À quoi ça sert](#à-quoi-ça-sert)
- [Qui peut y accéder](#qui-peut-y-accéder)
- [Lire l’écran](#lire-lécran)
- [Organisme](#organisme)
- [Langage](#langage)
- [Canaux](#canaux)
- [Si quelque chose ne va pas](#si-quelque-chose-ne-va-pas)

<!-- tocstop -->

## À quoi ça sert

1. Nommer l’organisme et choisir le fuseau de l’instance.
2. Indiquer le type du modèle de langage, son adresse, sa clé, le modèle et l’effort.
3. Donner à CM.com les adresses de webhook, et enregistrer les jetons qu’il remet.

## Qui peut y accéder

Tout administrateur. Le changement envoie les conversations et les messages des locataires chez le prestataire indiqué.

## Lire l’écran

Quatre cartes : `Organisme`, `Langage`, `RCS`, `Email`. Un seul `Enregistrer`, en bas à gauche. L’état à côté dit si quelque chose reste à enregistrer.

Une case de secret reste vide, avec une coche quand le secret est déjà là. Laisser ce champ vide conserve le secret. `Enregistré` ne le réaffiche pas.

## Organisme

Le nom est celui des emails et de l’installation. Le fuseau est un identifiant IANA, `Europe/Paris` pour la métropole. Il s’applique à toute l’instance.

## Langage

Le type est `Anthropic`, `OpenAI` ou `OpenAI-compatible`. Changer de type remplit l’adresse : `https://api.anthropic.com`, `https://api.openai.com/v1`, ou une adresse vide pour OpenAI-compatible, par exemple `https://api.mistral.ai/v1`. On peut la remplacer.

Le modèle et l’effort sont du texte libre. Les champs vides proposent `claude-sonnet-5-5` et `medium`. D’autres exemples : `gpt-5.5`, `mistral-small-latest`. Les grilles de prix : [Anthropic](https://platform.claude.com/docs/en/about-claude/pricing), [OpenAI](https://developers.openai.com/api/docs/pricing), [Mistral](https://docs.mistral.ai/inference/pricing).

Collez la clé du modèle de langage, puis `Enregistrer`. PIERRE interroge l’adresse avant d’écrire. Une clé refusée ne remplace pas la précédente. Changer de type ou d’adresse demande de recoller la clé. Laisser la case vide conserve la clé déjà enregistrée.

Un tour déjà en cours se termine avec l’ancienne clé et l’ancien modèle. Les sessions ouvertes sont ensuite recyclées : la question suivante utilise immédiatement le nouveau réglage et repart sans le contexte gardé en mémoire par l’ancien modèle. L’historique visible de la conversation reste conservé. Une clé de voix, le jour où elle existe, sera une autre carte.

## Canaux

Copiez `Webhook RCS` et `Webhook email` dans CM.com.

RCS : le nom d’expéditeur, le jeton produit CM.com, le webhook, puis le secret à recopier dans CM.com. Le secret reste affiché. `Nouveau secret`, sur la carte, en produit un autre. Laisser le jeton vide conserve celui déjà enregistré.

Email : le domaine d’envoi, l’identifiant de compte CM.com, un UUID, le webhook, le jeton produit, puis le secret du webhook fourni par CM.com. Cette adresse se nomme `email_from` dans les réclamations et `senderEmail` dans les impayés. Laisser le jeton ou le secret vide conserve celui déjà enregistré.

Le gabarit HTML et le logo de l’organisme sont sur la même carte. Ne pas retirer `{{ logo_inline_cid }}` ni `{{ message }}`. Le logo est un PNG transparent, déposé tout de suite. `Enregistrer` écrit le gabarit. `Email de test`, en bas de la carte, envoie le gabarit et le logo enregistrés. `Envoyer` s’active quand le gabarit contient ces deux champs et que le logo est enregistré.

## Si quelque chose ne va pas

| Message                                                           | Suite                                                       |
| ----------------------------------------------------------------- | ----------------------------------------------------------- |
| `La clé a été refusée.`                                           | Vérifiez la clé auprès du prestataire. Rien n’a été changé. |
| `Le prestataire est injoignable.`                                 | Vérifiez l’adresse. Rien n’a été changé.                    |
| `Le modèle est obligatoire.` ou `L’effort est obligatoire.`       | Écrivez le modèle et l’effort, puis enregistrez de nouveau. |
| `Le RCS exige le jeton et le nom d’expéditeur.`                   | Les deux champs, puis enregistrez de nouveau.               |
| `L’email exige le domaine, le jeton, l’identifiant et le secret.` | Les quatre champs, puis enregistrez de nouveau.             |
| `fuseau IANA requis.`                                             | Écrivez un fuseau comme `Europe/Paris`.                     |
