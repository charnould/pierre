import { describe, expect, test } from 'bun:test'

import {
  GUEST_ACCESSIBLE_TABS,
  isGuestAccessibleTab,
  isTab,
  PANEL_NAV_TABS,
  TAB_REGISTRY,
  TABS
} from './tab-registry'

describe('tab-registry', () => {
  test('TABS matches registry ids', () => {
    expect(TABS).toEqual(TAB_REGISTRY.map((entry) => entry.id))
  })

  test('panel tabs exclude utility footer tabs', () => {
    expect(PANEL_NAV_TABS).not.toContain('settings')
    expect(PANEL_NAV_TABS).not.toContain('home')
    expect(PANEL_NAV_TABS).toContain('automations')
    expect(PANEL_NAV_TABS).toContain('bulk')
  })

  test('automations and bulk have distinct home labels', () => {
    const byId = Object.fromEntries(TAB_REGISTRY.map((entry) => [entry.id, entry.identity.label]))
    expect(byId['automations']).toBe('Créer des automatisations')
    expect(byId['bulk']).toBe('Contacter par lots')
  })

  test('attributions and ventes have distinct home labels', () => {
    const byId = Object.fromEntries(TAB_REGISTRY.map((entry) => [entry.id, entry.identity.label]))
    expect(byId['attributions']).toBe('Piloter les attributions')
    expect(byId['ventes']).toBe('Piloter les ventes')
  })

  test('guest accessible tabs', () => {
    expect(GUEST_ACCESSIBLE_TABS).toEqual(['settings'])
    expect(isGuestAccessibleTab('settings')).toBe(true)
    expect(isGuestAccessibleTab('tickets')).toBe(false)
  })

  test('isTab accepts registry ids', () => {
    for (const id of TABS) {
      expect(isTab(id)).toBe(true)
    }
    expect(isTab('request')).toBe(false)
  })
})
