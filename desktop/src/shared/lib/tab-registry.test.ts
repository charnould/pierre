import { describe, expect, test } from 'bun:test'

import {
  canAccessTab,
  GUEST_ACCESSIBLE_TABS,
  isGuestAccessibleTab,
  isPanelTabVisible,
  isTab,
  moduleIdForTab,
  PANEL_FLAGS,
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
    expect(PANEL_NAV_TABS).toContain('chat')
    expect(PANEL_NAV_TABS).toContain('automations')
    expect(PANEL_NAV_TABS).toContain('bulk')
  })

  test('placeholder doors follow PANEL_FLAGS', () => {
    expect(Object.keys(PANEL_FLAGS)).toEqual(['insurance', 'relocation', 'attributions', 'ventes'])
    for (const tab of Object.keys(PANEL_FLAGS) as (keyof typeof PANEL_FLAGS)[]) {
      expect(isTab(tab)).toBe(true)
      expect(isPanelTabVisible(tab)).toBe(PANEL_FLAGS[tab])
      if (PANEL_FLAGS[tab]) expect(PANEL_NAV_TABS).toContain(tab)
      else expect(PANEL_NAV_TABS).not.toContain(tab)
    }
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

  test('maps business tabs to their access ids', () => {
    expect(moduleIdForTab('tickets')).toBe('tickets')
    expect(moduleIdForTab('chat')).toBeNull()
    expect(moduleIdForTab('administration')).toBeNull()
  })

  test('enforces module and administrator access independently', () => {
    const collaborator = {
      isAdministrator: false,
      moduleIds: ['tickets'] as const
    }
    expect(canAccessTab('home', collaborator)).toBe(true)
    expect(canAccessTab('chat', collaborator)).toBe(true)
    expect(canAccessTab('chat', null)).toBe(false)
    expect(canAccessTab('tickets', collaborator)).toBe(true)
    expect(canAccessTab('repayment', collaborator)).toBe(false)
    expect(canAccessTab('relocation', collaborator)).toBe(false)
    expect(canAccessTab('relocation', { ...collaborator, moduleIds: ['relocation'] })).toBe(
      PANEL_FLAGS.relocation
    )
    expect(canAccessTab('administration', collaborator)).toBe(false)
    expect(canAccessTab('administration', { ...collaborator, isAdministrator: true })).toBe(true)
    expect(canAccessTab('settings', null)).toBe(true)
  })
})
