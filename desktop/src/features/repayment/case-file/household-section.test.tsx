import { afterAll, beforeAll, describe, expect, test } from 'bun:test'

import {
  blankAdult,
  blankChild,
  type CommonData,
  emptyRepaymentCaseFile
} from '@pierre/shared/repayment-case-file'
import { JSDOM } from 'jsdom'
import { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'

import { TooltipProvider } from '@/shared/components/ui/tooltip'

import { HouseholdSection, patchAdult } from './household-section'
import { normalizeCaseFile } from './normalize-case-file'

let installedDom = false
const originalGlobals = new Map<string, unknown>()

beforeAll(() => {
  if (typeof globalThis.document !== 'undefined') return
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
  const globals = globalThis as Record<string, unknown>
  const win = dom.window as unknown as Record<string, unknown>
  for (const key of [
    'document',
    'window',
    'HTMLElement',
    'HTMLButtonElement',
    'HTMLInputElement',
    'Element',
    'Node',
    'Event',
    'InputEvent',
    'MouseEvent',
    'KeyboardEvent',
    'MutationObserver',
    'getComputedStyle'
  ]) {
    originalGlobals.set(key, globals[key])
    globals[key] =
      key === 'document'
        ? dom.window.document
        : key === 'getComputedStyle'
          ? dom.window.getComputedStyle.bind(dom.window)
          : win[key]
  }
  globalThis.requestAnimationFrame = (callback) => window.setTimeout(callback, 0)
  globalThis.cancelAnimationFrame = (id) => window.clearTimeout(id)
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  installedDom = true
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})

afterAll(() => {
  if (!installedDom) return
  const globals = globalThis as Record<string, unknown>
  for (const [key, value] of originalGlobals) {
    if (value === undefined) delete globals[key]
    else globals[key] = value
  }
})

describe('HouseholdSection', () => {
  test('affiche un adulte ou un enfant par ligne de table', () => {
    const common = emptyRepaymentCaseFile().donnees_communes
    common.foyer.adultes = [
      { ...blankAdult('personne_1'), prenom: 'Ada', nom: 'Martin' },
      { ...blankAdult('personne_2'), prenom: 'Sam', nom: 'Durand' }
    ]
    common.foyer.enfants = [{ ...blankChild('personne_3'), prenom: 'Noa' }]

    const document = staticDocument(common)
    const tables = document.querySelectorAll('table')

    expect(document.querySelectorAll('[data-person-card]')).toHaveLength(0)
    expect(tables).toHaveLength(2)
    expect(tables[0]?.querySelectorAll('tbody tr')).toHaveLength(2)
    expect(tables[1]?.querySelectorAll('tbody tr')).toHaveLength(1)
    expect(tables[0]?.textContent).toContain('Détails')
    expect(tables[0]?.textContent).toContain('Situation au bail')
    expect(tables[0]?.textContent).not.toContain('Résidence')
    expect(tables[1]?.textContent).toContain('Résidence')
    expect(document.getElementById('adult_0_prenom')).not.toBeNull()
    expect(document.getElementById('adult_1_nom')).not.toBeNull()
    expect(document.getElementById('adult_0_mode_residence')).toBeNull()
    expect(document.getElementById('child_0_prenom')).not.toBeNull()
    expect(document.getElementById('child_0_mode_residence')).not.toBeNull()
    expect(document.querySelector('button[aria-label="Détails de Ada Martin"]')).not.toBeNull()
    expect(document.querySelector('[data-slot="popover-content"]')).toBeNull()
  })

  test('édite les détails du bon adulte dans un Popover', async () => {
    const initial = emptyRepaymentCaseFile().donnees_communes
    initial.foyer.adultes = [
      {
        ...blankAdult('personne_1'),
        prenom: 'Ada',
        nom: 'Martin',
        statut_bail: 'titulaire_actuel',
        mode_residence: 'permanente',
        date_fin_solidarite: '2026-06-15'
      },
      {
        ...blankAdult('personne_2'),
        prenom: 'Sam',
        nom: 'Durand',
        mode_residence: 'occasionnelle',
        adresse_correspondance: { adresse: '1 rue Haute', code_postal: null, commune: null }
      }
    ]
    const mounted = await mountHousehold(initial)

    await click(button(mounted.host, 'Détails de Ada Martin'))
    const popover = document.querySelector('[data-slot="popover-content"]')
    expect(popover?.textContent).not.toContain('Occupation du logement')
    expect(popover?.textContent).not.toContain('Préavis et solidarité')
    expect(popover?.querySelector('legend')).toBeNull()
    expect(labelText('adult_0_mode_residence')).toBe('Occupation')
    expect(descriptionAfter('adult_0_mode_residence')).toBe(
      'Présence réelle de la personne dans le logement.'
    )
    expect(document.getElementById('adult_0_correspondance_adresse')).toBeNull()
    expect(document.getElementById('adult_0_correspondance_code_postal')).toBeNull()
    expect(document.getElementById('adult_0_correspondance_commune')).toBeNull()
    expect(descriptionAfter('adult_0_date_reception_preavis')).toBe(
      'Jour où le bailleur a reçu le congé.'
    )
    expect(descriptionAfter('adult_0_date_effet_conge')).toBe('Jour où le congé prend effet.')
    expect(descriptionAfter('adult_0_date_fin_solidarite')).toBe(
      'Dernier jour de solidarité du titulaire parti.'
    )
    const solidarity = document.getElementById('adult_0_date_fin_solidarite')
    expect(solidarity?.getAttribute('data-slot')).toBe('date-field')
    expect(solidarity?.className.split(/\s+/)).toContain('w-fit')
    expect(solidarity?.hasAttribute('disabled')).toBe(false)
    expect(solidarity?.textContent).toContain('15/06/2026')

    await click(button(mounted.host, 'Détails de Ada Martin'))
    await click(button(mounted.host, 'Détails de Sam Durand'))
    expect(document.querySelector('[data-slot="popover-title"]')?.textContent).toContain(
      'Détails — Sam Durand'
    )
    expect(labelText('adult_1_correspondance_adresse')).toBe('Adresse de correspondance')
    expect(descriptionAfter('adult_1_correspondance_adresse')).toBe(
      'Adresse postale, distincte de celle du logement.'
    )
    expect(document.getElementById('adult_1_date_reception_preavis')).toBeNull()
    expect(document.getElementById('adult_1_date_effet_conge')).toBeNull()
    expect(document.getElementById('adult_1_date_fin_solidarite')).toBeNull()
    const postal = document.getElementById('adult_1_correspondance_code_postal')
    const city = document.getElementById('adult_1_correspondance_commune')
    const locality = postal?.closest('[data-slot="field-group"]')
    expect(locality).toBe(city?.closest('[data-slot="field-group"]'))
    expect(locality?.className.split(/\s+/)).toContain('flex-row')
    expect(postal?.getAttribute('placeholder')).toBe('Code postal')
    expect(city?.getAttribute('placeholder')).toBe('Ville')
    expect(
      document.querySelector('label[for="adult_1_correspondance_code_postal"]')?.className
    ).toContain('sr-only')
    expect(
      document.querySelector('label[for="adult_1_correspondance_commune"]')?.className
    ).toContain('sr-only')

    const address = document.getElementById('adult_1_correspondance_adresse')
    expect(address?.getAttribute('placeholder')).toBe('12 rue des Lilas')
    const inputWindow = address?.ownerDocument.defaultView
    if (!inputWindow || !(address instanceof inputWindow.HTMLInputElement)) {
      throw new Error('Champ adresse introuvable')
    }
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        inputWindow.HTMLInputElement.prototype,
        'value'
      )?.set
      setter?.call(address, '2 rue Basse')
      address.dispatchEvent(new InputEvent('input', { bubbles: true }))
    })
    expect(mounted.current().foyer.adultes[1]?.adresse_correspondance?.adresse).toBe('2 rue Basse')

    await mounted.unmount()
  })

  test('ajoute et retire les personnes sans pouvoir retirer le dernier adulte', async () => {
    const mounted = await mountHousehold(emptyRepaymentCaseFile().donnees_communes)

    expect(button(mounted.host, 'Retirer Adulte 1').disabled).toBe(true)

    await click(button(mounted.host, 'Ajouter un adulte'))
    expect(mounted.current().foyer.adultes).toHaveLength(2)
    expect(button(mounted.host, 'Retirer Adulte 1').disabled).toBe(false)

    await click(button(mounted.host, 'Retirer Adulte 2'))
    expect(mounted.current().foyer.adultes).toHaveLength(1)

    await click(button(mounted.host, 'Ajouter un enfant'))
    expect(mounted.current().foyer.enfants).toHaveLength(1)

    await click(button(mounted.host, 'Retirer'))
    expect(mounted.current().foyer.enfants).toHaveLength(0)

    await mounted.unmount()
  })

  test('garde la fin de solidarité saisie et l’adresse seulement hors occupation permanente', () => {
    const adult = {
      ...blankAdult(),
      statut_bail: 'titulaire_actuel' as const,
      mode_residence: 'occasionnelle' as const,
      date_reception_preavis: '2026-01-31',
      date_effet_conge: '2026-02-28',
      date_fin_solidarite: '2026-06-15',
      adresse_correspondance: { adresse: '1 rue Haute', code_postal: '21000', commune: 'Dijon' }
    }
    const hidden = patchAdult(adult, { statut_bail: 'non_titulaire' })
    expect(hidden.statut_bail).toBe('non_titulaire')
    expect(hidden.date_reception_preavis).toBe('2026-01-31')
    expect(hidden.date_effet_conge).toBe('2026-02-28')
    expect(hidden.date_fin_solidarite).toBe('2026-06-15')
    expect(hidden.adresse_correspondance).toEqual(adult.adresse_correspondance)
    expect(patchAdult(adult, { date_fin_solidarite: '2026-08-01' }).date_fin_solidarite).toBe(
      '2026-08-01'
    )
    expect(patchAdult(adult, { mode_residence: 'non_occupante' }).adresse_correspondance).toEqual(
      adult.adresse_correspondance
    )
    expect(patchAdult(adult, { mode_residence: 'permanente' }).adresse_correspondance).toBeNull()
    expect(patchAdult(adult, { mode_residence: null }).adresse_correspondance).toBeNull()

    const caseFile = emptyRepaymentCaseFile()
    const savedAdult = caseFile.donnees_communes.foyer.adultes[0]!
    savedAdult.mode_residence = 'occasionnelle'
    savedAdult.date_fin_solidarite = '2020-01-01'
    savedAdult.adresse_correspondance = { adresse: '  ', code_postal: null, commune: 'Dijon' }
    const saved = normalizeCaseFile(caseFile).donnees_communes.foyer.adultes[0]!
    expect(saved.date_fin_solidarite).toBe('2020-01-01')
    expect(saved.adresse_correspondance).toEqual({
      adresse: null,
      code_postal: null,
      commune: 'Dijon'
    })
    savedAdult.mode_residence = 'permanente'
    expect(
      normalizeCaseFile(caseFile).donnees_communes.foyer.adultes[0]?.adresse_correspondance
    ).toBeNull()
  })
})

