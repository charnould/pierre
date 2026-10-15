# Administration · Statistiques

L’écran `Statistiques` sert à voir combien le modèle de langage consomme, et à ouvrir le journal d’un traitement lorsque une réponse semble anormale.

Cette page décrit uniquement l’écran `Administration` → `Statistiques`. La relecture et la qualification des échanges se font dans [Administration · Conversations](./24-admin-conversations.md).

## Sommaire

<!-- toc maxdepth:3 -->

- [À quoi ça sert](#à-quoi-ça-sert)
- [Qui peut y accéder](#qui-peut-y-accéder)
- [Lire la consommation](#lire-la-consommation)
- [Lire les graphiques](#lire-les-graphiques)
- [Consulter un traitement](#consulter-un-traitement)
- [Bonnes pratiques](#bonnes-pratiques)
- [Si quelque chose ne va pas](#si-quelque-chose-ne-va-pas)

<!-- tocstop -->

## À quoi ça sert

Un **jeton** est l’unité de consommation du modèle de langage. Plus une réponse demande de lecture, de raisonnement ou d’actions, plus elle consomme de jetons. Cet écran additionne les traitements de trois usages :

- `Conversations` : les échanges avec un assistant ;
- `Générations` : les textes produits depuis les métiers, par exemple une synthèse ;
- `Automatisations` : les rapports lancés automatiquement.

## Qui peut y accéder

Seuls les comptes **administrateur** voient `Administration`, puis `Statistiques`.

## Lire la consommation

Trois nombres restent visibles, quelle que soit la période choisie pour les graphiques :

1. `Jetons consommés ce mois` : ce qui a réellement été mesuré depuis le début du mois.
2. `Estimation fin du mois` : si le rythme observé depuis le premier traitement mesuré du mois continuait jusqu’au dernier jour.
3. `Estimation fin de l’année` : le même calcul, jusqu’au 31 décembre.

Ce n’est pas une prévision savante. C’est une règle de trois. La phrase sous chaque estimation indique la date du premier traitement pris en compte. `Non mesuré` signifie qu’aucun traitement de la période n’a encore fourni de consommation, ou que la mesure a échoué : ce n’est pas un zéro.

Le sélecteur de période (`7 jours`, `30 jours`, `Mois en cours`, `Année en cours`) change seulement les graphiques et le journal.

## Lire les graphiques

`Consommation quotidienne` montre les jetons de chaque jour de la période choisie.

`Consommation par usage` répartit ces jetons entre Conversations, Générations et Automatisations.

## Consulter un traitement

Le `Journal des traitements` liste, du plus récent au plus ancien : la date, l’usage, le modèle, le niveau de réflexion, l’état, les jetons, le nombre d’actions et la durée.

`Consulter` ouvre le traitement choisi.

- Le résumé rappelle le contexte mesuré.
- `Modèle effectif` indique le modèle réellement annoncé par le prestataire ; il peut différer du modèle demandé lorsqu’un prestataire applique un fallback.
- `Récupérations automatiques` apparaît lorsque PIERRE a dû réessayer un appel ou compacter une conversation trop longue. Le traitement peut malgré tout être `Réussi`.
- `Raisonnement du modèle` montre le raisonnement conservé pour comprendre une anomalie.
- `Actions de l’assistant` montre chaque action, sa durée, son état, puis les informations qu’elle a reçues et renvoyées.

Ces détails peuvent contenir des données métier. Ils restent sur le serveur de l’organisme et ne sont visibles que des administrateurs.

Les états sont `Réussi`, `Échec`, `Interrompu` et `Délai dépassé`.

## Bonnes pratiques

- Regardez d’abord l’estimation de fin de mois pour savoir si la consommation accélère.
- Si une conversation a été marquée `Action requise`, ouvrez ensuite le journal du même moment pour voir le raisonnement et les actions.
- Un pic dans `Générations` ou `Automatisations` correspond souvent à un rapport ou à une synthèse, pas à une question d’un collaborateur.

## Si quelque chose ne va pas

- `Non mesuré` sur une estimation : attendez qu’au moins un traitement ait abouti avec une consommation connue.
- `Statistiques indisponibles` : choisissez `Réessayer`.
- Un traitement `Échec` ou `Délai dépassé` sans réponse utile se comprend dans `Raisonnement du modèle` et `Actions de l’assistant`.
