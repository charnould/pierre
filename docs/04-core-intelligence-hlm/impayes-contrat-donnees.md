# Impayés — contenu des quatre formulaires

Ce document définit uniquement le contenu JSON de quatre formulaires :

1. données communes ;
2. diagnostic social et financier ;
3. plan d’apurement ;
4. protocole de cohésion sociale minimal.

Il ne décrit ni activités, ni drawer, ni stockage SQLite, ni routes, ni documents Word.

## Conventions

- Quatre objets JSON distincts.
- Clés françaises en `snake_case` sans accent.
- Noms Core Data HLM conservés lorsque le concept est identique.
- Date : `YYYY-MM-DD`.
- Mois : `YYYY-MM`.
- Montant saisi : `number | null`.
- `null` = inconnu ; `0` = zéro confirmé.
- Chaîne ou date absente = `null`.
- Liste absente = `[]`.
- Unité précisée dans le nom de la clé.
- Aucune donnée commune recopiée dans DSF, plan ou protocole.
- Le snapshot enregistré réunit ces quatre objets et un seul échéancier racine.

## Objet 1 — `donnees_communes`

```json
{
  "version": 1,
  "identification": {
    "id_client": "CL-1042",
    "id_locataire": "LOC-8831",
    "id_lot": "LOT-218"
  },
  "logement": {
    "adresse": "12 rue des Tilleuls",
    "code_postal": "21000",
    "commune": "Dijon"
  },
  "bail": {
    "debut_bail": "2021-03-01",
    "garant": null
  },
  "foyer": {
    "adultes": [
      {
        "id_personne": "personne_1",
        "prenom": "Camille",
        "nom": "Martin",
        "date_naissance": "1988-05-14",
        "type_emploi": "Salarié en CDI",
        "employeur": "Entreprise Exemple",
        "allocataire_caf": "1234567",
        "adresse_correspondance": null,
        "statut_bail": "titulaire_origine_et_actuel",
        "mode_residence": "permanente",
        "date_effet_conge": null,
        "remplacement_cotitulaire": "non_concerne",
        "date_entree_nouveau_cotitulaire": null,
        "date_fin_solidarite": null
      }
    ],
    "enfants": []
  },
  "compte_locataire": {
    "solde_compte_en_euros": 153.54,
    "date_arrete_compte": "2026-11-06",
    "date_premier_loyer_impaye": "2026-07-01",
    "statut_contestation": "non_conteste",
    "montant_conteste_en_euros": 0,
    "motif_contestation": null,
    "motifs_impaye": ["Baisse d’activité ou de revenus"],
    "ancienne_dette_hors_solde_en_euros": 0
  },
  "budget": {
    "ressources_mensuelles": [
      {
        "type": "salaire_net",
        "id_personne": "personne_1",
        "montant_en_euros": 1480,
        "date_debut": null,
        "date_fin": null,
        "niveau_preuve": "justifie",
        "date_niveau_preuve": "2026-11-06"
      }
    ],
    "ressources_ponctuelles": [],
    "charges_mensuelles": [
      {
        "type": "cout_logement_net",
        "id_personne": null,
        "montant_en_euros": 512.4,
        "date_debut": null,
        "date_fin": null,
        "niveau_preuve": "justifie",
        "date_niveau_preuve": "2026-11-06"
      },
      {
        "type": "energie_eau",
        "id_personne": null,
        "montant_en_euros": 120,
        "date_debut": null,
        "date_fin": null,
        "niveau_preuve": "declare",
        "date_niveau_preuve": "2026-11-06"
      }
    ],
    "charges_ponctuelles": []
  },
  "travailleur_social": null,
  "aides_mobilisables": []
}
```

### Structures imbriquées

