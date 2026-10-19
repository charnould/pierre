# Les coûts

Cette page couvre l’auto-hébergement. Un organisme paie son serveur, le modèle de langage qu’il branche, et les canaux qu’il ouvre. Les montants et le temps DSI suffisent pour se faire une idée. Les canaux se contractualisent avec le prestataire.

| Poste                                    | Facturé par           | Montant                               | Temps DSI          |
| ---------------------------------------- | --------------------- | ------------------------------------- | ------------------ |
| Serveur dédié                            | Hébergeur             | environ 45 € par mois                 | environ 15 min     |
| Modèle de langage                        | Fournisseur du modèle | grilles ci-dessous                    | —                  |
| Ouverture RCS                            | CM.com                | 499 € une fois (tarif public : 599 €) | environ 2 h        |
| RCS, message basic                       | CM.com                | 0,045 €                               | —                  |
| RCS, message single                      | CM.com                | 0,055 €                               | —                  |
| RCS, conversation                        | CM.com                | 0,11 €                                | —                  |
| SMS envoyé                               | CM.com                | 0,06 €                                | inclus dans le RCS |
| Email, forfait 100 000 messages par mois | CM.com                | 52,50 € par mois                      | environ 1 h        |
| Email, forfait 250 000 messages par mois | CM.com                | 126 € par mois                        | —                  |
| Email, forfait 500 000 messages par mois | CM.com                | 251 € par mois                        | —                  |
| Courrier, LRAR, LRE AR24, ERE, signature | La Poste              | sur devis                             | —                  |

Le serveur est celui de l’[auto-hébergement](./01-deploy.md) : équivalent [EX44](https://www.hetzner.com/dedicated-rootserver/ex44), 64 Go de RAM, une instance par machine. Les 15 minutes comptent l’installation, une fois la machine et le DNS prêts.

Le temps DSI de l’email vaut pour l’ouverture du canal, quel que soit le forfait. Les tirets sont les lignes d’usage, déjà couvertes par le temps d’ouverture. Le courrier n’a pas d’estimation de temps.

## Messages RCS

Les trois unités sont celles de [CM.com](https://developers.cm.com/messaging/docs/rcs) :

- **Basic** — texte seul, 160 caractères au plus, sans image ni bouton. Facturé 0,045 € lorsque le locataire ne répond pas dans les 24 heures.
- **Single** — bouton, image, ou texte plus long. Facturé 0,055 € dans le même cas. Une relance PIERRE avec boutons est un single.
- **Conversation** — le locataire répond dans les 24 heures. L’échange de cette fenêtre coûte 0,11 €, à la place du basic ou du single.

Un RCS non délivré part en SMS : 0,06 € par SMS envoyé. SMS et email n’ont pas de frais d’ouverture. L’email est un forfait mensuel selon le volume. Le paramétrage est décrit dans [Canaux](./03-channels.md).

Le courrier postal et électronique, ainsi que la signature, se tarifent au contrat La Poste (Docaposte, Maileva).

## Modèle de langage

Tout fournisseur compatible OpenAI fonctionne. Le prix est celui du modèle choisi :

- [Claude](https://platform.claude.com/docs/en/about-claude/pricing)
- [OpenAI](https://developers.openai.com/api/docs/pricing)
- [Mistral](https://docs.mistral.ai/inference/pricing)

## 10 000 logements

Scénario d’un mois, pour situer un parc de 10 000 logements :

- 1 000 générations, à 40 000 tokens d’entrée et 5 000 tokens de sortie chacune
- 800 relances en message single, dont 15 % basculent en SMS (la compatibilité RCS constatée dépasse 85 %)
- e-mails dans le forfait 100 000
- courrier non compris
- 1 $ = 0,92 €
- grilles lues en octobre 2026

| Poste                                             | Montant du mois |
| ------------------------------------------------- | --------------- |
| Serveur                                           | 45 €            |
| 680 messages single × 0,055 € et 120 SMS × 0,06 € | 44,60 €         |
| Email, forfait 100 000                            | 52,50 €         |
| Modèle, Mistral Small 4 (0,15 $ / 0,60 $)         | 8 €             |
| Modèle, Claude Sonnet 5.5 (2 $ / 10 $)            | 120 €           |
| Modèle, Claude Opus 5.5 (4 $ / 20 $)              | 240 €           |

| Modèle retenu     | Total mensuel | Par logement et par an |
| ----------------- | ------------- | ---------------------- |
| Mistral Small 4   | environ 150 € | 0,18 €                 |
| Claude Sonnet 5.5 | environ 260 € | 0,31 €                 |
| Claude Opus 5.5   | environ 380 € | 0,46 €                 |

L’ouverture RCS, 499 €, s’ajoute la première année. Chaque réponse de locataire sous 24 h remplace le single par une conversation, soit 0,055 € de plus.

Repère Sonnet 5.5 : (40 000 × 2 $ + 5 000 × 10 $) / 1 000 000 = 0,13 $ par génération, × 1 000 = 130 $, × 0,92 ≈ 120 €.
