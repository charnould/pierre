# Skill: Generate a tenant summary

## Objective

Produce a summary of a tenant's situation to help a social housing (HLM) staff member prepare — for instance — a meeting with that tenant. The output must convey the full picture in under 60 seconds: who the tenant is, how they pay, what they have reported, what work has been done in their unit, etc.

---

## Input data

The input is a JSON payload containing:

- `id_locataire`: unique tenant identifier, join key across all tables.
- `year_from`: lower time boundary (format `YYYY`). Filter all dated data with `WHERE strftime('%Y', date_column) >= '{year_from}'` (adapt column name per table).

---

## Data access

- Single source of truth: `db.sqlite`, queried exclusively via `sqlite3`.
- The schema is available in `<schema_content>` below — refer to it for all table and column names.
- Primary join keys: `id_locataire`, `id_lot`, `id_programme`.
- Any table containing `id_locataire` or `id_lot` is potentially relevant.

Typical queries (substitute `{id_locataire}` and `{year_from}`):

```sqlite
BEGIN;
SELECT * FROM lots_locatifs WHERE id_locataire = '{id_locataire}';
SELECT * FROM quittances    WHERE id_locataire = '{id_locataire}' AND strftime('%Y', date_quittance) >= '{year_from}';
SELECT * FROM travaux       WHERE id_locataire = '{id_locataire}' AND strftime('%Y', date_travaux)   >= '{year_from}';
SELECT * FROM reclamations  WHERE id_locataire = '{id_locataire}' AND strftime('%Y', date_creation)  >= '{year_from}';
COMMIT;
```

Adapt the date column name to each table as per the schema.

<schema_content>

<!-- KNOWLEDGE_SCHEMA_HERE -->

</schema_content>

---

## Run all queries in a single sqlite3 session

```bash
sqlite3 db.sqlite <<'EOF'
.mode column
.headers on
SELECT * FROM lots_locatifs WHERE id_locataire = '{id_locataire}';
-- ... other queries
EOF
```

---

## Data to collect

### Tenancy details

`id_locataire`, occupied unit, type and surface area, move-in date, rent and service charges, household composition if available.

### Financial situation

Current balance (credit, debit, neutral). History since `year_from`: amounts charged, amounts paid, discrepancies. Flag months with non-payment or partial payment.

### Complaints/Request (réclamations)

All complaints linked to the tenant or their unit since `year_from`: date, category, status, description, resolution time. Distinguish open from closed.

### Works (travaux)

All interventions in the unit since `year_from`: date, nature, status, contractor. Distinguish completed, in progress, and planned.

### Other available data

Any other table in the schema linked to the tenant or their unit (contracts, amendments, claims, correspondence, legal proceedings…) must appear in a dedicated section named after its business content.

---

## Output format

Produce **only** this block:

```
<artifact name="response">

# Synthèse du locataire n°{id_locataire}
Lot : ...
Programme : ...
Entrée : ...
Fin de bail : ...
Loyer + charges : ... €/mois

## Points d'attention

Exemples :
- 🔴 Solde débiteur supérieur à un mois de loyer
- 🟠 Réclamation ouverte depuis plus de 30 jours
- 🟡 Travaux planifiés non encore réalisés
- 🟡 Bail arrivant à échéance dans moins de 3 mois

Si aucun : "Aucun point d'attention."

## Situation financière

## Réclamations

## Travaux

## [Sections supplémentaires si données disponibles]

</artifact>
```

> Never produce any text outside `<artifact name="response">`.

---

## Rules

- All queries in a **single** `sqlite3` session (bash heredoc)
- No decorative emoji — only 🔴 🟠 🟡 🟢 when they carry business meaning
- Never ask a question
- Zero results → state it explicitly in the relevant section
- Data absent from schema → "donnée non disponible"
