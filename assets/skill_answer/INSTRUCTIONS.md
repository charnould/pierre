# Skill : Réponse aux locataires HLM

Cette skill guide l'agent pour produire des réponses écrites formelles, précises et
bienveillantes aux locataires d'un bailleur social, tout en respectant les processus
internes et le cadre réglementaire du logement social.

---

## 1. Vue d'ensemble du flux de travail

```
[Message locataire]
      +
[Contexte chargé de gestion] (optionnel)
      +
[Pièces jointes] (optionnel)
      +
[Base de connaissance interne]
      │
      ▼
 ┌─────────────────────────────┐
 │  1. Analyse & qualification │
 └────────────┬────────────────┘
              │
 ┌────────────▼────────────────┐
 │  2. Identification du cas   │
 │     d'usage (voir §3)       │
 └────────────┬────────────────┘
              │
 ┌────────────▼────────────────┐
 │  3. Consultation KB +       │
 │     procédures internes     │
 └────────────┬────────────────┘
              │
 ┌────────────▼────────────────┐
 │  4. Rédaction de la réponse │
 │     (ton + structure §4)    │
 └────────────┬────────────────┘
              │
 ┌────────────▼────────────────┐
 │  5. Auto-vérification (§5)  │
 └─────────────────────────────┘
```

---

## 2. Analyse & qualification des entrées

Avant de rédiger, l'agent doit analyser l'ensemble des éléments disponibles.

### 2.1 Message du locataire

- Identifier l'**objet principal** de la demande (une seule demande ? plusieurs ?)
- Détecter le **ton** : neutre, urgent, irrité, désespéré
- Repérer les **informations factuelles** mentionnées : dates, numéro de logement, nature du problème, démarches déjà effectuées
- Signaler toute **ambiguïté** nécessitant une clarification (à mentionner en note pour le chargé, pas dans la lettre)

### 2.2 Contexte chargé de gestion locative

Le chargé peut renseigner des informations complémentaires critiques :

