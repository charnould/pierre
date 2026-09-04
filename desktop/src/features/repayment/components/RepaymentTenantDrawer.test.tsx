import { afterAll, beforeAll, describe, expect, mock, test } from 'bun:test'

import { JSDOM } from 'jsdom'

import type { Activite } from '@/shared/types/activites'

import {
  buildApurementPlanOutput,
  createDefaultApurementPlanForm
} from '../lib/apurement-plan/defaults'

mock.module('../lib/outbound-email-templates.bundle', () => ({
  listOutboundTemplateGroups: () => [],
  listOutboundTemplates: () => [],
  resolveOutboundEmail: () => null,
  resolveOutboundRcs: () => null
}))

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
  }
  if (typeof globalThis.ResizeObserver !== 'function') {
    originalGlobals.set('ResizeObserver', (globalThis as Record<string, unknown>).ResizeObserver)
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  }
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})

afterAll(() => {
  if (originalGlobals.size === 0) return
  const globals = globalThis as Record<string, unknown>
  for (const [key, value] of originalGlobals) {
    if (value === undefined) delete globals[key]
    else globals[key] = value
  }
})

async function verifyClose(embedded: boolean) {
  const { act } = await import('react')
  const { createRoot } = await import('react-dom/client')
  const { Drawer, DrawerContent } = await import('@/shared/components/ui/drawer')
  const { RepaymentTenantDrawer } = await import('./RepaymentTenantDrawer')
  const onOpenChange = mock((_open: boolean) => {})
  const onHostClick = mock(() => {})
  const onHostPointerDown = mock(() => {})

  window.api = {
    getRepaymentTimeline: () => new Promise(() => {})
  } as unknown as typeof window.api

  const drawerFor = (sheetOpenToken: number) => (
    <RepaymentTenantDrawer
      url="https://drawer-close.test"
      userLogin="alice"
      open
      onOpenChange={onOpenChange}
      sheetOpenToken={sheetOpenToken}
      embedded={embedded}
      tenant={{
        id_client: `CLI-${sheetOpenToken}`,
        id_locataire: `LOC-${sheetOpenToken}`,
        solde_locataire: 100
      }}
      onAddNote={() => true}
      onAdvancementChange={() => true}
      onTagsChange={() => true}
      onCreatePlan={() => {}}
    />
  )
  const hostFor = (sheetOpenToken: number) => {
    const drawer = drawerFor(sheetOpenToken)
    return (
      <div onClick={onHostClick} onPointerDown={onHostPointerDown}>
        {embedded ? (
          <Drawer key={sheetOpenToken} open onOpenChange={() => {}} swipeDirection="right">
            <DrawerContent>{drawer}</DrawerContent>
          </Drawer>
        ) : (
          drawer
        )}
      </div>
    )
  }

  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(hostFor(1))
    await new Promise((resolve) => window.setTimeout(resolve, 100))
  })

  const closeButtons = document.querySelectorAll<HTMLButtonElement>(
    'button[aria-label="Fermer le dossier"]'
  )
  const closeButton = closeButtons.item(closeButtons.length - 1)
  if (!closeButton) throw new Error(document.body.innerHTML)
  expect(closeButton).not.toBeNull()
  onHostClick.mockClear()
  onHostPointerDown.mockClear()

  await act(async () => {
    closeButton.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
    closeButton?.click()
  })

  await act(async () => {
    root.render(hostFor(2))
    await new Promise((resolve) => window.setTimeout(resolve, 100))
  })
  const reopenedCloseButtons = document.querySelectorAll<HTMLButtonElement>(
    'button[aria-label="Fermer le dossier"]'
  )
  const reopenedCloseButton = reopenedCloseButtons.item(reopenedCloseButtons.length - 1)
  if (!reopenedCloseButton) throw new Error(document.body.innerHTML)
  await act(async () => {
    reopenedCloseButton.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
    reopenedCloseButton.click()
  })

  expect(onOpenChange).toHaveBeenCalledWith(false)
  expect(onOpenChange.mock.calls).toEqual([[false], [false]])
  expect(onHostClick).not.toHaveBeenCalled()
  expect(onHostPointerDown).not.toHaveBeenCalled()

  await act(async () => {
    root.unmount()
  })
  container.remove()
}

function gestionnaireActivity(login: string, email: string): Activite {
  return {
    id: 1,
    rattachement: 'repayment:LOC-GESTIONNAIRE',
    auteur: 'user:alice@exemple.fr',
    id_client: null,
    id_locataire: 'LOC-GESTIONNAIRE',
    id_lot: null,
    date_creation: '2026-08-08 18:00',
    type: 'case_assignment',
    contenu: JSON.stringify({ version: 1, referent: email, login }),
    statut: 'logged',
    mentions: []
  }
}

function tagActivity(tags: string[]): Activite {
  return {
    id: 3,
    rattachement: 'repayment:LOC-GESTIONNAIRE',
    auteur: 'user:alice@exemple.fr',
    id_client: null,
    id_locataire: 'LOC-GESTIONNAIRE',
    id_lot: null,
    date_creation: '2026-08-09 18:00',
    type: 'case_tag_change',
    contenu: JSON.stringify({ version: 1, tags_precedents: [], tags }),
    statut: 'logged',
    mentions: []
  }
}

