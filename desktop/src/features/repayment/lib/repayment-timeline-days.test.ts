import { describe, expect, test } from 'bun:test'

import {
  daysElapsedBetweenIsoDates,
  daysSinceIsoDate,
  daysSinceToday,
  todayIsoDate
} from './repayment-timeline-days'

describe('daysElapsedBetweenIsoDates', () => {
  test('retourne 0 le même jour calendaire', () => {
    expect(daysElapsedBetweenIsoDates('2026-06-29T18:40:00', '2026-06-29T08:15:00')).toBe(0)
  })

  test('calcule le nombre de jours entre deux jours distincts', () => {
    expect(daysElapsedBetweenIsoDates('2026-06-29T18:40:00', '2026-06-27T08:15:00')).toBe(2)
  })

  test('reste robuste avec décalages horaires ISO', () => {
    expect(daysElapsedBetweenIsoDates('2026-06-29T01:00:00+02:00', '2026-06-27T23:00:00Z')).toBe(1)
  })

  test('retourne 0 si date invalide', () => {
    expect(daysElapsedBetweenIsoDates('invalid', '2026-06-27T08:15:00')).toBe(0)
    expect(daysElapsedBetweenIsoDates('2026-06-29T18:40:00', 'invalid')).toBe(0)
  })

  test('compte les jours entre deux dates comptables DD/MM/YYYY', () => {
    // Du 28 février au 10 mars 2024 : 29 février inclus (année bissextile),
    // soit 11 jours. `new Date('28/02/2024')` est invalide et donnait 0.
    expect(daysElapsedBetweenIsoDates('10/03/2024', '28/02/2024')).toBe(11)

    // Du 5 janvier au 10 mars 2024 : 26 + 29 + 10 = 65 jours. Une lecture
    // mois/jour (1er mai → 3 octobre) donnerait 155.
    expect(daysElapsedBetweenIsoDates('10/03/2024', '05/01/2024')).toBe(65)
  })

  test('compte un jour entier malgré le passage à l’heure d’été', () => {
    // La nuit du 30 au 31 mars 2025 ne compte que 23 h en Europe/Paris ;
    // l'écart était arrondi à 0 jour.
    expect(daysElapsedBetweenIsoDates('2025-03-31', '2025-03-30')).toBe(1)
    expect(daysElapsedBetweenIsoDates('2025-04-02', '2025-03-30')).toBe(3)
  })
})

describe('daysSinceIsoDate', () => {
  test('compte les jours depuis un événement jusqu’à la référence', () => {
    expect(daysSinceIsoDate('2026-06-10T14:30:00', '2026-06-27')).toBe(17)
    expect(daysSinceIsoDate('2026-06-27T08:00:00', '2026-06-27')).toBe(0)
  })

  test('retourne 0 si l’événement est après la référence', () => {
    expect(daysSinceIsoDate('2026-08-10', '2026-07-08')).toBe(0)
  })
})

describe('daysSinceToday', () => {
  test('aujourd’hui − date_derniere_action_realisee', () => {
    const now = new Date(2026, 7, 10) // 10 août 2026 local
    expect(todayIsoDate(now)).toBe('2026-08-10')
    expect(daysSinceToday('2026-08-10T09:00:00', now)).toBe(0)
    expect(daysSinceToday('2026-07-08', now)).toBe(33)
    expect(daysSinceToday('2026-08-20', now)).toBe(0)
  })
})