| Objet                     | Clés                                                                                                       |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Garant                    | `prenom`, `nom`                                                                                            |
| Adresse de correspondance | `adresse`, `code_postal`, `commune`                                                                        |
| Enfant                    | `id_personne`, `prenom`, `nom`, `date_naissance`, `a_charge`, `mode_residence`                             |
| Ressource mensuelle       | `type`, `id_personne`, `montant_en_euros`, `date_debut`, `date_fin`, `niveau_preuve`, `date_niveau_preuve` |
| Ressource ponctuelle      | `type`, `id_personne`, `montant_en_euros`, `mois_imputation`, `niveau_preuve`, `date_niveau_preuve`        |
| Charge mensuelle          | `type`, `id_personne`, `montant_en_euros`, `date_debut`, `date_fin`, `niveau_preuve`, `date_niveau_preuve` |
| Charge ponctuelle         | `type`, `id_personne`, `montant_en_euros`, `mois_imputation`, `niveau_preuve`, `date_niveau_preuve`        |
| Travailleur social        | `prenom_et_nom`, `organisme`, `coordonnees`                                                                |

### Règles communes

- Les identifiants, l’adresse, le début du bail et le solde sont préremplis depuis Core Data HLM.
- `solde_compte_en_euros` positif = dette envers le bailleur ; négatif = crédit du locataire.
- Chaque adulte peut porter une adresse de correspondance.
- Le niveau de preuve est choisi par ligne ; sa date est automatique.
- `Période limitée` révèle `date_debut` et `date_fin`.
- Le coût net du logement est une charge mensuelle.
- Les catégories emploi et motifs restent des libellés français.
- Les types budgétaires utilisent des codes français stables ; `id_personne: null` signifie que la
  ligne concerne le foyer.

Contestation :

- `non_conteste` : montant `0`, motif `null` ;
- `conteste` : montant strictement positif et motif non vide ;
- `inconnu` : montant et motif `null`.

### Solidarité

Par adulte titulaire :

- `date_effet_conge`
- `remplacement_cotitulaire`
- `date_entree_nouveau_cotitulaire`
- `date_fin_solidarite`

Calcul :

- remplacement cotitulaire = `oui` : plus tardive entre son entrée et l’effet du congé ;
- remplacement cotitulaire = `non` : six mois calendaires après l’effet du congé ;
- jour impossible dans le mois cible : dernier jour de ce mois ;
- information inconnue : aucune date calculée ;
- la date calculée préremplit `date_fin_solidarite` et reste modifiable.

## Échéancier unique — `echeancier`

```json
{
  "traitement_montant_conteste": "non_concerne",
  "inclure_ancienne_dette_locative": false,
  "montant_a_apurer_en_euros": 153.54,
  "echeances": [
    {
      "date_echeance": "2026-12-01",
      "montant_en_euros": 153.54,
      "ressources_totales_du_mois_en_euros": 1480,
      "charges_totales_du_mois_en_euros": 632.4,
      "unites_de_consommation": 1,
      "taux_effort_loyer_net": 0.449959,
      "reste_a_vivre_loyer_net_par_unite_consommation_et_par_jour_en_euros": 27.14,
      "taux_effort_global": 0.531041,
      "reste_a_vivre_global_par_unite_consommation_et_par_jour_en_euros": 23.14
    }
  ]
}
```

Les dates et montants des échéances sont saisis. Les autres valeurs sont calculées.

`echeances[].montant_en_euros` rembourse uniquement la dette ; le loyer courant reste hors
échéancier.

Le total de l’échéancier et l’écart avec `montant_a_apurer_en_euros` sont calculés pour l’affichage,
mais ne sont pas stockés.

## Objet 2 — `diagnostic_social_financier`

```json
{
  "version": 1,
  "menage_informe_du_dsf": "oui",
  "consentement_recherche_pour_dsf": "accorde",
  "signature_diagnostic_par_menage": "non_renseignee",
  "position_et_solutions_proposees_par_menage": "Le ménage souhaite rester dans le logement et propose un échéancier.",
  "observations_bailleur": null,
  "vulnerabilites": [],
  "impact_vulnerabilites": null,
  "orientation_logement": {
    "orientation": "maintien",
    "motifs": "Le logement reste adapté au foyer."
  },
  "appreciation_echeancier": "soutenable",
  "motif_non_soutenabilite": null,
  "synthese_professionnelle": "La proposition paraît soutenable sous réserve du maintien des ressources."
}
```