async function verifyGestionnaire(
  activities: Activite[],
  expectedDisplay: string,
  expectedTitle?: string
) {
  const { act } = await import('react')
  const { createRoot } = await import('react-dom/client')
  const { Drawer, DrawerContent } = await import('@/shared/components/ui/drawer')
  const { RepaymentTenantDrawer } = await import('./RepaymentTenantDrawer')

  window.api = {
    getRepaymentTimeline: async () => ({
      data: {
        movements: [],
        notifications: activities,
        openActionEvents: activities.filter(
          (activity) => activity.type === 'action' && activity.state === 'a_faire'
        )
      },
      errors: { movements: false, notifications: false, openActions: false }
    })
  } as unknown as typeof window.api

  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(
      <Drawer open onOpenChange={() => {}} swipeDirection="right">
        <DrawerContent>
          <RepaymentTenantDrawer
            url={`https://gestionnaire-${expectedDisplay}.test`}
            userLogin="alice"
            open
            onOpenChange={() => {}}
            sheetOpenToken={1}
            embedded
            tenant={{
              id_client: 'CLI-GESTIONNAIRE',
              id_locataire: 'LOC-GESTIONNAIRE',
              solde_locataire: 100
            }}
            onAddNote={() => true}
            onAdvancementChange={() => true}
            onTagsChange={() => true}
            onCreatePlan={() => {}}
          />
        </DrawerContent>
      </Drawer>
    )
    await new Promise((resolve) => window.setTimeout(resolve, 100))
  })

  const label = [...document.querySelectorAll('span')].find(
    (element) => element.textContent === 'Référent'
  )
  expect(label?.parentElement?.textContent).toContain(expectedDisplay)
  if (expectedTitle) {
    expect(label?.parentElement?.querySelector(`[title="${expectedTitle}"]`)).not.toBeNull()
  }

  await act(async () => {
    root.unmount()
  })
  container.remove()
}

describe('RepaymentTenantDrawer close button', () => {
  test('requests closing the standalone drawer', async () => {
    await verifyClose(false)
  })

  test('requests closing the embedded notifications drawer', async () => {
    await verifyClose(true)
  })
})

describe('RepaymentTenantDrawer shell', () => {
  test('animates from its closed state and uses a floating shell', async () => {
    const { act } = await import('react')
    const { createRoot } = await import('react-dom/client')
    const { RepaymentTenantDrawer } = await import('./RepaymentTenantDrawer')

    window.api = {
      getRepaymentTimeline: () => new Promise(() => {})
    } as unknown as typeof window.api

    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)
    const originalRequestAnimationFrame = globalThis.requestAnimationFrame
    const originalWindowRequestAnimationFrame = window.requestAnimationFrame
    let animationFrameId = 0
    const holdAnimationFrame = () => ++animationFrameId
    globalThis.requestAnimationFrame = holdAnimationFrame
    window.requestAnimationFrame = holdAnimationFrame

    try {
      await act(async () => {
        root.render(
          <RepaymentTenantDrawer
            url="https://drawer-shell.test"
            userLogin="alice"
            open={false}
            onOpenChange={() => {}}
            sheetOpenToken={0}
            tenant={null}
            onAddNote={() => true}
            onAdvancementChange={() => true}
            onTagsChange={() => true}
            onCreatePlan={() => {}}
          />
        )
      })

      await act(async () => {
        root.render(
          <RepaymentTenantDrawer
            url="https://drawer-shell.test"
            userLogin="alice"
            open
            onOpenChange={() => {}}
            sheetOpenToken={1}
            tenant={{
              id_client: 'CLI-SHELL',
              id_locataire: 'LOC-SHELL',
              solde_locataire: 100
            }}
            onAddNote={() => true}
            onAdvancementChange={() => true}
            onTagsChange={() => true}
            onCreatePlan={() => {}}
          />
        )
      })

      const popup = document.querySelector<HTMLElement>('[data-slot="drawer-popup"]')
      expect(popup).not.toBeNull()
      expect(popup?.hasAttribute('data-starting-style')).toBe(true)
      expect(popup?.classList.contains('[--drawer-bleed-background:transparent]')).toBe(true)
      expect(popup?.classList.contains('[--drawer-inset:0.75rem]')).toBe(true)
      expect(popup?.classList.contains('rounded-md')).toBe(true)
      expect(popup?.classList.contains('border')).toBe(true)
      expect(popup?.classList.contains('shadow-md')).toBe(true)
      expect(popup?.classList.contains('inspector-drawer-motion')).toBe(true)
      expect(popup?.className).toContain('top-[var(--titlebar-height)]')
      expect(
        popup?.classList.contains('data-[swipe-axis=x]:sm:[--drawer-content-width:60rem]')
      ).toBe(true)
      const header = popup?.querySelector('[data-slot="drawer-header"]')
      expect(header?.getAttribute('data-inspector-motion')).toBe('header')
      expect(popup?.querySelector('[data-inspector-motion="body"]')).not.toBeNull()
      const title = header?.querySelector('[data-slot="drawer-title"]')
      expect(title?.textContent).toBe('CLI-SHELL · LOC-SHELL')
      expect(title?.classList.contains('text-sm')).toBe(true)
      expect(title?.classList.contains('font-sans')).toBe(true)
      expect(title?.classList.contains('whitespace-nowrap')).toBe(true)
      expect(header?.querySelector('[data-slot="avatar"]')).toBeNull()
    } finally {
      globalThis.requestAnimationFrame = originalRequestAnimationFrame
      window.requestAnimationFrame = originalWindowRequestAnimationFrame

      await act(async () => {
        root.unmount()
      })
      container.remove()
    }
  })
})

