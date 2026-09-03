import { sql_date_key, sql_money_cents } from '../sql-normalization'
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
    return `${sql_date_key('m."date_exigibilite"')} DESC, m.rowid DESC`
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

const build_lot_active_condition = (lots_columns: Set<string>, alias = 'l'): string => {
  const column = (name: string) => (alias ? `${alias}."${name}"` : `"${name}"`)
  const today = sql_date_key("strftime('%Y-%m-%d', 'now')")
  const conditions: string[] = []
  if (lots_columns.has('fin_bail')) {
    const endDate = column('fin_bail')
    conditions.push(
      `(${endDate} IS NULL OR TRIM(CAST(${endDate} AS TEXT)) = '' OR ` +
        `${sql_date_key(endDate)} >= ${today})`
    )
  }
  return conditions.length > 0 ? `(${conditions.join(' AND ')})` : '1'
}

const build_lot_order = (lots_columns: Set<string>): string => {
  const active = `CASE WHEN ${build_lot_active_condition(lots_columns)} THEN 1 ELSE 0 END DESC`
  const end = lots_columns.has('fin_bail') ? `, ${sql_date_key('l."fin_bail"')} DESC` : ''
  const start = lots_columns.has('debut_bail') ? `, ${sql_date_key('l."debut_bail"')} DESC` : ''
  return `${active}${end}${start}, l.rowid DESC`
}

const build_deduplicated_lots_ctes = (lots_columns: Set<string>): string[] => {
  const order = build_lot_order(lots_columns)
  const active = build_lot_active_condition(lots_columns, '')
  return [
    `ranked_occupations AS (
  SELECT
    l.*,
    ROW_NUMBER() OVER (
      PARTITION BY l."id_lot", l."id_locataire"
      ORDER BY ${order}
    ) AS _ledger_occupation_rank
  FROM "${LOTS_TABLE}" l
),
occupations AS (
  SELECT * FROM ranked_occupations
  WHERE _ledger_occupation_rank = 1 AND ${active}
)`,
    `ranked_lots AS (
  SELECT
    l.*,
    ROW_NUMBER() OVER (
      PARTITION BY l."id_lot"
      ORDER BY ${order}
    ) AS _ledger_lot_rank
  FROM "${LOTS_TABLE}" l
),
lots AS (
  SELECT * FROM ranked_lots WHERE _ledger_lot_rank = 1
)`
  ]
}

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
    SUM(${sql_money_cents('"montant_en_euros"')}) / 100.0 AS solde_locataire
  FROM "${COMPTES_LOCATAIRES_TABLE}"
  WHERE ${non_empty_locataire}
  GROUP BY "id_locataire"
  HAVING SUM(${sql_money_cents('"montant_en_euros"')}) > 0
)`,
    build_latest_movement_cte(movement_column_list)
  ]
  if (join_lots) ctes.push(...build_deduplicated_lots_ctes(lots_columns))

  const statut = join_lots
    ? `CASE WHEN occ."id_locataire" IS NOT NULL THEN 'client' ELSE 'ex-client' END`
    : `'ex-client'`

  const rent =
    join_lots && lots_columns.has('loyer_mensuel_en_euros')
      ? `(${sql_money_cents('lot."loyer_mensuel_en_euros"')} / 100.0)`
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
  LEFT JOIN occupations occ
    ON occ."id_lot" = lm."id_lot" AND occ."id_locataire" = lm."id_locataire"
  LEFT JOIN lots lot ON lot."id_lot" = lm."id_lot"`
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