`appreciation_echeancier` vaut :

- `soutenable`
- `non_soutenable`
- `non_evalue`

`motif_non_soutenabilite` est obligatoire si l’appréciation vaut `non_soutenable`.

Le DSF ne recopie ni foyer, ni compte locataire, ni budget, ni échéancier. Il apprécie l’échéancier racine.

## Objet 3 — `plan_apurement`

```json
{
  "version": 1,
  "accord_bailleur": "inconnu",
  "accord_menage": "inconnu",
  "date_accord": null,
  "mode_de_paiement_echeances": "virement"
}
```

`date_accord` est obligatoire lorsque `accord_bailleur` et `accord_menage` valent `oui`, et vaut
`null` dans tous les autres cas.

Le plan ne contient aucun autre champ propre en v1. Il porte sur l’échéancier racine.

## Objet 4 — `protocole_cohesion_sociale`

```json
{
  "version": 1
}
```

Le PCS reste volontairement minimal. Son contenu juridique sera travaillé séparément.

## Calculs de l’échéancier

DSF, plan et protocole lisent le même échéancier.

- Montant à apurer = partie débitrice du solde, diminuée du montant contesté s’il est exclu, plus
  l’ancienne dette si elle est incluse.
- Montant contesté à décider = montant à apurer `null`.
- Ligne mensuelle active entre ses bornes incluses.
- Borne absente = période ouverte.
- Ligne ponctuelle active pendant son mois d’imputation.
- Aucun prorata journalier.
- UC : 1 pour le premier adulte, 0,5 pour toute autre personne de 14 ans ou plus, 0,3 en dessous.
- Résidents permanents et alternés inclus.
- Donnée nécessaire inconnue = métrique `null`.
- Ressources à zéro = taux d’effort `null`.
- UC à zéro = reste à vivre `null`.

Avec `R` les ressources, `L` la charge nette de logement, `C` toutes les charges, `M` la mensualité
et `UC` les unités de consommation :

- `TE·LN = (L + M) / R`
- `RAV·LN = (R - L - M) / (UC × 30)`
- `TE·G = (C + M) / R`
- `RAV·G = (R - C - M) / (UC × 30)`

## Valeurs contrôlées

- Oui/non : `oui`, `non`, `inconnu`, `non_concerne`
- Statut au regard du bail : `titulaire_origine_et_actuel`, `titulaire_actuel_ajoute`,
  `ancien_titulaire`, `non_titulaire`, `inconnu`
- Mode de résidence : `permanente`, `alternee`, `occasionnelle`, `non_occupante`
- Contestation : `conteste`, `non_conteste`, `inconnu`
- Niveau de preuve : `declare`, `justifie`
- Consentement : `accorde`, `refuse`, `non_recueilli`, `non_renseigne`
- Signature DSF : `signe`, `refuse`, `impossible`, `non_renseignee`
- Orientation : `maintien`, `mutation`, `relogement`, `depart`, `a_evaluer`
- Appréciation : `soutenable`, `non_soutenable`, `non_evalue`
- Mode de paiement : `prelevement`, `virement`, `cheque`, `especes`, `autre`
- Traitement du montant contesté : `non_concerne`, `inclus`, `exclu`, `a_decider`

## Critères d’acceptation

1. Quatre objets JSON distincts.
2. Aucune donnée commune recopiée.
3. Un seul échéancier, à la racine du snapshot.
4. PCS volontairement minimal.
5. `null` distinct de zéro.
6. Adresse de correspondance par adulte.
7. Niveau de preuve par ligne budgétaire.
8. Coût net du logement dans les charges.
9. Solidarité calculable et modifiable.
10. JSON compréhensible sans connaître le code.