describe('RepaymentTenantDrawer top card', () => {
  test('affiche le gestionnaire affecté', async () => {
    await verifyGestionnaire(
      [gestionnaireActivity('cdubois', 'cdubois@example.org')],
      'Cdubois',
      'cdubois@example.org'
    )
  })

  test('affiche explicitement l’absence de gestionnaire', async () => {
    await verifyGestionnaire([], 'Non affecté')
  })

  test('ordonne les métadonnées Dette, Courriel, Téléphone, Référent, Groupe, action, Tags', async () => {
    const { cleanup } = await renderNotesDrawer('alice@exemple.fr', [
      completedActionActivity(4),
      {
        ...tagActivity(['décès', '+65 ans']),
        rattachement: 'repayment:LOC-NOTES',
        id_locataire: 'LOC-NOTES'
      }
    ])
    try {
      const title = [...document.querySelectorAll('p')].find((el) => el.textContent === 'Contexte')
      const labels = [...(title?.nextElementSibling?.querySelectorAll(':scope > span') ?? [])].map(
        (el) => el.textContent
      )
      expect(labels).toEqual([
        'Dette',
        'Courriel',
        'Téléphone',
        'Référent',
        'Groupe',
        'Dernière tâche',
        'Tags'
      ])
      expect(document.body.textContent).toContain('décès')
      expect(document.body.textContent).toContain('+65 ans')
      const tagsLabel = [
        ...(title?.nextElementSibling?.querySelectorAll(':scope > span') ?? [])
      ].find((el) => el.textContent === 'Tags')
      expect(tagsLabel?.nextElementSibling?.classList.contains('flex-wrap')).toBe(true)
      expect(tagsLabel?.nextElementSibling?.classList.contains('flex-col')).toBe(false)
    } finally {
      await cleanup()
    }
  })

  test('n’affiche pas un tag hors configuration dans la topcard', async () => {
    const { cleanup } = await renderNotesDrawer('alice@exemple.fr', [
      {
        ...tagActivity(['décès', 'inconnu']),
        rattachement: 'repayment:LOC-NOTES',
        id_locataire: 'LOC-NOTES'
      }
    ])
    try {
      expect(document.body.textContent).toContain('décès')
      expect(document.body.textContent).not.toContain('inconnu')
    } finally {
      await cleanup()
    }
  })

  test('masque la ligne Tags s’il n’y en a aucun', async () => {
    const { cleanup } = await renderNotesDrawer('alice@exemple.fr', [])
    try {
      expect([...document.querySelectorAll('span')].some((el) => el.textContent === 'Tags')).toBe(
        false
      )
    } finally {
      await cleanup()
    }
  })

  test('montre la tendance de dette par une flèche, sans graphique', async () => {
    const { cleanup } = await renderNotesDrawer('alice@exemple.fr', [])
    try {
      expect(document.querySelector('[aria-label="Dette en hausse"]')).not.toBeNull()
      expect(document.body.innerHTML).not.toContain('recharts')
      expect(document.body.innerHTML).not.toContain('sparkline')
    } finally {
      await cleanup()
    }
  })

  test('aligne le snapshot sur la grille méta, sans date de bail', async () => {
    const { cleanup } = await renderNotesDrawer('alice@exemple.fr', [])
    try {
      const body = document.body.textContent ?? ''
      expect(body).toContain('Contexte')
      expect(body).toContain('Groupe')
      expect(body).toContain('Référent')
      expect(body).toContain('Courriel')
      expect(body).toContain('Téléphone')
      expect(body).toMatch(/1[\s\u00a0\u202f]?000\s?€/)
      expect([...document.querySelectorAll('span')].some((el) => el.textContent === 'Dette')).toBe(
        true
      )
      const contextTitle = [...document.querySelectorAll('p')].find(
        (element) => element.textContent === 'Contexte'
      )
      expect(contextTitle?.nextElementSibling?.classList.contains('mt-2')).toBe(true)
      expect(body).not.toContain('Locataire depuis')
      expect(body).not.toContain('01/09/2023')
    } finally {
      await cleanup()
    }
  })

  test('sépare le présent et l’historique en deux colonnes', async () => {
    const own = noteActivity(1, 'user:alice@exemple.fr', 'Mon commentaire')
    const { cleanup } = await renderNotesDrawer('alice@exemple.fr', [own])
    try {
      const panes = [...document.querySelectorAll('div')].filter(
        (el) => el.classList.contains('w-2/5') || el.classList.contains('w-3/5')
      )
      expect(panes).toHaveLength(2)
      expect(panes[0]?.classList.contains('w-2/5')).toBe(true)
      expect(panes[1]?.classList.contains('w-3/5')).toBe(true)
      expect(panes[0]?.textContent).toContain('Groupe')
      expect(panes[0]?.textContent).toContain('Laisser une note')
      expect(panes[0]?.textContent).toContain('Créer un plan d’apurement')
      expect(panes[1]?.textContent).toContain('Mon commentaire')
      expect(panes[1]?.textContent).not.toContain('Laisser une note')
      expect(document.querySelector('[data-slot="dialog-content"]')).toBeNull()
    } finally {
      await cleanup()
    }
  })
})

function planActivity(id: number, auteur: string, commentaire: string): Activite {
  const form = createDefaultApurementPlanForm()
  form.signed = false
  const output = buildApurementPlanOutput('LOC-NOTES', form)
  return {
    id,
    rattachement: 'repayment:LOC-NOTES',
    auteur,
    id_client: 'CLI-NOTES',
    id_locataire: 'LOC-NOTES',
    id_lot: null,
    date_creation: '2026-08-19 20:00',
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
      note: commentaire,
      formulaire: output.form,
      calculs: output.calculations
    }),
    statut: 'draft',
    mentions: []
  }
}

function noteActivity(id: number, auteur: string, contenu: string): Activite {
  return {
    id,
    rattachement: 'repayment:LOC-NOTES',
    auteur,
    id_client: 'CLI-NOTES',
    id_locataire: 'LOC-NOTES',
    id_lot: null,
    date_creation: '2026-08-09 12:00',
    type: 'note',
    contenu: JSON.stringify({ version: 1, note: contenu }),
    statut: 'logged',
    mentions: []
  }
}

