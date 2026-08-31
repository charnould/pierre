import { describe, expect, test } from 'bun:test'

import {
  buildTenantBalanceSeries,
  computeDebtEpisodeMetrics,
  debtEpisodeTrend,
  formatTenantBalancePeriodLabel,
  resolveTenantDebtEpisode,
  selectDebtEpisode
} from './build-tenant-balance-series'

function monthSeries(
  startYear: number,
  startMonth: number,
  balances: number[]
): ReturnType<typeof buildTenantBalanceSeries> {
  const movements = balances.map((balance, index) => {
    const month = startMonth + index
    const year = startYear + Math.floor((month - 1) / 12)
    const normalizedMonth = ((month - 1) % 12) + 1
    const period = `${year}-${String(normalizedMonth).padStart(2, '0')}-01`
    const previous = index === 0 ? 0 : balances[index - 1]!
    return {
      date_exigibilite: period,
      montant_en_euros: balance - previous
    }
  })
  return buildTenantBalanceSeries(movements)
}

describe('buildTenantBalanceSeries', () => {
  test('agrège les mouvements par mois et cumule depuis le début', () => {
    const series = buildTenantBalanceSeries([
      { date_exigibilite: '2024-01-15', montant_en_euros: 100 },
      { date_exigibilite: '2024-02-10', montant_en_euros: 50 },
      { date_exigibilite: '2024-02-20', montant_en_euros: -30 },
      { date_exigibilite: '2024-03-01', montant_en_euros: 20 }
    ])

    expect(series).toEqual([
      { period: '2024-01', label: formatTenantBalancePeriodLabel('2024-01'), balance: 100 },
      { period: '2024-02', label: formatTenantBalancePeriodLabel('2024-02'), balance: 120 },
      { period: '2024-03', label: formatTenantBalancePeriodLabel('2024-03'), balance: 140 }
    ])
  })

  test('retourne null sans mouvements datés', () => {
    expect(buildTenantBalanceSeries([])).toBeNull()
    expect(buildTenantBalanceSeries([{ montant_en_euros: 100 }])).toBeNull()
  })

  test('ramène à 0 le solde d’un paiement intégral, sans résidu flottant', () => {
    // 199,09 + 645,97 = 845,06 € exactement. Le cumul flottant laissait
    // 1,1368683772161603e-13 €, soit un solde « > 0 ».
    const series = buildTenantBalanceSeries(SOLDE_INTEGRAL)!

    expect(series.map((point) => point.balance)).toEqual([199.09, 845.06, 0])
  })
})

/** Trois mois de dette réglés d'un seul versement : 199,09 + 645,97 − 845,06 = 0. */
const SOLDE_INTEGRAL = [
  { date_exigibilite: '2024-01-05', montant_en_euros: 199.09 },
  { date_exigibilite: '2024-02-05', montant_en_euros: 645.97 },
  { date_exigibilite: '2024-03-05', montant_en_euros: -845.06 }
]

describe('épisode de dette soldé au centime près', () => {
  test('referme l’épisode quand le locataire a tout réglé', () => {
    const series = buildTenantBalanceSeries(SOLDE_INTEGRAL)!
    const episode = selectDebtEpisode(series, series.at(-1)!.balance)

    expect(episode?.map((point) => point.balance)).toEqual([0, 199.09, 845.06, 0])
    expect(episode?.at(-1)?.balance).toBe(0)
  })

  test('ne rattache pas une dette neuve à l’épisode déjà soldé', () => {
    // Loyer d'avril après un solde intégral en mars : la dette a un mois, pas
    // quatre. Le résidu flottant empêchait l'épisode de mars de se refermer,
    // et l'âge de la dette repartait de janvier.
    const series = buildTenantBalanceSeries([
      ...SOLDE_INTEGRAL,
      { date_exigibilite: '2024-04-05', montant_en_euros: 512.37 }
    ])!
    const episode = selectDebtEpisode(series, series.at(-1)!.balance)

    expect(episode?.map((point) => point.period)).toEqual(['2024-03', '2024-04'])
    expect(computeDebtEpisodeMetrics(episode)).toEqual({
      firstUnpaidPeriod: '2024-04',
      firstUnpaidLabel: formatTenantBalancePeriodLabel('2024-04'),
      ageMonths: 1
    })
  })
})

describe('selectDebtEpisode', () => {
  test('préfixe le mois précédent à 0 avant la première dette', () => {
    const series = monthSeries(2024, 2, [0, 100, 150])!
    const episode = selectDebtEpisode(series, 150)

    expect(episode?.map((point) => point.period)).toEqual(['2024-02', '2024-03', '2024-04'])
    expect(episode?.map((point) => point.balance)).toEqual([0, 100, 150])
  })

  test('conserve un point par mois sur un épisode de 20 mois de dette', () => {
    const balances = [0, ...Array.from({ length: 20 }, (_, index) => 100 + index * 10)]
    const series = monthSeries(2023, 2, balances)!
    const episode = selectDebtEpisode(series, balances.at(-1)!)!

    expect(episode).toHaveLength(21)
  })

  test('choisit le bon épisode quand la dette repasse à 0 puis repart', () => {
    const series = monthSeries(2024, 1, [0, 100, 150, 0, 80, 120])!

    const firstEpisode = selectDebtEpisode(series, 0)
    expect(firstEpisode?.map((point) => point.balance)).toEqual([0, 100, 150, 0])

    const secondEpisode = selectDebtEpisode(series, 120)
    expect(secondEpisode?.map((point) => point.balance)).toEqual([0, 80, 120])
  })

  test('retourne null sans dette', () => {
    const series = monthSeries(2024, 1, [0, 0, 0])!
    expect(selectDebtEpisode(series, 0)).toBeNull()
    expect(selectDebtEpisode(series, -10)).toBeNull()
  })
})

describe('computeDebtEpisodeMetrics', () => {
  test('compte les mois calendaires inclusifs depuis le premier impayé', () => {
    const episode = selectDebtEpisode(monthSeries(2024, 1, [0, 100, 150, 200, 250])!, 250)
    const metrics = computeDebtEpisodeMetrics(episode)

    expect(metrics).toEqual({
      firstUnpaidPeriod: '2024-02',
      firstUnpaidLabel: formatTenantBalancePeriodLabel('2024-02'),
      ageMonths: 4
    })
  })

  test('retourne null sans épisode', () => {
    expect(computeDebtEpisodeMetrics(null)).toBeNull()
    expect(computeDebtEpisodeMetrics([])).toBeNull()
  })
})

describe('resolveTenantDebtEpisode', () => {
  test('résout l’épisode courant depuis les mouvements', () => {
    const movements = [
      { date_exigibilite: '2024-01-01', montant_en_euros: 100 },
      { date_exigibilite: '2024-02-01', montant_en_euros: 50 }
    ]
    const episode = resolveTenantDebtEpisode(movements, 150)

    expect(episode?.map((point) => point.balance)).toEqual([0, 100, 150])
  })
})

describe('debtEpisodeTrend', () => {
  const point = (balance: number) => ({ period: '2024-01', label: 'janv. 24', balance })

  test('compare le premier et le dernier solde de l’épisode', () => {
    expect(debtEpisodeTrend([point(0), point(100), point(150)])).toBe('up')
    expect(debtEpisodeTrend([point(400), point(250), point(100)])).toBe('down')
    expect(debtEpisodeTrend([point(200), point(200)])).toBe('flat')
  })

  test('reste plat sans assez de points', () => {
    expect(debtEpisodeTrend(null)).toBe('flat')
    expect(debtEpisodeTrend([point(80)])).toBe('flat')
  })
})
