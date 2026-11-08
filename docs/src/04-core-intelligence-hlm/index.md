##### [PIERRE](../index.md) ∕ CORE INTELLIGENCE HLM

# CORE INTELLIGENCE HLM

#### Version alpha (en cours et évolutif).

Une intelligence artificielle qui lit les [Core Data HLM](../02-core-data-hlm/index.md) voit des faits et des données. Pour qu'elle puisse agir et intervenir comme un collaborateur HLM expérimenté, il lui faut également les règles, les pratiques et les réflexes du métier.

**Core Intelligence HLM est ce savoir prêt à l’emploi** : chaque bailleur peut s’en servir tel quel, ou l’adapter librement aux pratiques de son organisme — prompts procéduraux, templates de document, connaissances HLM et paramétrages de PIERRE.

Cette collection (alpha, vivante et évolutive) est née en octobre 2026 des échanges avec [Grand Dijon Habitat](http://granddijonhabitat.fr/) lors du développement de PIERRE. Une idée, un template, un processus ou un prompt qui sert à tous le mouvement HLM ? [charnould@pierre-ia.org](mailto:charnould@pierre-ia.org).

## [Templates](https://github.com/charnould/pierre/tree/master/docs/04-core-intelligence-hlm/templates)

- **Template de diagnostic social et financier** en 3 versions :  
  (1) un template compatible avec le module « Impayés » de PIERRE  
  (2) un exemple dûment complété (données fictives)  
  (3) un template vierge
- **Template de plan d'apurement** en 3 versions :  
  (1) un template compatible avec le module « Impayés » de PIERRE  
  (2) un exemple dûment complété (données fictives)  
  (3) un template vierge
- **Template de protocole de cohésion social** en 3 versions :  
  (1) un template compatible avec le module « Impayés » de PIERRE  
  (2) un exemple dûment complété (données fictives)  
  (3) un template vierge
- **Template de courrier postal** compatible avec les modules « Réclamations » et « Impayés ».

## [Prompts](https://github.com/charnould/pierre/tree/master/docs/04-core-intelligence-hlm/prompts)

Un « prompt » est la consigne donnée à une IA pour traiter une situation, dès lors — naturellement — que les données relatives à cette situation lui sont accessibles. PIERRE utilise ces prompts pour intervenir opérationnellement dans les processus HLM, aux côtés des collaborateurs, de jour comme de nuit.

Ces prompts procéduraux — généralement rédigés en « français contrôlé » (dérivé de [ASD STE-100](https://fr.wikipedia.org/wiki/Anglais_technique_simplifi%C3%A9)) afin d'en faciliter la compréhension par une IA — sont le reflet des pratiques et processus d'un bailleur social en particulier ; ils sont donc à ajuster pour correspondre pleinement à l'environnement de votre organisme.

- **Répondre aux réclamations** — _à venir_
- **Analyser un dossier d'impayés** — _à venir_

## [Paramétrages de PIERRE](https://github.com/charnould/pierre/tree/master/docs/04-core-intelligence-hlm/Param%C3%A9trages%20de%20PIERRE)

Ces paramétrages sont nécessaires au fonctionnement de PIERRE. Ceux proposés ci-dessous accélèrent la mise en route et sont parfaitement personnalisables par chaque organisme (consulter la [documentation](../06-installation/index.md) de PIERRE).

- `automations.md` — consigne du module « Générer un rapport »
- `tickets.json` — paramétrage du module « Réclamations »
- `repayment.json` — paramétrage du module « Impayés »
- `logo.png` — logo de votre organisme au format PNG, impérativement sur fond transparent sans fonds perdus (= bord à bord). C'est ce logo qui s'affichera systématiquement sur les emails transactionnels envoyés depuis PIERRE. Il conviendra d'ajuster sa taille dans `email.html`.
- `email.html` — template d'email transactionnel
- `Agents conversationnels/Agent public.json` — paramétrage du chatbot public
- `Agents conversationnels/Agent public.md` — personnalité du chatbot public
- `Agents conversationnels/Agent public.svg` — icône du chatbot public, lorsque l'on l'installe sur l'écran d'accueil de son smartphone
- `Agents conversationnels/Agent interne spécialisé.json` — paramétrage d'un agent interne (cadre d'astreinte)
- `Agents conversationnels/Agent interne spécialisé.md` — personnalité de cet agent

## [Knowledge](https://github.com/charnould/pierre/tree/master/server/knowledge)

Cette base de connaissances (en cours de constitution et en perpétuelle évolution) permet à un agent conversationnel de répondre aux questions de premier niveau des locataires et candidats HLM. C’est celle qu’utilise l'agent « grand public » de PIERRE. Elle est constituée de :

- **Connaissances générales** : connaissances génériques applicables sur tout le territoire (ex : comment gérer un trouble du voisinage ? qu'est-ce que les charges locatives ?).
- **Spécificités locales** : connaissances spécifiques à un territoire donné (ex : les associations d'hébergement d'urgence dans l'Ain, les structures d'aide contre les violences conjugales dans l'Eure).
- **Organismes HLM** : connaissances relatives à un organisme en particulier (ex : qu'est-ce que Grand Dijon Habitat et quelles sont les coordonnées de ses agences ?).
- **Wikipédia** : connaissances importées de Wikipédia (ex : l'histoire du logement social).

#### Comment y contribuer concrètement ?

Très simplement. Consultez la base de connaissances, et si vous identifiez un manque, une imprécision ou une erreur : envoyez un email à [charnould@pierre-ia.org](mailto:charnould@pierre-ia.org) ou (mieux) créez une [issue sur GitHub](https://github.com/charnould/pierre/issues).

Au fur et à mesure de l'amélioration de cette base de connaissances, c'est l'intégralité du mouvement HLM qui en profite ; c'est plus malin que de réinventer perpétuellement une roue incomplète dans son coin.

## Licence

Un bailleur social peut utiliser PIERRE gratuitement pour son activité. Pour les autres cas d’usage, les conditions sont exposées dans la [licence](https://github.com/charnould/pierre/blob/master/LICENSE.md). Core Data HLM, Core Intelligence HLM, la taxonomie de CARL et la documentation sont sous licence [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.fr). Les bibliothèques et ressources tierces restent sous leur licence propre.

Copyright © 2024-aujourd’hui · [Charles-Henri Arnould](mailto:charnould@pierre-ia.org) / BECKREL SAS et les contributeurs.
