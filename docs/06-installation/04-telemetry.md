# Télémétrie

## Pourquoi ?

PIERRE enregistre un ping d’usage à chaque action métier pour **améliorer le produit** : voir quelles fonctions servent vraiment, lesquelles jamais, et où concentrer les développements.

Plus tard, ces pings pourront alimenter :

- un _pulse local_ dans l’application desktop (cette instance) pour matérialiser l'activité des équipes ;
- un _pulse national_ (toutes les instances de PIERRE en fonctionnement).

## Que contient le ping ?

Chaque ping transporté contient uniquement :

- `host` — le hostname de l’instance, déduit de `HOST` (une URL est réduite au hostname)
- `event` — le nom de l’action

Les événements sont (à titre d'exemple) :

- `ai.chat` — une réponse de chat a été produite
- `ai.answer.<id_skill>` — une génération de workflow a réussi (ex. `ai.answer.ticket.answer-ticket`)
- le `type` de chaque ligne ajoutée au journal `activites` (`note.published`, `communication.sent`, `task.completed`, `bulk.ran`…)

## Que ne contient PAS le ping ?

Aucune donnée personnelle, aucun contenu. Pas d’email, pas de nom, pas d’identifiant de dossier, pas de message, pas de pièce jointe, pas de prompt, pas de réponse du modèle.

C’est uniquement un compteur anonyme : _quoi_ et _quand_, à l’échelle d’une instance.

## Comment ?

Automatique et silencieux : pas d’opt-out.

À chaque ping, l’instance **écrit dans sa propre SQLite** (`datastore.sqlite`, table `telemetry`) **et** envoie un POST _fire-and-forget_ à `https://assistant.pierre-ia.org/telemetry` (le collecteur). Le collecteur n’écrit que ce qu’il reçoit. Il ne renvoie rien.
