##### [PIERRE](../index.md) ∕ CORE INTELLIGENCE HLM

# CORE INTELLIGENCE HLM

Une intelligence artificielle qui lit les **Core Data HLM** voit des faits. Pour qu'elle puisse agir comme un collaborateur HLM expérimenté, il lui faut également les règles, les pratiques et les réflexes du métier.

**Core Intelligence HLM est ce savoir prêt à l’emploi**, chacun peut s’en servir tel quel, ou l’adapter librement à son organisme — prompts procéduraux, templates de document, connaissances HLM et paramétrages de PIERRE.

Cette collection (vivante) est née à l’été 2026 des échanges avec [Grand Dijon Habitat](http://granddijonhabitat.fr/) lors du développement de PIERRE. Un template, un processus ou un prompt qui sert à tous les bailleurs sociaux ? [charnould@pierre-ia.org](mailto:charnould@pierre-ia.org).

## [Templates](https://github.com/charnould/pierre/tree/master/docs/04-core-intelligence-hlm/templates)

- **Template de plan d'apurement** en 3 versions.  
  (1) un template compatible avec le module « Impayés » de PIERRE  
  (2) un exemple dûment complété (données fictives)  
  (3) un modèle vierge

## [Prompts](https://github.com/charnould/pierre/tree/master/docs/04-core-intelligence-hlm/prompts)

Un « prompt » est la consigne donnée à un agent pour traiter une situation, dès lors naturellement que les données relatives à cette situation lui sont accessibles. PIERRE utilise ces prompts pour intervenir opérationnellement dans les processus HLM, aux côtés des collaborateurs, de jour comme de nuit.

Ces prompts procéduraux — généralement rédigés en « français contrôlé » (dérivé de [ASD STE-100](https://fr.wikipedia.org/wiki/Anglais_technique_simplifi%C3%A9)) afin d'en faciliter la compréhension par une IA — sont le reflet des pratiques et processus d'un bailleur social en particulier ; ils sont donc à ajuster pour correspondre pleinement à votre environnement.

- Répondre aux réclamations (_à venir_)
- Analyser un dossier d'impayés (_à venir_)

## [Paramétrages](https://github.com/charnould/pierre/tree/master/docs/04-core-intelligence-hlm/parametrages)

Ces paramétrages sont nécessaire au fonctionnement de PIERRE. Ils accélèrent la mise en route et sont parfaitement personnalisables (consulter la documentation de PIERRE).

- `tickets.json` — paramétrage du module « Réclamations » (_à venir_)
- `repayment.json` — paramétrage du module « Impayés » (_à venir_)
- `icon.svg` — exemple d’icône (_à venir_)
- `email.html` — template d'email transactionnel (_à venir_)
- `default.json` — paramétrage du chatbot public (_à venir_)
- `default.md` — personnalité du chatbot public (_à venir_)

## [Knowledge](https://github.com/charnould/pierre/tree/master/docs/04-core-intelligence-hlm/knowledge)

Cette base de connaissances (en cours de constitution) permet à un agent conversationnel de répondre aux questions de premier niveau des locataires et candidats HLM. C’est elle qu’utilise l'agent « grand public » de PIERRE. Elle est constituée de :

- `Connaissances générales`  
  Connaissances génériques applicables sur tout le territoire (ex : comment gérer un trouble du voisinage ? qu'est-ce que les charges locatives ?).
- `Spécificités locales`  
  Connaissances spécifiques à un territoire donné (ex : les associations d'hébergement d'urgence dans l'Ain, les structures d'aide contre les violences conjugales dans l'Eure).
- `Organismes HLM`  
  Connaissances relatives à un organisme en particulier (ex : qu'est-ce que Grand Dijon Habitat et quelles sont les coordonnées de ses agences ?).
- `Wikipédia`  
  Connaissances importées de Wikipédia (ex : l'histoire du logement social).

### Comment y contribuer concrètement ?

Très simplement. Consulter la base de connaissances, et si vous identifiez un manque, une imprécision ou une erreur : envoyer un email à [charnould@pierre-ia.org](mailto:charnould@pierre-ia.org).

Au fur et à mesure de l'amélioration de cette base de connaissances, c'est tout le mouvement HLM qui en profite. C'est plus malin que de réinventer perpétuellement une roue incomplète.

## Licence

L'intégralité des documents de Core Intelligence HLM est sous licence [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/deed.fr).  
Copyright (c) 2026-aujourd'hui, Charles-Henri Arnould/BECKREL et les contributeurs.
