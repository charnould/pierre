# Skill : Synthèse Programme (WIP)

## Contexte métier

Cette fiche donne une vision consolidée d'un programme (immeuble ou ensemble immobilier) :
taux d'occupation, santé financière globale des locataires, état du patrimoine technique,
réclamations actives et coût des travaux engagés.

Elle doit permettre à un gestionnaire de patrimoine d'évaluer en 60 secondes la situation
d'un immeuble et d'identifier les signaux faibles (vacance, impayés concentrés, travaux lourds…).

---

## Sources de données

- Base : `/knowledge/db.sqlite`
- Schéma disponible dans `<schema_content>` — s'y référer pour tous les noms de tables et colonnes
- Clé principale : `id_programme` — toutes les tables du schéma liées à ce programme sont pertinentes
- Clés de jointure : `id_lot`, `id_locataire`

<schema_content>

<!-- KNOWLEDGE_SCHEMA_HERE -->

</schema_content>

---

## Paramètres d'appel

| Paramètre      | Obligatoire | Description                         |
| -------------- | ----------- | ----------------------------------- |
| `id_programme` | ✅          | Identifiant du programme à analyser |

---

## Données à collecter

### Identité du programme

`id_programme`, nom, adresse, type (résidentiel / mixte / commercial…), nombre total de lots,
gestionnaire référent si disponible.

### Occupation du parc

Pour chaque lot : référence, type, surface, statut (occupé / vacant).
Calculer :

- Nombre de lots occupés vs vacants
- Taux d'occupation (%)
- Durée moyenne de vacance pour les lots non occupés (si date disponible)

### Situation financière consolidée (12 derniers mois)

Agréger sur l'ensemble des locataires actifs du programme :

- Montant total appelé vs versé par mois
- Nombre de locataires en impayé ou paiement irrégulier
- Montant total des impayés en cours
- Répartition : bons payeurs / irréguliers / impayés

Ne pas lister chaque locataire en détail — produire une **vision agrégée**,
avec mention des lots concernés par des impayés significatifs (> 1 mois de loyer).

### Travaux

Toutes les interventions sur les lots du programme depuis la date fournie :
date, lot concerné, nature, statut (réalisé / en cours / planifié), prestataire, coût si disponible.
Calculer :

- Coût total réalisé sur le programme
- Coût des travaux en cours ou planifiés
- Répartition par nature de travaux si possible (entretien courant / gros œuvre / remise en état…)

### Réclamations liées au programme

Toutes les réclamations rattachées aux lots ou locataires du programme :
date, lot, catégorie, statut, description, délai de traitement.
Mettre en évidence :

- Réclamations **ouvertes** (toutes catégories)
- Réclamations ouvertes liées à des travaux depuis plus de 30 jours
- Concentration de réclamations sur un même lot ou une même catégorie

### Autres données disponibles

Toute autre donnée du schéma rattachée au programme, à ses lots ou à ses locataires
(sinistres, contrats, avenants, procédures, courriers…) doit apparaître
dans une section dédiée, nommée d'après son contenu métier.

---

## Format de sortie

Produire **uniquement** ce bloc (markdown à l'intérieur) :

```
<artifact name="response">
## Synthèse programme — **id_programme**

**Nom :** ...
**Adresse :** ...
**Type :** ...
**Gestionnaire :** ... [ou "donnée non disponible"]

---

### Occupation du parc
**Lots total :** X | **Occupés :** X | **Vacants :** X | **Taux d'occupation :** X %

| Lot | Type | Surface | Statut | Locataire | Depuis |
|-----|------|---------|--------|-----------|--------|

---

### Situation financière consolidée (12 derniers mois)
**Impayés en cours :** X € — X locataire(s) concerné(s)
**Profil global :** X bons payeurs / X irréguliers / X en impayé

[Tableau uniquement si impayés ou irrégularités détectées :]
| Mois | Appelé total | Versé total | Écart | Nb locataires en écart |
|------|-------------|-------------|-------|------------------------|

**Lots avec impayé > 1 mois de loyer :** lot X (locataire Y, X €), …
[Ou : "Aucun impayé significatif sur 12 mois."]

---

### Travaux depuis [date_debut_travaux]
**Coût total réalisé :** X € [ou "montant non disponible"]
**Budget en cours / planifié :** X €

| Date | Lot | Nature | Statut | Prestataire | Coût |
|------|-----|--------|--------|-------------|------|

[Ou : "Aucune intervention enregistrée depuis cette date."]

---

### Réclamations
**Ouvertes :** X dont X liées à des travaux
**Concentration :** ... [lot ou catégorie sur-représentés, ou "aucune"]

| Date | Lot | Catégorie | Statut | Description | Délai |
|------|-----|-----------|--------|-------------|-------|

[Ou : "Aucune réclamation enregistrée."]

---

### [Sections supplémentaires si données disponibles]

---

### ⚠️ Points d'attention
</artifact>
```

> Ne jamais produire de texte en dehors de `<artifact name="response">`.

Points d'attention à signaler automatiquement :

- Taux d'occupation **inférieur à 90 %**
- Lot vacant depuis **plus de 3 mois**
- Impayés représentant **plus de 5 % du loyer total mensuel du programme**
- **≥ 3 locataires** en situation d'impayé ou de paiement irrégulier
- Coût total des travaux réalisés dépassant **X mois de loyer global** (seuil : 12 mois par défaut)
- Réclamation ouverte liée à des travaux **depuis plus de 30 jours**
- Travaux en cours ou planifiés **sans réclamation associée clôturée**
- **≥ 3 réclamations ouvertes** sur un même lot (signal de logement dégradé)
- Bail arrivant à échéance **dans moins de 3 mois** (par lot concerné)

Si aucun : "Aucun point d'attention."

---

## Règles

- Lancer toutes les requêtes en **une seule session `sqlite3`**
- Utiliser `date_debut_travaux` comme borne basse pour **toutes** les requêtes travaux et leur coût
- La vue financière est **agrégée** — ne pas produire une fiche par locataire
- Ne jamais poser de question — si un paramètre est absent, l'indiquer en tête de fiche et continuer avec les données disponibles
- Zéro résultat → l'indiquer explicitement dans la section concernée
- Donnée absente du schéma → "donnée non disponible"
- Les montants financiers sont toujours arrondis à l'euro près
