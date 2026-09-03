import {
  CONTACTS_TABLE,
  COMPTES_LOCATAIRES_TABLE,
  COMPUTED_LEDGER_COLUMNS,
  LOTS_TABLE,
  type LedgerColumnMeta
} from './schema'

export const non_empty_locataire = `"id_locataire" IS NOT NULL AND TRIM(CAST("id_locataire" AS TEXT)) != ''`

const build_movement_order = (movement_columns: Set<string>): string => {
  if (movement_columns.has('date_exigibilite')) {
    return 'm."date_exigibilite" DESC, m.rowid DESC'
  }
  return 'm.rowid DESC'
}

const build_latest_movement_cte = (movement_column_list: LedgerColumnMeta[]): string => {
  const names = movement_column_list.map((column) => column.name)
  const movement_columns = new Set(names)
  const selected = names.map((name) => `m."${name}"`).join(',\n    ')
  const order_clause = build_movement_order(movement_columns)

  return `
ranked_movements AS (
  SELECT
    ${selected},
    ROW_NUMBER() OVER (PARTITION BY m."id_locataire" ORDER BY ${order_clause}) AS rn
  FROM "${COMPTES_LOCATAIRES_TABLE}" m
  WHERE ${non_empty_locataire}
),
latest_movement AS (
  SELECT ${names.map((name) => `"${name}"`).join(', ')}
  FROM ranked_movements
  WHERE rn = 1
)`
}

const can_join_lots = (lots_columns: Set<string>, movement_columns: Set<string>): boolean =>
  lots_columns.has('id_lot') &&
  lots_columns.has('id_locataire') &&
  movement_columns.has('id_lot') &&
  movement_columns.has('id_locataire')

export const build_ledger_view_sql = (
  movement_column_list: LedgerColumnMeta[],
  has_lots: boolean,
  lots_columns: Set<string>,
  has_contacts: boolean
): string => {
  const movement_columns = new Set(movement_column_list.map((column) => column.name))
  const join_lots = has_lots && can_join_lots(lots_columns, movement_columns)
  const has_email = movement_columns.has('email_client')
  const has_phone = movement_columns.has('telephone_client')
  const join_contacts = has_contacts && (has_email || has_phone)

  const ctes = [
    `balances AS (
  SELECT
    "id_locataire",
    SUM(CAST("montant_en_euros" AS REAL)) AS solde_locataire
  FROM "${COMPTES_LOCATAIRES_TABLE}"
  WHERE ${non_empty_locataire}
  GROUP BY "id_locataire"
  HAVING solde_locataire > 0
)`,
    build_latest_movement_cte(movement_column_list)
  ]

  const statut = join_lots
    ? `CASE WHEN occ."id_locataire" IS NOT NULL THEN 'client' ELSE 'ex-client' END`
    : `'ex-client'`

  const rent =
    join_lots && lots_columns.has('loyer_mensuel_en_euros')
      ? 'lot."loyer_mensuel_en_euros"'
      : 'NULL'
  const ratio = join_lots
    ? `CASE
    WHEN ${rent} IS NOT NULL AND ${rent} > 0
    THEN ROUND(b.solde_locataire / ${rent}, 1)
    ELSE NULL
  END`
    : 'NULL'

  const movement_selects = movement_column_list
    .filter((column) => column.name !== 'id_locataire' && !COMPUTED_LEDGER_COLUMNS.has(column.name))
    .map((column) => `lm."${column.name}" AS "${column.name}"`)
    .join(',\n  ')

  const debut_bail = join_lots && lots_columns.has('debut_bail') ? 'occ."debut_bail"' : 'NULL'
  const fin_bail = join_lots && lots_columns.has('fin_bail') ? 'occ."fin_bail"' : 'NULL'
  const email_status = join_contacts && has_email ? 'email_c.status' : 'NULL'
  const telephone_status = join_contacts && has_phone ? 'tel_c.status' : 'NULL'

  let joins = `
  LEFT JOIN latest_movement lm ON lm."id_locataire" = b."id_locataire"`
  if (join_lots) {
    joins += `
  LEFT JOIN "${LOTS_TABLE}" occ
    ON occ."id_lot" = lm."id_lot" AND occ."id_locataire" = lm."id_locataire"
  LEFT JOIN "${LOTS_TABLE}" lot ON lot."id_lot" = lm."id_lot"`
  }
  if (join_contacts && has_email) {
    joins += `
  LEFT JOIN "${CONTACTS_TABLE}" email_c
    ON email_c.value = lower(trim(lm."email_client"))`
  }
  if (join_contacts && has_phone) {
    joins += `
  LEFT JOIN "${CONTACTS_TABLE}" tel_c ON tel_c.value = lm."telephone_client"
    OR tel_c.value = CASE
      WHEN replace(replace(replace(replace(lm."telephone_client", ' ', ''), '.', ''), '-', ''), '/', '')
        LIKE '0%'
      THEN '+33' || substr(
        replace(replace(replace(replace(lm."telephone_client", ' ', ''), '.', ''), '-', ''), '/', ''),
        2
      )
      ELSE replace(replace(replace(replace(lm."telephone_client", ' ', ''), '.', ''), '-', ''), '/', '')
    END`
  }

  return `
WITH ${ctes.join(',\n')}
SELECT
  b."id_locataire" AS id_locataire,
  b.solde_locataire AS solde_locataire,
  ${statut} AS statut,
  ${ratio} AS ratio_dette_loyer,
  ${email_status} AS email_status,
  ${telephone_status} AS telephone_status,
  ${debut_bail} AS debut_bail,
  ${fin_bail} AS fin_bail${movement_selects.length > 0 ? `,\n  ${movement_selects}` : ''}
FROM balances b${joins}`
}
