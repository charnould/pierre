# Skill : Synthèse Logement (WIP)

## Contexte métier

Cette fiche est produite pour avoir une vision complète d'un logement (lot locatif) :
son état technique, son historique de travaux et leur coût, la qualité de paiement
du locataire en place, et les réclamations actives ou passées.

Elle doit permettre à un gestionnaire de décider en 60 secondes si un logement
nécessite une attention particulière (travaux lourds, locataire à risque, litige en cours…).

---

## Sources de données

- Base : `/knowledge/db.sqlite`
- Schéma disponible dans `<schema_content>` — s'y référer pour tous les noms de tables et colonnes
- Clé principale : `id_lot` — toutes les tables du schéma liées à ce lot sont pertinentes
- Clés de jointure secondaires : `id_lot`, `id_locataire`, `id_programme`

<schema_content>

<!-- KNOWLEDGE_SCHEMA_HERE -->

</schema_content>

---

## Paramètres d'appel

| Paramètre | Obligatoire | Description                   |
| --------- | ----------- | ----------------------------- |
| `id_lot`  | ✅          | Identifiant du lot à analyser |

---

## Données à collecter

### Identité du logement

`id_lot`, programme, adresse complète, type de logement, surface, état du logement
si disponible.

### Occupation actuelle

Locataire en place (nom, prénom ou référence), date d'entrée, date de fin de bail,
loyer + charges en cours. Si le logement est vacant, l'indiquer explicitement.

### Historique financier du locataire en place (12 derniers mois)

Solde courant, montants appelés vs versés mois par mois.
Identifier les mois en impayé, paiement partiel ou retard.
**Objectif : qualifier la fiabilité de paiement** (bon payeur / irrégulier / impayés).

### Travaux

Toutes les interventions sur le lot depuis la date fournie :
date, nature, statut (réalisé / en cours / planifié), prestataire, **coût si disponible**.
Calculer :

- Coût total des travaux réalisés depuis `date_debut_travaux`
- Coût des travaux en cours ou planifiés (budget engagé ou prévisionnel)

### Réclamations liées au logement

Toutes les réclamations rattachées au lot ou au locataire en place :
date, catégorie, statut, description, délai de traitement.
Mettre en évidence :

- Les réclamations **ouvertes** liées à des travaux (catégorie = travaux, maintenance, sinistre…)
- Les réclamations clôturées ayant donné lieu à des travaux

### Autres données disponibles

Toute autre donnée du schéma rattachée au lot ou à son locataire
(sinistres, contrats, avenants, courriers, procédures…) doit apparaître
dans une section dédiée, nommée d'après son contenu métier.

---

## Format de sortie

Produire **uniquement** ce bloc (markdown à l'intérieur) :

```
<artifact name="response">
## Synthèse logement — Lot **id_lot**

**Programme :** ...
**Adresse :** ...
**Type / Surface :** ... / ... m²
**État :** ... [ou "donnée non disponible"]

---

### Occupation
**Locataire :** ... [ou "Vacant"]
**Entrée :** ... | **Fin de bail :** ...
**Loyer + charges :** ... €/mois

---

### Qualité de paiement (12 derniers mois)
**Solde actuel :** X € (créditeur / débiteur / équilibré)
**Profil :** Bon payeur / Paiements irréguliers / Impayés [+ synthèse en 1 phrase]

[Tableau uniquement si impayés ou irrégularités détectées :]
| Mois | Appelé | Versé | Écart | Statut |
|------|--------|-------|-------|--------|

---

### Travaux depuis [date_debut_travaux]
**Coût total réalisé :** X € [ou "montant non disponible"]
**Budget en cours / planifié :** X €

| Date | Nature | Statut | Prestataire | Coût |
|------|--------|--------|-------------|------|

[Ou : "Aucune intervention enregistrée depuis cette date."]

---

### Réclamations
**Ouvertes liées à des travaux :** X
**Toutes réclamations :**

| Date | Catégorie | Statut | Description | Délai |
|------|-----------|--------|-------------|-------|

[Ou : "Aucune réclamation enregistrée."]

---

### [Sections supplémentaires si données disponibles]

---

### ⚠️ Points d'attention
</artifact>
```

> Ne jamais produire de texte en dehors de `<artifact name="response">`.

Points d'attention à signaler automatiquement :

- Coût total des travaux réalisés dépassant **X mois de loyer** (seuil : 12 mois par défaut)
- Travaux en cours ou planifiés **sans réclamation associée clôturée** (travaux non déclenchés par une demande)
- Réclamation ouverte liée à des travaux **depuis plus de 30 jours**
- Locataire avec **solde débiteur > 1 mois de loyer** ou **≥ 3 mois irréguliers** sur 12
- Bail arrivant à échéance **dans moins de 3 mois**
- Logement vacant (aucun locataire actif)

Si aucun : "Aucun point d'attention."

---

## Règles

- Lancer toutes les requêtes en **une seule session `sqlite3`**
- Ne jamais poser de question — si un paramètre est absent, l'indiquer en tête de fiche et continuer avec les données disponibles
- Zéro résultat → l'indiquer explicitement dans la section concernée
- Donnée absente du schéma → "donnée non disponible"
- Les montants financiers sont toujours arrondis à l'euro près