function openActionActivity(id: number): Activite {
  return {
    id,
    rattachement: 'repayment:LOC-NOTES',
    auteur: 'user:alice@exemple.fr',
    id_client: 'CLI-NOTES',
    id_locataire: 'LOC-NOTES',
    id_lot: null,
    date_creation: '2026-08-20 12:00',
    type: 'action',
    contenu: JSON.stringify({
      version: 1,
      action: 'Appeler le locataire',
      etat: 'a_faire',
      assigne_a: 'user:alice@exemple.fr',
      date_echeance: '2026-08-25',
      cree_par: 'user:alice@exemple.fr',
      cree_le: '2026-08-20 12:00'
    }),
    statut: 'logged',
    mentions: [],
    thread_id: `todo-${id}`,
    event: 'created',
    state: 'a_faire',
    revision: 1
  }
}

function completedActionActivity(id: number): Activite {
  return {
    ...openActionActivity(id),
    contenu: JSON.stringify({
      version: 1,
      action: 'Appeler le locataire',
      etat: 'fait',
      assigne_a: 'user:alice@exemple.fr',
      date_echeance: '2026-08-25',
      cree_par: 'user:alice@exemple.fr',
      cree_le: '2026-08-20 12:00'
    }),
    date_creation: '2026-08-22T20:00:00',
    event: 'completed',
    state: 'fait',
    revision: 2
  }
}

/** Open debt episode used by the drawer snapshot and movement timeline. */
const openDebtMovements = [
  {
    date_exigibilite: '2026-04-05T09:00:00',
    montant_en_euros: 500,
    categorie: 'loyer_principal'
  },
  {
    date_exigibilite: '2026-05-05T09:00:00',
    montant_en_euros: 500,
    categorie: 'loyer_principal'
  }
]

async function renderNotesDrawer(
  userLogin: string,
  activities: Activite[],
  tenant: {
    id_client: string
    id_locataire: string
    solde_locataire: number
    debut_bail?: string
  } = {
    id_client: 'CLI-NOTES',
    id_locataire: 'LOC-NOTES',
    solde_locataire: 1000,
    debut_bail: '2023-09-01'
  }
) {
  const { act } = await import('react')
  const { createRoot } = await import('react-dom/client')
  const { Drawer, DrawerContent } = await import('@/shared/components/ui/drawer')
  const { RepaymentTenantDrawer } = await import('./RepaymentTenantDrawer')
  const { invalidateRepaymentTimelineCache } = await import('../lib/repayment-timeline-cache')

  invalidateRepaymentTimelineCache('https://notes-edit.test', tenant.id_client, tenant.id_locataire)

  const patchActivity = mock(
    async (params: { id: number; patch: { operation: string; contenu?: string } }) => {
      const current = activities.find((activity) => activity.id === params.id) ?? activities[0]!
      return {
        data: {
          ...current,
          ...(params.patch.operation === 'edit_content' && params.patch.contenu != null
            ? { contenu: params.patch.contenu }
            : {})
        }
      }
    }
  )
  const deleteActivity = mock(async () => ({ data: { deleted: true } }))
  const createActivity = mock(async () => ({ data: { id: 99 } }))

  window.api = {
    getRepaymentTimeline: async () => ({
      data: {
        movements: openDebtMovements,
        notifications: activities,
        openActionEvents: activities.filter(
          (activity) => activity.type === 'action' && activity.state === 'a_faire'
        )
      },
      errors: { movements: false, notifications: false, openActions: false }
    }),
    patchActivity,
    deleteActivity,
    createActivity
  } as unknown as typeof window.api

  const host = (nextTenant: typeof tenant) => (
    <Drawer open onOpenChange={() => {}} swipeDirection="right">
      <DrawerContent>
        <RepaymentTenantDrawer
          url="https://notes-edit.test"
          userLogin={userLogin}
          open
          onOpenChange={() => {}}
          sheetOpenToken={1}
          embedded
          tenant={nextTenant}
          onAddNote={() => true}
          onAdvancementChange={() => true}
          onTagsChange={() => true}
          onCreatePlan={() => {}}
          onEditPlan={() => {}}
        />
      </DrawerContent>
    </Drawer>
  )

  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () => {
    root.render(host(tenant))
    await new Promise((resolve) => window.setTimeout(resolve, 150))
  })

  return {
    container,
    root,
    act,
    patchActivity,
    deleteActivity,
    createActivity,
    rerender: async (nextTenant: typeof tenant) => {
      await act(async () => {
        root.render(host(nextTenant))
        await new Promise((resolve) => window.setTimeout(resolve, 150))
      })
    },
    cleanup: async () => {
      await act(async () => {
        root.unmount()
      })
      container.remove()
    }
  }
}