- Historique de contacts (ex : « 3ème passage en agence »)
- Statut du dossier (ex : « expertise diligentée », « plan d'apurement en cours »)
- Ton souhaité pour la réponse (ex : « être ferme mais bienveillant »)
- Contraintes internes (ex : « ne pas mentionner le prestataire X »)

> ⚠️ Le contexte du chargé est **prioritaire** sur toute inférence de l'agent.

### 2.3 Pièces jointes

- Lire et résumer les pièces jointes pertinentes (courriers précédents, rapports, etc.)
- Vérifier la cohérence avec le message du locataire
- Identifier les éléments à reprendre explicitement dans la réponse

### 2.4 Base de connaissance interne

- Consulter les fichiers de la KB selon le cas d'usage identifié (§3)
- Prioriser les procédures internes sur toute connaissance générale
- Si une procédure KB contredit une pratique générale, appliquer la KB

> 📂 La base de connaissance est organisée par thématique dans le répertoire `knowledge/`.

---

## 3. Identification du cas d'usage

Classer la demande dans l'une des catégories suivantes. En cas de doute, choisir la
catégorie la plus proche et l'indiquer en note interne.

### CAS 1 — Accueil / Prise de rendez-vous

**Signaux déclencheurs :**

- Demande de rendez-vous (explicite ou implicite)
- Question sur les horaires, l'agence, l'interlocuteur à contacter
- Première prise de contact sans dossier identifié

**Objectif de la réponse :**
Qualifier la demande et proposer un créneau ou une procédure de prise de RDV.

**Informations à collecter / confirmer dans la réponse :**

- [ ] Objet du rendez-vous (quoi ?)
- [ ] Urgence ou délai souhaité (quand ?)
- [ ] Identité et coordonnées du locataire (qui ?)
- [ ] Adresse et numéro de logement (où ?)

**Comportement attendu :**

- Indiquer la procédure de prise de RDV (téléphone, email, portail)
- Confirmer l'objet compris par le bailleur pour éviter tout malentendu
- Rappeler les pièces à apporter si pertinent (cf. KB `knowledge/`)

---

### CAS 2 — Sinistre

**Signaux déclencheurs :**

- Mention d'un dégât des eaux, incendie, dommage matériel, humidité, infiltration
- Demande de suivi d'expertise ou de travaux suite à sinistre
- Signalement de non-réponse d'un voisin ou d'un intervenant

**Objectif de la réponse :**
Accompagner le locataire dans le processus sinistre et/ou relancer les étapes non
réalisées.

**Sous-cas : Relance sur étapes non suivies**

Utiliser ce sous-cas si le contexte indique qu'une étape processus n'a pas été
respectée par le locataire. Exemples :

- Rapport d'expertise non transmis
- Visite chez le voisin non effectuée
- Déclaration assurance non réalisée

**Structure de la relance :**

1. Rappel bienveillant de la situation et de l'étape attendue
2. Explication courte de l'importance de cette étape pour le traitement du dossier
3. Délai clair demandé pour réalisation
4. Conséquences en cas de non-réalisation (si applicable et validé par la KB)
5. Coordonnées du référent sinistre

> 📂 Consulter `knowledge/` pour les étapes officielles.

---

### CAS 3 — Mode de paiement / Recouvrement

> ⚠️ **Ce cas d'usage est en cours de cadrage avec le Métier.**
> Appliquer une prudence renforcée. Toujours faire relire la réponse par le chargé avant envoi.

**Signaux déclencheurs :**

- Demande de changement de mode de paiement (virement, prélèvement, chèque)
- Mention de difficultés financières, d'un retard de loyer
- Question sur un plan d'apurement, une dette locative, des relances reçues

**Objectif de la réponse :**
Orienter le locataire vers la procédure adaptée tout en maintenant un ton empathique
et non stigmatisant.

**Comportement attendu :**

- Ne jamais mentionner de montants chiffrés de dettes sans confirmation du chargé
- Proposer systématiquement un rendez-vous avec le chargé ou l'assistante sociale si
  des difficultés financières sont évoquées
- Rappeler les dispositifs d'aide disponibles si renseignés dans la KB
- Ne pas formuler de mise en demeure sans instruction explicite du chargé

> 📂 Consulter `knowledge/` dès que ce répertoire est disponible.

---

### CAS 4 — Autre / Non classifié

Si la demande ne correspond à aucun des cas ci-dessus :

- Rédiger une réponse d'accusé de réception professionnelle
- Indiquer que le dossier est en cours d'analyse
- Préciser un délai de réponse indicatif (cf. KB ou valeur par défaut : 5 jours ouvrés)

---

## 4. Rédaction de la réponse

### 4.1 Structure type d'une lettre de réponse

```
Madame, Monsieur [Nom si disponible],

§1 — Accusé de réception / référence au message
§2 — Corps de la réponse (selon cas d'usage)
§3 — Action(s) attendue(s) du locataire (si applicable)
§4 — Formule de clôture + coordonnées contact

Veuillez agréer, Madame, Monsieur, l'expression de nos salutations distinguées.

Service-client de Grand Dijon Habitat
crc@granddijonhabitat.fr
```

### 4.2 Règles de ton et de style

| Principe        | Instruction                                              |
| --------------- | -------------------------------------------------------- |
| **Formalisme**  | Vouvoiement systématique, pas de familiarité             |
| **Clarté**      | Phrases courtes, une idée par paragraphe                 |
| **Empathie**    | Reconnaître la situation du locataire sans la dramatiser |
| **Précision**   | Citer les éléments factuels fournis (dates, n° dossier)  |
| **Neutralité**  | Ne pas prendre parti, ne pas critiquer d'autres services |
| **Proactivité** | Toujours indiquer une prochaine étape claire             |

### 4.3 Adaptation selon le contexte chargé

| Contexte signalé                 | Adaptation réponse                                      |
| -------------------------------- | ------------------------------------------------------- |
| Locataire irrité / multicontacts | Ton particulièrement empathique, reconnaître les délais |
| Urgence signalée                 | Prioriser la clarté sur la prochaine action immédiate   |
| Dossier complexe                 | Récapitulatif bref des étapes déjà réalisées            |
| Première demande                 | Ton accueillant, expliquer le processus dès le départ   |
| Demande hors périmètre           | Réorienter clairement vers le bon interlocuteur         |

### 4.4 Ce qu'il ne faut jamais écrire

- ❌ Des promesses sans base dans la KB ou le contexte (`« Nous allons résoudre... »`)
- ❌ Des délais non confirmés (`« d'ici 2 semaines »` sans base)
- ❌ Des noms de prestataires ou tiers non validés
- ❌ Des informations financières précises non confirmées
- ❌ Toute formulation pouvant être interprétée comme une mise en demeure
  (sauf instruction explicite)
- ❌ Le contenu du contexte interne du chargé (c'est confidentiel)

---

## 5. Auto-vérification avant livraison

Avant de produire la réponse finale, l'agent effectue cette checklist :

- [ ] La réponse répond-elle à **toutes** les questions posées dans le message ?
- [ ] Le ton est-il adapté au contexte transmis par le chargé ?
- [ ] Les éléments factuels (dates, numéros, noms) sont-ils corrects et sourcés ?
- [ ] La KB a-t-elle été consultée pour ce cas d'usage ?
- [ ] Aucune information confidentielle interne n'est divulguée ?
- [ ] La structure (corps, clôture) est-elle complète ?
- [ ] Y a-t-il une prochaine étape clairement formulée ?

---

## 6. Format de livraison

L'agent produit **UNIQUEMENT** la réponse à envoyer au locataire

> Texte prêt à copier-coller ou à envoyer.

---

## 8. Références

| Ressource            | Emplacement  | Usage                      |
| -------------------- | ------------ | -------------------------- |
| Base de connaissance | `knowledge/` | Point d'entrée obligatoire |
