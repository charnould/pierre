# Administration · Prestataires

L’écran `Prestataires` relie PIERRE au contrat d’intelligence et aux canaux RCS et email. Il ne montre jamais une clé déjà enregistrée.

Cette page décrit uniquement `Administration` → `Prestataires`. Le domaine public et le premier mot de passe se règlent à l’installation, pas ici.

## Sommaire

<!-- toc maxdepth:3 -->

- [À quoi ça sert](#à-quoi-ça-sert)
- [Qui peut y accéder](#qui-peut-y-accéder)
- [Lire l’écran](#lire-lécran)
- [Intelligence](#intelligence)
- [Canaux](#canaux)
- [Si quelque chose ne va pas](#si-quelque-chose-ne-va-pas)

<!-- tocstop -->

## À quoi ça sert

1. Indiquer le prestataire qui répond aux conversations, et sa clé.
2. Donner à CM.com les adresses de webhook, et enregistrer les jetons qu’il vous remet.

## Qui peut y accéder

Tout administrateur. Le changement envoie les conversations et les messages des locataires chez le prestataire indiqué.

## Lire l’écran

Deux rubriques : `Intelligence`, puis `Canaux`.

`Non branchée` ou `Branchée` pour l’intelligence. `Non paramétré` ou `enregistré` pour chaque canal.

Une case de secret reste vide. `Enregistré` ne réaffiche pas la valeur.

## Intelligence

Choisissez `OpenAI`, `Anthropic`, ou `Autre`. Les deux premiers remplissent l’adresse. `Autre` demande le protocole et l’adresse de votre contrat.

Collez la clé, puis `Enregistrer`. PIERRE interroge le prestataire avant d’écrire. Une clé refusée ne remplace pas la précédente.

Une conversation déjà ouverte garde l’ancienne clé jusqu’à sa fin.

## Canaux

Copiez `Webhook RCS` et `Webhook email` dans CM.com.

RCS : le jeton et le nom d’expéditeur, puis `Enregistrer le RCS`. Le premier enregistrement affiche un secret, une seule fois. Recopiez-le dans CM.com. `Nouveau secret` en produit un autre, à recopier à la place de l’ancien.

Email : le domaine, le jeton, l’identifiant de compte et le secret du webhook, ensemble. Dans le paramétrage du module, `email_from` doit être une adresse de ce domaine.

## Si quelque chose ne va pas

| Message                                                           | Suite                                                       |
| ----------------------------------------------------------------- | ----------------------------------------------------------- |
| `La clé a été refusée.`                                           | Vérifiez la clé auprès du prestataire. Rien n’a été changé. |
| `Le prestataire est injoignable.`                                 | Vérifiez l’adresse. Rien n’a été changé.                    |
| `Le RCS exige le jeton et le nom d’expéditeur.`                   | Les deux champs, puis enregistrez de nouveau.               |
| `L’email exige le domaine, le jeton, l’identifiant et le secret.` | Les quatre champs, puis enregistrez de nouveau.             |