describe('RepaymentTenantDrawer courriel', () => {
  test('affiche l’action en L2 et replie le corps', async () => {
    const email: Activite = {
      id: 21,
      rattachement: 'repayment:LOC-NOTES',
      auteur: 'user:gregoire@exemple.fr',
      id_client: 'CLI-NOTES',
      id_locataire: 'LOC-NOTES',
      id_lot: null,
      date_creation: '2026-06-28 17:45',
      date_statut: '2026-08-27T09:54:00.000Z',
      type: 'email',
      destinataire: 'caf@example.fr',
      contenu: JSON.stringify({
        version: 1,
        action: 'Contacter la CAF',
        objet: 'Dossier APL',
        corps: 'Merci de rétablir le versement.'
      }),
      statut: 'sent',
      mentions: []
    }
    const { cleanup } = await renderNotesDrawer('alice@exemple.fr', [email])
    try {
      const body = document.body.textContent ?? ''
      expect(body).toContain('Contacter la CAF')
      expect(body).toContain('par e-mail')
      expect(body).not.toContain('a envoyé un courriel')
      expect(body).toContain('Dossier APL')
      expect(body).toContain('Corps du message')
      expect(body).toContain('Envoyé')
      expect(body).toContain('vers c•••@example.fr')
      expect(body).toContain('état au')
      expect(document.querySelector('input[type="checkbox"]')).toBeNull()
      const panel = document.querySelector('[data-slot="collapsible-content"]')
      if (panel) {
        expect(panel.getAttribute('hidden')).not.toBeNull()
      } else {
        expect(body).not.toContain('Merci de rétablir le versement.')
      }
    } finally {
      await cleanup()
    }
  })

  test('affiche un courriel importé avec De / À', async () => {
    const imported: Activite = {
      id: 22,
      rattachement: 'repayment:LOC-NOTES',
      auteur: 'user:alice@exemple.fr',
      id_client: 'CLI-NOTES',
      id_locataire: 'LOC-NOTES',
      id_lot: null,
      date_creation: '2026-08-27T12:00:00Z',
      type: 'email_import',
      destinataire: 'Bob <bob@locataire.fr>',
      contenu: JSON.stringify({
        version: 1,
        objet: 'Relance loyer',
        corps: 'Merci de régulariser.',
        expediteur: 'Alice <alice@bailleur.fr>',
        destinataire: 'Bob <bob@locataire.fr>',
        date_envoi: '2026-08-12T08:00:00Z'
      }),
      statut: 'logged',
      mentions: []
    }
    const { cleanup } = await renderNotesDrawer('alice@exemple.fr', [imported])
    try {
      const body = document.body.textContent ?? ''
      expect(body).toContain('a importé un courriel')
      expect(body).toContain('Relance loyer')
      expect(body).toContain('De Alice <alice@bailleur.fr>')
      expect(body).toContain('À Bob <bob@locataire.fr>')
      expect(body).toContain('Envoyé le')
      expect(body).toContain('12/08/2026')
      expect(body).not.toContain('par e-mail')
    } finally {
      await cleanup()
    }
  })

  test('importe un .eml via le sélecteur de fichier', async () => {
    const { act, cleanup, createActivity } = await renderNotesDrawer('alice@exemple.fr', [])
    try {
      const input = document.querySelector<HTMLInputElement>('input[type="file"][accept=".eml"]')
      expect(input).not.toBeNull()
      const file = new File(
        [
          [
            'From: Alice <alice@bailleur.fr>',
            'To: Bob <bob@locataire.fr>',
            'Subject: Relance loyer',
            'Date: Wed, 12 Aug 2026 10:00:00 +0200',
            'Content-Type: text/plain; charset=utf-8',
            '',
            'Merci de régulariser.'
          ].join('\r\n')
        ],
        'mail.eml',
        { type: 'message/rfc822' }
      )
      Object.defineProperty(input, 'files', { configurable: true, value: [file] })
      await act(async () => {
        input?.dispatchEvent(new Event('change', { bubbles: true }))
        await new Promise((resolve) => window.setTimeout(resolve, 80))
      })
      expect(createActivity).toHaveBeenCalledTimes(1)
      const firstCall = createActivity.mock.calls[0] as unknown as [
        { type?: string; contenu?: string }
      ]
      expect(firstCall).toBeDefined()
      const payload = firstCall[0]
      expect(payload.type).toBe('email_import')
      expect(JSON.parse(payload.contenu ?? '{}')).toMatchObject({
        objet: 'Relance loyer',
        corps: 'Merci de régulariser.'
      })
    } finally {
      await cleanup()
    }
  })

  test('n’envoie pas un fichier .eml illisible', async () => {
    const { act, cleanup, createActivity } = await renderNotesDrawer('alice@exemple.fr', [])
    try {
      const input = document.querySelector<HTMLInputElement>('input[type="file"][accept=".eml"]')
      const file = new File(['pas un mail'], 'mail.msg')
      Object.defineProperty(input, 'files', { configurable: true, value: [file] })
      await act(async () => {
        input?.dispatchEvent(new Event('change', { bubbles: true }))
        await new Promise((resolve) => window.setTimeout(resolve, 80))
      })
      expect(createActivity).not.toHaveBeenCalled()
    } finally {
      await cleanup()
    }
  })
})

