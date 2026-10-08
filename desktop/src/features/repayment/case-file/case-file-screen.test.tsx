import { afterEach, describe, expect, test } from 'bun:test'

import { blankSchedule, emptyRepaymentCaseFile } from '@pierre/shared/repayment-case-file'
import { loadCustomizationFixture } from '@test/instance-customization-fixture'
import { renderToStaticMarkup } from 'react-dom/server'

import { resetCustomization } from '@/shared/lib/instance-customization'

import { CaseFileScreen, MissingFieldsSection, syncInvalidControls } from './case-file-screen'
import { LeaseAccountSection } from './lease-account-section'

afterEach(() => resetCustomization())

describe('CaseFileScreen', () => {
  test('affiche l’ajout d’un adulte et l’enregistrement', () => {
    loadCustomizationFixture()
    const html = renderToStaticMarkup(
      <CaseFileScreen
        tenant={{ id_locataire: 'LOC-1', id_client: 'CLI-1', solde_locataire: 1200 }}
        onClose={() => {}}
      />
    )
    expect(html.indexOf('Identification')).toBeLessThan(html.indexOf('Membres du foyer'))
    expect(html.indexOf('Membres du foyer')).toBeLessThan(html.indexOf('Bail et compte locataire'))
    expect(html.indexOf('Bail et compte locataire')).toBeLessThan(html.indexOf('Budget du foyer'))
    expect(html.indexOf('Budget du foyer')).toBeLessThan(html.indexOf('Diagnostic social'))
    expect(html.indexOf('Diagnostic social')).toBeLessThan(html.indexOf('Chronologie'))
    expect(html.indexOf('Chronologie')).toBeLessThan(html.indexOf('Proposition d’échéancier'))
    expect(html).toContain('Ajouter une action')
    expect(html).toContain('Changer la phase')
    expect(html).not.toContain('Compte locataire')
    expect(html).not.toContain('Accompagnement')
    expect(html).not.toContain('Accord du bailleur')
    expect(html).not.toContain('Accord du ménage')
    expect(html).not.toContain('Paiement des échéances')
    for (const [before, after] of [
      ['Début du bail', 'Garant'],
      ['Garant', 'Retrait de dettes'],
      ['Retrait de dettes', 'Ancienne dette locative'],
      ['Ancienne dette locative', 'Précédente procédure de contentieux'],
      ['Précédente procédure de contentieux', 'Solde du compte'],
      ['Solde du compte', 'Contestation'],
      ['Contestation', 'Premier impayé'],
      ['Premier impayé', 'Motif de l’impayé'],
      ['Motif de l’impayé', 'Quelle est la situation « Banque de France » du locataire ?'],
      ['Consentement', 'Vulnérabilités'],
      ['Vulnérabilités', 'Risques en cas d’expulsion'],
      ['Risques en cas d’expulsion', 'Aides mobilisables'],
      ['Aides mobilisables', 'Travailleur social'],
      ['Travailleur social', 'Position du ménage'],
      ['Position du ménage', 'Observations du bailleur'],
      ['Observations du bailleur', 'Orientation']
    ] as const) {
      expect(html.indexOf(before)).toBeLessThan(html.indexOf(after))
    }
    expect(html).toContain('Proposer un échéancier')
    expect(html).not.toContain('Ajouter une échéance')
    expect(html).not.toContain('Échéancier proposé')
    expect(html.indexOf('Observations du bailleur')).toBeLessThan(
      html.indexOf('Proposition d’échéancier')
    )
    expect(html).not.toContain('Reprendre la proposition du diagnostic')
    expect(html).not.toContain('Reprendre le plan d’apurement')
    expect(html).not.toContain('En cours de régularisation')
    expect(html).not.toContain('Date de fin du moratoire')
    expect(html).toContain('Ajouter un adulte')
    expect(html).toContain('Ajouter un enfant')
    expect(html).toContain('Enregistrer')
    expect(html).toContain('LOC-1')
    expect(html).toContain('200,00')
    expect(html).toMatch(/<main[^>]*overflow-y-auto px-4 py-8/)
    expect(html).not.toContain('min-h-full px-4 py-8')
    expect(html).toContain('<footer class="flex items-center justify-between gap-2">')
  })

  test('verrouille l’identifiant locataire d’un dossier déjà rattaché', () => {
    loadCustomizationFixture()
    const locked = renderToStaticMarkup(
      <CaseFileScreen
        tenant={{ id_locataire: 'LOC-1', id_client: 'CLI-1', solde_locataire: 0 }}
        existingActivityId={4}
        onClose={() => {}}
      />
    )
    expect(isDisabled(inputTag(locked, 'id_locataire'))).toBe(true)
    const open = renderToStaticMarkup(
      <CaseFileScreen
        tenant={{ id_locataire: '', id_client: '', solde_locataire: 0 }}
        onClose={() => {}}
      />
    )
    expect(isDisabled(inputTag(open, 'id_locataire'))).toBe(false)
  })

  test('fige une phase déjà enregistrée et laisse l’action du plan éditable', () => {
    loadCustomizationFixture()
    const html = renderToStaticMarkup(
      <CaseFileScreen
        tenant={{ id_locataire: 'LOC-1', id_client: 'CLI-1', solde_locataire: 1200 }}
        initialChronology={[
          {
            key: 'phase:1',
            origin: 1,
            editable: false,
            item: {
              kind: 'phase',
              phase: 'Amiable',
              date_realisation: '2026-04-01',
              commentaire: 'Accord oral'
            }
          },
          {
            key: '11111111-1111-4111-8111-111111111111',
            origin: 2,
            editable: true,
            item: {
              kind: 'action',
              id: '11111111-1111-4111-8111-111111111111',
              action: 'Visiter à domicile',
              date_realisation: '2026-05-02',
              commentaire: null
            }
          }
        ]}
        onClose={() => {}}
      />
    )
    expect(html.indexOf('01/04/2026')).toBeLessThan(html.indexOf('Visiter à domicile'))
    expect(html).toContain('Amiable')
    expect(html).toContain('Accord oral')
    expect(html).not.toContain('Retirer ce changement de phase')
    expect(html).toContain('Retirer Visiter à domicile')
  })

  test('aligne les zones de texte du diagnostic sur la colonne des contrôles', () => {
    loadCustomizationFixture()
    const html = renderToStaticMarkup(
      <CaseFileScreen
        tenant={{ id_locataire: 'LOC-1', id_client: 'CLI-1', solde_locataire: 1200 }}
        onClose={() => {}}
      />
    )
    for (const id of ['position_menage', 'observations_bailleur']) {
      expect(fieldOrientation(html, id)).toBe('horizontal')
    }
  })

  test('ouvre le retrait de dettes comme le garant', () => {
    const common = emptyRepaymentCaseFile().donnees_communes
    const open = renderToStaticMarkup(
      <LeaseAccountSection
        common={{
          ...common,
          bail: {
            ...common.bail,
            retrait_dettes: { montant_en_euros: 1200, en_cours_de_regularisation: true }
          }
        }}
        onCommonChange={() => {}}
      />
    )
    expect(open.indexOf('Garant')).toBeLessThan(open.indexOf('Retrait de dettes'))
    expect(open.indexOf('Retrait de dettes')).toBeLessThan(open.indexOf('>Montant<'))
    expect(open.indexOf('>Montant<')).toBeLessThan(open.indexOf('En cours de régularisation'))
    expect(open.indexOf('En cours de régularisation')).toBeLessThan(
      open.indexOf('Ancienne dette locative')
    )
    expect(open).toContain('200,00')
  })

  test('ouvre un échéancier déjà enregistré', () => {
    loadCustomizationFixture()
    const dossier = emptyRepaymentCaseFile()
    dossier.echeancier = blankSchedule()
    const html = renderToStaticMarkup(
      <CaseFileScreen
        tenant={{ id_locataire: 'LOC-1', id_client: 'CLI-1', solde_locataire: 1200 }}
        initialCaseFile={dossier}
        onClose={() => {}}
      />
    )
    expect(html.indexOf('Proposer un échéancier')).toBeLessThan(
      html.indexOf('Ajouter une échéance')
    )
    expect(html.indexOf('Ajouter une échéance')).toBeLessThan(
      html.indexOf('Soutenabilité de l’échéancier')
    )
  })

  test('encadre la contestation comme le garant', () => {
    const common = emptyRepaymentCaseFile().donnees_communes
    common.compte_locataire.statut_contestation = 'conteste'
    common.compte_locataire.montant_conteste_en_euros = 40
    common.compte_locataire.motifs_contestation = ['Charges']
    const html = renderToStaticMarkup(
      <LeaseAccountSection common={common} onCommonChange={() => {}} />
    )
    expect(html.indexOf('id="contestation_details"')).toBeLessThan(
      html.indexOf('Motif de la contestation')
    )
    expect(html.indexOf('Ancienne dette locative')).toBeLessThan(
      html.indexOf('id="contestation_details"')
    )
    expect(html.indexOf('Motif de la contestation')).toBeLessThan(html.indexOf('Premier impayé'))
  })

  test('regroupe les champs manquants par rubrique avec des ancres compactes', () => {
    const html = renderToStaticMarkup(
      <MissingFieldsSection
        documentLabel="Diagnostic"
        fields={[
          {
            targetId: 'id_client',
            section: 'Identification',
            label: 'Identifiant client'
          },
          {
            targetId: 'adresse',
            section: 'Identification',
            label: 'Adresse'
          },
          {
            targetId: 'debut_bail',
            section: 'Bail et compte locataire',
            label: 'Début du bail'
          }
        ]}
        onClose={() => {}}
        onJump={() => {}}
      />
    )
    expect(html).toContain('À compléter — Diagnostic')
    expect(html).toContain('3 à compléter')
    expect(html).toContain('bg-destructive/10 text-destructive')
    expect(html).toContain('data-invalid=""')
    expect(html).toContain('data-invalid:border-destructive')
    expect(html.split('>Identification<')).toHaveLength(2)
    expect(html).toContain('href="#id_client"')
    expect(html).toContain('href="#adresse"')
    expect(html).toContain('href="#debut_bail"')
    expect(html).toContain('w-fit')
    expect(html).not.toContain('>Compléter<')
  })

  test('pose et nettoie aria-invalid sur les contrôles manquants et le bouton Détails replié', () => {
    const input = document.createElement('input')
    input.id = 'id_client'
    const details = document.createElement('button')
    details.id = 'adult_0_details'
    const heading = document.createElement('h2')
    heading.id = 'chronologie'
    const byId = new Map<string, HTMLElement>([
      ['id_client', input],
      ['adult_0_details', details],
      ['chronologie', heading]
    ])
    const cleanup = syncInvalidControls({ getElementById: (id) => byId.get(id) ?? null }, [
      { targetId: 'id_client' },
      { targetId: 'adult_0_mode_residence', adultPopoverIndex: 0 },
      { targetId: 'chronologie' }
    ])
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(details.getAttribute('aria-invalid')).toBe('true')
    expect(heading.getAttribute('aria-invalid')).toBeNull()
    cleanup()
    expect(input.getAttribute('aria-invalid')).toBeNull()
    expect(details.getAttribute('aria-invalid')).toBeNull()
  })
})

function isDisabled(tag: string) {
  return /(?:^|\s)disabled(?:=|\s|\/|>)/.test(tag)
}

function inputTag(html: string, id: string) {
  const at = html.indexOf(`id="${id}"`)
  return html.slice(html.lastIndexOf('<input', at), html.indexOf('>', at) + 1)
}

function fieldOrientation(html: string, controlId: string) {
  const at = html.indexOf(`id="${controlId}"`)
  if (at < 0) return undefined
  const orientations = [...html.slice(0, at).matchAll(/data-orientation="([^"]+)"/g)]
  return orientations.at(-1)?.[1]
}