function staticDocument(value: CommonData) {
  return new JSDOM(
    renderToStaticMarkup(<HouseholdSection household={value.foyer} onChange={() => {}} />)
  ).window.document
}

async function mountHousehold(initial: CommonData) {
  let current = initial
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)

  function Harness() {
    const [value, setValue] = useState(initial)
    current = value
    return (
      <TooltipProvider>
        <HouseholdSection
          household={value.foyer}
          onChange={(foyer) => setValue({ ...value, foyer })}
        />
      </TooltipProvider>
    )
  }

  await act(async () => root.render(<Harness />))
  return {
    host,
    current: () => current,
    unmount: async () => {
      await act(async () => root.unmount())
      host.remove()
    }
  }
}

async function click(target: HTMLButtonElement) {
  await act(async () => {
    target.click()
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

function labelText(id: string) {
  return document.querySelector(`label[for="${id}"]`)?.textContent?.trim() ?? ''
}

function descriptionAfter(id: string) {
  const next = document.querySelector(`label[for="${id}"]`)?.nextElementSibling
  if (next?.getAttribute('data-slot') !== 'field-description') return ''
  return next.textContent?.replace(/\s+/g, ' ').trim() ?? ''
}

function button(host: ParentNode, name: string) {
  const match = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
    (item) => item.textContent?.trim() === name || item.getAttribute('aria-label') === name
  )
  if (!match) throw new Error(`Bouton introuvable : ${name}`)
  return match
}