describe('RepaymentTenantDrawer note edit/delete', () => {
  test('affiche Modifier et Supprimer pour l’auteur uniquement', async () => {
    const own = noteActivity(1, 'user:alice@exemple.fr', 'Mon commentaire')
    const other = noteActivity(2, 'user:bob@exemple.fr', 'Commentaire de Bob')
    const { cleanup } = await renderNotesDrawer('alice@exemple.fr', [own, other])

    try {
      const modifierButtons = [...document.querySelectorAll('button')].filter(
        (button) => button.textContent === 'Modifier'
      )
      const supprimerButtons = [...document.querySelectorAll('button')].filter(
        (button) => button.textContent === 'Supprimer'
      )
      const replyButtons = [...document.querySelectorAll('button')].filter(
        (button) => button.textContent === 'Répondre'
      )

      expect(modifierButtons).toHaveLength(1)
      expect(supprimerButtons).toHaveLength(1)
      expect(replyButtons.length).toBeGreaterThanOrEqual(2)
    } finally {
      await cleanup()
    }
  })

  test('affiche Répondre sous un plan, sans Supprimer', async () => {
    const plan = planActivity(12, 'user:alice@exemple.fr', 'tu l’as vu ?')
    const { cleanup } = await renderNotesDrawer('bob@exemple.fr', [plan])

    try {
      expect(document.body.textContent).toContain('tu l’as vu ?')

      const planCard = [...document.querySelectorAll('.rounded-md.border')].find((element) =>
        element.textContent?.includes('Brouillon')
      )
      expect(planCard?.textContent).toContain('Modifier')
      expect(planCard?.textContent).not.toContain('tu l’as vu ?')

      const replyButtons = [...document.querySelectorAll('button')].filter(
        (button) => button.textContent === 'Répondre'
      )
      const supprimerButtons = [...document.querySelectorAll('button')].filter(
        (button) => button.textContent === 'Supprimer'
      )
      expect(replyButtons.length).toBeGreaterThanOrEqual(1)
      expect(supprimerButtons).toHaveLength(0)
    } finally {
      await cleanup()
    }
  })

  test('édite un commentaire via patchActivity edit_content', async () => {
    const own = noteActivity(3, 'user:alice@exemple.fr', 'Ancien texte')
    const { act, cleanup, patchActivity } = await renderNotesDrawer('alice@exemple.fr', [own])

    try {
      const modifier = document.querySelector<HTMLButtonElement>('[data-note-edit-id="3"]')
      expect(modifier).toBeTruthy()

      await act(async () => {
        modifier?.click()
        await new Promise((resolve) => window.setTimeout(resolve, 300))
      })

      expect(document.querySelector('[data-inspector-compose-shell]')?.textContent).toContain(
        'Modifier la note'
      )
      const textarea = [...document.querySelectorAll<HTMLTextAreaElement>('textarea')].find(
        (element) => element.value === 'Ancien texte'
      )
      expect(textarea).not.toBeUndefined()
      expect(textarea?.closest('[data-timeline-id]')).toBeNull()
      expect(textarea?.value).toBe('Ancien texte')

      await act(async () => {
        if (!textarea) return
        const native = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype,
          'value'
        )
        native?.set?.call(textarea, 'Texte modifié')
        textarea.dispatchEvent(new Event('input', { bubbles: true }))
      })

      const save = [...document.querySelectorAll('button')].find(
        (button) => button.textContent === 'Enregistrer' && !button.disabled
      )
      expect(save).toBeTruthy()

      await act(async () => {
        save?.click()
        await new Promise((resolve) => window.setTimeout(resolve, 50))
      })

      expect(patchActivity).toHaveBeenCalledTimes(1)
      expect(patchActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 3,
          patch: {
            operation: 'edit_content',
            contenu: JSON.stringify({ version: 1, note: 'Texte modifié' })
          }
        })
      )
    } finally {
      await cleanup()
    }
  })

  test('supprime un message après confirmation', async () => {
    const own = noteActivity(4, 'user:alice@exemple.fr', 'À supprimer')
    const { act, cleanup, deleteActivity } = await renderNotesDrawer('alice@exemple.fr', [own])

    try {
      const supprimer = [...document.querySelectorAll('button')].find(
        (button) => button.textContent === 'Supprimer'
      )
      expect(supprimer).toBeTruthy()

      await act(async () => {
        supprimer?.click()
      })

      expect(
        [...document.querySelectorAll('*')].some(
          (element) => element.textContent === 'Supprimer définitivement'
        )
      ).toBe(true)

      const confirmDestructive = [...document.querySelectorAll('button')].find(
        (button) =>
          button.textContent === 'Supprimer' && button.className.includes('bg-destructive')
      )
      expect(confirmDestructive).toBeTruthy()

      await act(async () => {
        confirmDestructive?.click()
        await new Promise((resolve) => window.setTimeout(resolve, 50))
      })

      expect(deleteActivity).toHaveBeenCalledTimes(1)
      expect(deleteActivity).toHaveBeenCalledWith(expect.objectContaining({ id: 4 }))
    } finally {
      await cleanup()
    }
  })

  test('ferme la confirmation de suppression au changement de locataire', async () => {
    const own = noteActivity(4, 'user:alice@exemple.fr', 'À supprimer')
    const { act, cleanup, deleteActivity, rerender } = await renderNotesDrawer('alice@exemple.fr', [
      own
    ])

    try {
      const supprimer = [...document.querySelectorAll('button')].find(
        (button) => button.textContent === 'Supprimer'
      )
      expect(supprimer).toBeTruthy()

      await act(async () => {
        supprimer?.click()
      })

      expect(
        [...document.querySelectorAll('*')].some(
          (element) => element.textContent === 'Supprimer définitivement'
        )
      ).toBe(true)

      await rerender({
        id_client: 'CLI-B',
        id_locataire: 'LOC-B',
        solde_locataire: 200
      })

      expect(
        [...document.querySelectorAll('*')].some(
          (element) => element.textContent === 'Supprimer définitivement'
        )
      ).toBe(false)
      expect(deleteActivity).not.toHaveBeenCalled()
    } finally {
      await cleanup()
    }
  })
})

