import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test'

import { JSDOM } from 'jsdom'

import type { Activite } from '@/shared/types/activites'

import {
  buildApurementPlanOutput,
  createDefaultApurementPlanForm
} from '../lib/apurement-plan/defaults'
import { parseRepaymentPlanProposal } from '../lib/repayment-activity-text'

let installedDom = false
const originalGlobals = new Map<string, unknown>()

beforeAll(() => {
  const globals = globalThis as Record<string, unknown>
  const existingWindow = globals.window as { setTimeout?: unknown; Element?: unknown } | undefined
  const hasWorkingDom =
    typeof globals.document !== 'undefined' &&
    typeof existingWindow?.setTimeout === 'function' &&
    typeof globals.Element === 'function'

  if (!hasWorkingDom) {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
    for (const key of [
      'document',
      'window',
      'HTMLElement',
      'Element',
      'Node',
      'Event',
      'MouseEvent',
      'MutationObserver',
      'getComputedStyle',
      'requestAnimationFrame',
      'cancelAnimationFrame'
    ]) {
      originalGlobals.set(key, globals[key])
    }

    globalThis.document = dom.window.document
    globalThis.window = dom.window as unknown as Window & typeof globalThis
    globalThis.HTMLElement = dom.window.HTMLElement
    globalThis.Element = dom.window.Element
    globalThis.Node = dom.window.Node
    globalThis.Event = dom.window.Event
    globalThis.MouseEvent = dom.window.MouseEvent
    globalThis.MutationObserver = dom.window.MutationObserver
    globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window)
    globalThis.requestAnimationFrame = (callback) => window.setTimeout(callback, 0)
    globalThis.cancelAnimationFrame = (id) => window.clearTimeout(id)
    installedDom = true
  }
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

function planActivity(): Activite {
  const form = createDefaultApurementPlanForm()
  form.signed = false
  form.rentalDebt = 2423.61
  const output = buildApurementPlanOutput('LOC-1', form)
  return {
    id: 12,
    date_creation: '2026-08-19 10:00',
    rattachement: 'repayment:LOC-1',
    auteur: 'user:pierre',
    id_client: 'CLI-1',
    id_locataire: 'LOC-1',
    id_lot: null,
    statut: 'draft',
    mentions: [],
    type: 'repayment_plan',
    contenu: JSON.stringify({
      version: 1,
      titre: "Plan d'apurement",
      etat: 'brouillon',
      resume: {
        mensualite: output.summary.monthlyAmount,
        nombre_echeances: output.summary.durationMonths,
        montant_total: output.summary.totalDebt
      },
      note: 'À valider',
      formulaire: output.form,
      calculs: output.calculations
    })
  }
}

describe('RepaymentPlanProposalBody', () => {
  test('aligne les faits du plan sur des lignes icône → valeur', async () => {
    const { act } = await import('react')
    const { createRoot } = await import('react-dom/client')
    const { RepaymentPlanProposalBody } = await import('./RepaymentPlanProposalBody')

    const row = planActivity()
    const display = parseRepaymentPlanProposal(row)
    const onEditPlan = mock(() => {})

    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    await act(async () => {
      root.render(<RepaymentPlanProposalBody row={row} onEditPlan={onEditPlan} />)
    })

    const text = host.textContent ?? ''
    expect(text).toContain('Brouillon')
    expect(text).toContain('Non signé')
    expect(text).toContain(display?.resume ?? '')
    expect(text).toContain('À valider')
    expect(text).not.toContain("Plan d'apurement")
    expect(text).not.toContain('Dette')

    const card = host.querySelector('.rounded-md.border')
    expect(card).not.toBeNull()
    expect(card?.textContent).toContain('Brouillon')
    expect(card?.textContent).toContain('Non signé')
    expect(card?.textContent).toContain('Modifier')
    expect(card?.textContent).not.toContain('À valider')

    const edit = [...host.querySelectorAll('button')].find(
      (button) => button.textContent === 'Modifier'
    )
    expect(edit).toBeDefined()
    await act(async () => {
      edit?.click()
    })
    expect(onEditPlan).toHaveBeenCalledTimes(1)

    await act(async () => {
      root.unmount()
    })
    host.remove()
  })

  test('remplace Modifier par Voir quand le plan est signé', async () => {
    const { act } = await import('react')
    const { createRoot } = await import('react-dom/client')
    const { RepaymentPlanProposalBody } = await import('./RepaymentPlanProposalBody')

    const row = planActivity()
    const payload = JSON.parse(row.contenu) as Record<string, unknown>
    const form = payload['formulaire'] as Record<string, unknown>
    row.statut = 'logged'
    row.contenu = JSON.stringify({
      ...payload,
      etat: 'signe',
      formulaire: { ...form, signed: true }
    })
    const onEditPlan = mock(() => {})

    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)
    await act(async () => {
      root.render(<RepaymentPlanProposalBody row={row} onEditPlan={onEditPlan} />)
    })

    const labels = [...host.querySelectorAll('button')].map((button) => button.textContent)
    expect(labels).toContain('Voir')
    expect(labels).not.toContain('Modifier')

    await act(async () => {
      root.unmount()
    })
    host.remove()
  })
})
