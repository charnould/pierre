##### [PIERRE](../index.md) ∕ CORE INTELLIGENCE HLM

# CORE INTELLIGENCE HLM

Une intelligence artificielle qui lit les [**Core Data HLM**](docs/02-core-data-hlm/index.md) voit des faits et des données. Pour qu'elle puisse agir et intervenir comme un collaborateur HLM expérimenté, il lui faut également les règles, les pratiques et les réflexes du métier.

**Core Intelligence HLM est ce savoir prêt à l’emploi** : chaque bailleur peut s’en servir tel quel, ou l’adapter librement aux pratiques de son organisme — prompts procéduraux, templates de document, connaissances HLM et paramétrages de PIERRE.

Cette collection (vivante et évolutive) est née en septembre 2026 des échanges avec [Grand Dijon Habitat](http://granddijonhabitat.fr/) lors du développement de PIERRE. Une idée, un template, un processus ou un prompt qui sert à tous le mouvement HLM ? [charnould@pierre-ia.org](mailto:charnould@pierre-ia.org).

## [Templates](https://github.com/charnould/pierre/tree/master/docs/04-core-intelligence-hlm/templates)

- **Template de plan d'apurement** en 3 versions :  
  (1) un template compatible avec le module « Impayés » de PIERRE  
  (2) un exemple dûment complété (données fictives)  
  (3) un template vierge
- **Template de courrier postal** : à utliser lors du paramètrage du module « Réclamations ».

## [Prompts](https://github.com/charnould/pierre/tree/master/docs/04-core-intelligence-hlm/prompts)

Un « prompt » est la consigne donnée à une IA pour traiter une situation, dès lors — naturellement — que les données relatives à cette situation lui sont accessibles. PIERRE utilise ces prompts pour intervenir opérationnellement dans les processus HLM, aux côtés des collaborateurs, de jour comme de nuit.

Ces prompts procéduraux — généralement rédigés en « français contrôlé » (dérivé de [ASD STE-100](https://fr.wikipedia.org/wiki/Anglais_technique_simplifi%C3%A9)) afin d'en faciliter la compréhension par une IA — sont le reflet des pratiques et processus d'un bailleur social en particulier ; ils sont donc à ajuster pour correspondre pleinement à l'environnement de votre organisme.

- Répondre aux réclamations — _à venir_
- Analyser un dossier d'impayés — _à venir_

## [Paramétrages de PIERRE](https://github.com/charnould/pierre/tree/master/docs/04-core-intelligence-hlm/parametrages)

Ces paramétrages sont nécessaires au fonctionnement de PIERRE. Ceux proposés ci-dessous accélèrent la mise en route et sont parfaitement personnalisables par chaque organisme (consulter la [documentation](docs/06-installation/01-server/02-setup.md) de PIERRE).

- `global.json` — nom de l’agent et fuseau horaire de l’instance
- `automations.md` — consigne du module « Générer un rapport »
- `tickets.json` — paramétrage du module « Réclamations » — _à venir_
- `repayment.json` — paramétrage du module « Impayés » — _à venir_
- `icon.svg` — cette icône est celle du chatbot « grand public » lorsque l'on l'installe sur l'écran d'accueil de son smartphone.
- `logo.png` — logo de votre organisme au format PNG, impérativement sur fond transparent sans fonds perdus (= bord à bord). C'est ce logo qui s'affichera systématiquement sur les emails transactionnels envoyés depuis PIERRE. Il conviendra d'ajuster sa taille dans `email.html`.
- `email.html` — template d'email transactionnel — _à venir_
- `default.json` — paramétrage du chatbot public — _à venir_
- `default.md` — personnalité du chatbot public — _à venir_

## [Knowledge](https://github.com/charnould/pierre/tree/master/docs/04-core-intelligence-hlm/knowledge)

Cette base de connaissances (en cours de constitution et en perpétuelle évolution) permet à un agent conversationnel de répondre aux questions de premier niveau des locataires et candidats HLM. C’est celle qu’utilise l'agent « grand public » de PIERRE. Elle est constituée de :

- **Connaissances générales** : connaissances génériques applicables sur tout le territoire (ex : comment gérer un trouble du voisinage ? qu'est-ce que les charges locatives ?).
- **Spécificités locales** : connaissances spécifiques à un territoire donné (ex : les associations d'hébergement d'urgence dans l'Ain, les structures d'aide contre les violences conjugales dans l'Eure).
- **Organismes HLM** : connaissances relatives à un organisme en particulier (ex : qu'est-ce que Grand Dijon Habitat et quelles sont les coordonnées de ses agences ?).
- **Wikipédia** : connaissances importées de Wikipédia (ex : l'histoire du logement social).

### Comment y contribuer concrètement ?

Très simplement. Consultez la base de connaissances, et si vous identifiez un manque, une imprécision ou une erreur : envoyez un email à [charnould@pierre-ia.org](mailto:charnould@pierre-ia.org) ou (mieux) créez une [issue sur GitHub](https://github.com/charnould/pierre/issues).

Au fur et à mesure de l'amélioration de cette base de connaissances, c'est l'intégralité du mouvement HLM qui en profite ; c'est plus malin que de réinventer perpétuellement une roue incomplète dans son coin.

## Licence

Les documents de « Core Intelligence HLM » — prompts, templates, paramétrages et connaissances — sont proposés sous licence [`CC BY-NC-SA 4.0`](https://creativecommons.org/licenses/by-sa/4.0/deed.fr). Les pages du dossier `knowledge/Wikipédia/` restent sous leur licence propre.

Copyright (c) 2026-aujourd'hui, Charles-Henri Arnould/BECKREL et les contributeurs.