describe('RepaymentTenantDrawer actions', () => {
  test('réalise une action en cliquant son ancre', async () => {
    const action = openActionActivity(9)
    const { act, cleanup, patchActivity } = await renderNotesDrawer('alice@exemple.fr', [action])

    try {
      const checkbox = document.querySelector<HTMLElement>('[aria-label="Action à faire"]')
      expect(checkbox).not.toBeNull()
      expect(document.querySelector('input[type="checkbox"]')).toBeNull()

      await act(async () => {
        checkbox?.click()
        await new Promise((resolve) => window.setTimeout(resolve, 50))
      })

      expect(patchActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 9,
          patch: { operation: 'complete_action' }
        })
      )
    } finally {
      await cleanup()
    }
  })

  test('rouvre une action depuis son événement réalisé', async () => {
    const action = completedActionActivity(10)
    const { act, cleanup, patchActivity } = await renderNotesDrawer('alice@exemple.fr', [action])

    try {
      const replan = Array.from(document.querySelectorAll<HTMLElement>('button')).find(
        (button) => button.textContent === 'Rouvrir la tâche'
      )
      expect(replan).toBeDefined()

      await act(async () => {
        replan?.click()
        await new Promise((resolve) => window.setTimeout(resolve, 50))
      })

      expect(patchActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 10,
          patch: {
            operation: 'reopen_action',
            assigne_a: 'user:alice@exemple.fr',
            date_echeance: '2026-08-25'
          }
        })
      )
      expect(document.body.textContent).not.toContain('Nouvelle échéance')
    } finally {
      await cleanup()
    }
  })

  test('ignore une action depuis la card sans motif', async () => {
    const action = openActionActivity(13)
    const { act, cleanup, patchActivity } = await renderNotesDrawer('alice@exemple.fr', [action])

    try {
      const ignore = document.querySelector<HTMLElement>(
        '[aria-label="Ignorer Appeler le locataire"]'
      )
      expect(ignore).not.toBeNull()

      await act(async () => {
        ignore?.click()
        await new Promise((resolve) => window.setTimeout(resolve, 0))
      })

      const confirm = Array.from(document.querySelectorAll('button')).find(
        (button) => button.textContent === 'Ignorer'
      )
      expect(confirm).toBeDefined()

      await act(async () => {
        confirm?.click()
        await new Promise((resolve) => window.setTimeout(resolve, 50))
      })

      expect(patchActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 13,
          patch: { operation: 'ignore_action' }
        })
      )
    } finally {
      await cleanup()
    }
  })

  test('la card porte les contrôles live et la timeline conserve la création', async () => {
    const action = openActionActivity(11)
    action.contenu = JSON.stringify({
      ...JSON.parse(action.contenu),
      note: 'Vérifier la promesse de paiement'
    })
    const { cleanup } = await renderNotesDrawer('alice@exemple.fr', [action])

    try {
      expect(document.body.textContent).toContain('Appeler le locataire')
      expect(document.body.textContent).toContain('Échéance')
      expect(document.body.textContent).toContain('Assigné à')
      expect(document.body.textContent).toContain('Créé par')
      expect(document.body.textContent).toContain('Note')
      expect(document.body.textContent).toContain('Vérifier la promesse de paiement')
      expect(document.body.textContent).toContain('25/08/2026')
      expect(document.querySelector('[aria-label="Action à faire"]')).not.toBeNull()
      expect(document.querySelector('[aria-label="Modifier Appeler le locataire"]')).not.toBeNull()
      expect(document.body.textContent).toContain('a créé')
      expect(document.body.textContent).toContain('la tâche')
    } finally {
      await cleanup()
    }
  })

  test('le crayon retourne le rang vers l’édition sans toucher au libellé', async () => {
    const action = openActionActivity(17)
    action.contenu = JSON.stringify({
      ...JSON.parse(action.contenu),
      note: 'Vérifier la promesse de paiement'
    })
    const { act, cleanup, patchActivity } = await renderNotesDrawer('alice@exemple.fr', [action])

    try {
      const edit = document.querySelector<HTMLElement>(
        '[aria-label="Modifier Appeler le locataire"]'
      )
      expect(edit).not.toBeNull()

      await act(async () => {
        edit?.click()
      })

      const checkbox = document.querySelector('[aria-label="Action à faire"]')
      expect(checkbox?.closest('[aria-hidden="true"]')).not.toBeNull()
      expect(document.querySelector('input[placeholder="Action"]')).toBeNull()
      expect(document.querySelector('input[type="date"]')).toBeNull()
      expect(document.querySelector('[aria-label="Changer l’assigné"]')).not.toBeNull()
      expect(document.querySelector('[aria-label="Échéance"]')).not.toBeNull()
      expect(document.querySelector('[placeholder="Rechercher un collègue…"]')).toBeNull()
      expect(document.querySelector('[data-slot="command"]')).toBeNull()
      expect(document.body.textContent).toContain('Assigné à')
      expect(document.body.textContent).toContain('Note')

      await act(async () => {
        document.querySelector<HTMLElement>('[aria-label="Changer l’assigné"]')?.click()
      })

      expect(document.querySelector('[placeholder="Rechercher un collègue…"]')).not.toBeNull()
      expect(document.querySelector('[data-slot="popover-content"]')).not.toBeNull()

      const save = [...document.querySelectorAll('button')].find(
        (button) => button.textContent === 'Enregistrer' && !button.closest('[aria-hidden="true"]')
      )
      expect(save).toBeTruthy()

      await act(async () => {
        save?.click()
        await new Promise((resolve) => window.setTimeout(resolve, 50))
      })

      expect(patchActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 17,
          patch: {
            operation: 'update_action',
            action: 'Appeler le locataire',
            assigne_a: 'user:alice@exemple.fr',
            date_echeance: '2026-08-25',
            note: 'Vérifier la promesse de paiement'
          }
        })
      )
    } finally {
      await cleanup()
    }
  })

  test('le libellé d’une action à faire n’est pas tronqué', async () => {
    const action = openActionActivity(12)
    action.contenu = JSON.stringify({
      version: 1,
      action: 'Relancer le locataire pour le\nvirement promis vendredi',
      etat: 'a_faire',
      assigne_a: 'user:bob@exemple.fr',
      date_echeance: '2026-08-28',
      cree_par: 'user:alice@exemple.fr',
      cree_le: '2026-08-20 12:00'
    })
    const { cleanup } = await renderNotesDrawer('alice@exemple.fr', [action])

    try {
      expect(document.body.textContent).toContain('Relancer le locataire pour le')
      expect(document.body.textContent).toContain('virement promis vendredi')
      expect(document.body.textContent).toContain('Échéance')
      expect(document.body.textContent).toContain('Assigné à')
      expect(document.body.textContent).toContain('Créé par')
    } finally {
      await cleanup()
    }
  })

  test('affiche Supprimer la tâche pour le créateur uniquement', async () => {
    const action = openActionActivity(13)
    const asCreator = await renderNotesDrawer('alice@exemple.fr', [action])
    try {
      const supprimer = [...document.querySelectorAll('button')].filter(
        (button) => button.textContent === 'Supprimer la tâche'
      )
      expect(supprimer).toHaveLength(1)
    } finally {
      await asCreator.cleanup()
    }

    const asOther = await renderNotesDrawer('bob@exemple.fr', [action])
    try {
      const supprimer = [...document.querySelectorAll('button')].filter(
        (button) => button.textContent === 'Supprimer la tâche'
      )
      expect(supprimer).toHaveLength(0)
    } finally {
      await asOther.cleanup()
    }
  })

  test('affiche la poubelle À faire pour le créateur uniquement', async () => {
    const action = openActionActivity(15)
    action.contenu = JSON.stringify({
      ...JSON.parse(action.contenu),
      assigne_a: 'user:bob@exemple.fr'
    })

    const asCreator = await renderNotesDrawer('alice@exemple.fr', [action])
    try {
      expect(document.querySelector('[aria-label="Supprimer la tâche"]')).not.toBeNull()
    } finally {
      await asCreator.cleanup()
    }

    const asAssignee = await renderNotesDrawer('bob@exemple.fr', [action])
    try {
      expect(document.querySelector('[aria-label="Supprimer la tâche"]')).toBeNull()
    } finally {
      await asAssignee.cleanup()
    }
  })

  test('ouvre la confirmation de suppression depuis À faire', async () => {
    const action = openActionActivity(16)
    const { act, cleanup } = await renderNotesDrawer('alice@exemple.fr', [action])

    try {
      const trash = document.querySelector<HTMLButtonElement>('[aria-label="Supprimer la tâche"]')
      expect(trash).not.toBeNull()

      await act(async () => {
        trash?.click()
      })

      const confirmDestructive = [...document.querySelectorAll('button')].find(
        (button) =>
          button.textContent === 'Supprimer' && button.className.includes('bg-destructive')
      )
      expect(confirmDestructive).toBeTruthy()
    } finally {
      await cleanup()
    }
  })

  test('hard-delete une tâche après confirmation', async () => {
    const action = openActionActivity(14)
    const { act, cleanup, deleteActivity } = await renderNotesDrawer('alice@exemple.fr', [action])

    try {
      const supprimer = [...document.querySelectorAll('button')].find(
        (button) => button.textContent === 'Supprimer la tâche'
      )
      expect(supprimer).toBeTruthy()

      await act(async () => {
        supprimer?.click()
      })

      const confirmDestructive = [...document.querySelectorAll('button')].find(
        (button) =>
          button.textContent === 'Supprimer' && button.className.includes('bg-destructive')
      )
      expect(confirmDestructive).toBeTruthy()

      await act(async () => {
        confirmDestructive?.click()
        await new Promise((resolve) => window.setTimeout(resolve, 50))
      })

      expect(deleteActivity).toHaveBeenCalledWith(expect.objectContaining({ id: 14 }))
    } finally {
      await cleanup()
    }
  })
})

