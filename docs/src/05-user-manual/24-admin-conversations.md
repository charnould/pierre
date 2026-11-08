# Administration · Conversations

L’écran `Conversations` sert à relire ce que les personnes ont demandé à un assistant, puis à qualifier la qualité de l’échange pour les administrateurs qui amélioreront ensuite l’encyclopédie ou les consignes.

Cette page décrit uniquement l’écran `Administration` → `Conversations`. La consommation du modèle se lit dans [Administration · Statistiques](./25-admin-statistiques.md).

## Sommaire

<!-- toc maxdepth:3 -->

- [À quoi ça sert](#à-quoi-ça-sert)
- [Qui peut y accéder](#qui-peut-y-accéder)
- [Lire la liste](#lire-la-liste)
- [Ouvrir une conversation](#ouvrir-une-conversation)
- [Qualifier un échange](#qualifier-un-échange)
- [Bonnes pratiques](#bonnes-pratiques)
- [Si quelque chose ne va pas](#si-quelque-chose-ne-va-pas)

<!-- tocstop -->

## À quoi ça sert

1. Retrouver les questions posées aux assistants, par les collaborateurs ou par le public.
2. Juger si la réponse était utile, exacte et claire.
3. Laisser une trace qu’un autre administrateur pourra lire avant de compléter l’encyclopédie ou une consigne.

## Qui peut y accéder

Seuls les comptes **administrateur** voient `Administration`, puis `Conversations`.

## Lire la liste

Chaque ligne montre la première question, la personne ou `Public`, l’assistant, la dernière activité, puis l’état de revue et la note lorsqu’elle existe.

Une conversation sans revue affiche `Non revue`. Les autres états sont `Revue`, `Action requise` et `Résolue`.

La recherche porte sur le texte des messages et sur l’adresse de la personne. Trois filtres suffisent : l’état de revue, le public, et l’assistant. `Afficher la suite` charge les conversations suivantes.

## Ouvrir une conversation

Cliquez une ligne. `Retour` revient à la liste, puis à l’index d’administration.

`Contexte` rappelle qui a parlé, avec quel assistant, et quand. Le fil qui suit reprend les messages tels qu’ils ont été échangés. Il ne montre ni la consommation, ni les actions internes de l’assistant : cela se consulte dans `Statistiques`.

## Qualifier un échange

Dans `Qualification` :

1. Choisissez un statut.
   - `Revue` : l’échange a été lu et ne demande pas de suite.
   - `Action requise` : il faut compléter une connaissance, une consigne ou corriger un comportement.
   - `Résolue` : la suite demandée a été faite.
2. Donnez une appréciation de 1 à 5, ou laissez `Sans note`. 1 indique un échange mal abouti, 5 un échange clair et utile.
3. Cochez les catégories qui décrivent l’anomalie : lacune de connaissance, réponse incorrecte, réponse incomplète, hors sujet, manque de clarté, prompt ambigu, échec d’outil, ou autre.
4. Écrivez un commentaire si un collègue doit comprendre la suite à donner. Les commentaires restent dans l’ordre : un nouveau commentaire s’ajoute, il ne remplace pas les précédents.
5. Cliquez `Enregistrer`.

Reprenez régulièrement le filtre `Action requise`, faites la correction dans l’encyclopédie ou la consigne, puis rouvrez la conversation et passez-la à `Résolue` avec un commentaire de clôture.

## Bonnes pratiques

- Qualifiez d’abord les conversations `Non revue`, puis celles `Action requise`.
- Écrivez le commentaire pour un collègue qui n’a pas lu l’échange : ce qui manque, et où le corriger.
- Ne notez pas un échange seulement parce qu’il est long. Notez s’il a réellement aidé.

## Si quelque chose ne va pas

- `Cette revue a été modifiée par un autre administrateur.` Quelqu’un a enregistré entre-temps. L’écran recharge la revue : relisez-la, puis enregistrez de nouveau.
- `Conversations indisponibles` : choisissez `Réessayer`. Si le message demeure, le serveur n’est pas joignable.