function statusChangeActivity(id: number, auteur: string): Activite {
  return {
    id,
    rattachement: 'repayment:LOC-NOTES',
    auteur,
    id_client: 'CLI-NOTES',
    id_locataire: 'LOC-NOTES',
    id_lot: null,
    date_creation: '2026-08-09 11:00',
    type: 'case_bucket_change',
    contenu: JSON.stringify({
      version: 1,
      bucket_precedent: 'amiable',
      bucket: 'pre_contentieux'
    }),
    statut: 'logged',
    mentions: []
  }
}

describe('RepaymentTenantDrawer boosts', () => {
  test('permet de booster les actions d’un autre collaborateur, pas les siennes', async () => {
    const own = noteActivity(1, 'user:alice@exemple.fr', 'Mon commentaire')
    const otherNote = noteActivity(2, 'user:bob@exemple.fr', 'Commentaire de Bob')
    const otherStatus = statusChangeActivity(3, 'user:bob@exemple.fr')
    const { cleanup } = await renderNotesDrawer('alice@exemple.fr', [own, otherNote, otherStatus])

    try {
      const boostButtons = [...document.querySelectorAll('button')].filter(
        (button) => button.getAttribute('aria-label') === 'Booster'
      )
      expect(boostButtons.length).toBeGreaterThanOrEqual(2)
      expect(document.body.textContent).toContain('Commentaire de Bob')
      expect(document.body.textContent).toContain('a déplacé le dossier du groupe')
    } finally {
      await cleanup()
    }
  })

  test('envoie set_boost au serveur', async () => {
    const other = noteActivity(8, 'user:bob@exemple.fr', 'À booster')
    const { act, cleanup, patchActivity } = await renderNotesDrawer('alice@exemple.fr', [other])

    try {
      const trigger = document.querySelector<HTMLButtonElement>('[aria-label="Booster"]')
      expect(trigger).toBeTruthy()

      await act(async () => {
        trigger?.click()
        await new Promise((resolve) => window.setTimeout(resolve, 50))
      })

      const thumb = [...document.querySelectorAll('button')].find(
        (button) => button.getAttribute('aria-label') === 'Boost 👍'
      )
      expect(thumb).toBeTruthy()

      await act(async () => {
        thumb?.click()
        await new Promise((resolve) => window.setTimeout(resolve, 50))
      })

      expect(patchActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 8,
          patch: { operation: 'set_boost', emoji: '👍' }
        })
      )
      expect(document.body.textContent).toContain('À booster')
      expect(document.body.textContent).toContain('Laisser une note')
      expect(document.querySelector('[aria-label="Chargement du dossier"]')).toBeNull()
    } finally {
      await cleanup()
    }
  })
})
