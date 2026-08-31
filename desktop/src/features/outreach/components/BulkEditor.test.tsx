import { describe, expect, mock, test } from 'bun:test'

import { renderToStaticMarkup } from 'react-dom/server'

import {
  bulkOperationCreatePayload,
  bulkOperationExecutePayload,
  bulkOperationPatchPayload,
  bulkOperationWriteBody,
  bulkDeliveryError,
  BulkEditor,
  BulkMessagePreview,
  collectBulkPlaceholders,
  loadPlaceholderColumnItems,
  nextBulkOperationCommandId,
  reconcilePlaceholderBindings,
  reportsToKeepError
} from '@/features/outreach/components/BulkEditor'
import {
  formatPreviewChannelTotals,
  previewChannelTotals,
  previewStepReasonLabel
} from '@/features/outreach/lib/labels'
import {
  emptyBulkOperationDefinition,
  type BulkOperationRecord,
  type PreviewRow
} from '@/shared/types/bulk-operations'

const props = {
  url: 'https://example.test',
  onBack: () => {},
  onSaved: () => {},
  onArchived: () => {}
}

function previewRow(overrides: Partial<PreviewRow>): PreviewRow {
  return {
    id_locataire: 'LOC-1',
    id_client: null,
    nom: null,
    email: null,
    telephone: null,
    adresse: null,
    gestionnaire: null,
    gestionnaire_email: null,
    values: {},
    status: 'eligible',
    route: { kind: 'fallback', medium: 'email', stepIndex: 0 },
    skippedSteps: [],
    ...overrides
  }
}

describe('BulkEditor', () => {
  test('affiche les contrôles désactivés par défaut et un plan initial', () => {
    const html = renderToStaticMarkup(<BulkEditor {...props} record={null} />)

    expect(html).toContain('>Traitement</legend>')
    expect(html).toContain('>Audience</legend>')
    expect(html).toContain('>Acheminement</legend>')
    expect(html).not.toContain('>Application</legend>')
    expect(html).not.toContain('>Filtres</legend>')
    expect(html).toContain('Canal initial')
    expect(html).toContain('Ajouter un fallback')
    expect(html).toContain('Tags requis')
    expect(html).toContain('Tags exclus')
    expect(html).toContain('Dette')
    expect(html).toContain('Mois d’impayés')
    expect(html).toContain('Notifier le référent')
    expect(html).toContain('Panier d’arrivée')
    expect(html).toContain('Le dossier doit appartenir à l’un des paniers')
    expect(html).toContain('Le dossier doit déjà avoir reçu toutes les actions')
    expect(html).toContain('Canaux successifs')
    expect(html).toContain('Traiter sans envoyer')
    expect(html).toContain('Comptes locataires')
    expect((html.match(/Bientôt disponible/g) ?? []).length).toBe(3)
    expect(html).toContain('type="number"')
    expect(html).toContain('value="10"')
    expect((html.match(/data-slot="slider"/g) ?? []).length).toBe(2)
    expect((html.match(/data-disabled=""/g) ?? []).length).toBeGreaterThanOrEqual(2)
  })

  test('rend un Empty canonique et désactive l’exécution pour une source indisponible', () => {
    const record: BulkOperationRecord = {
      id: 'bulk-lots',
      name: 'Lots',
      description: 'Source future',
      definition: { ...emptyBulkOperationDefinition(), source: 'lots_locatifs' },
      reportsToKeep: 4,
      edits: [],
      lastRunAt: null
    }
    const html = renderToStaticMarkup(<BulkEditor {...props} record={record} />)

    expect(html).toContain('Source bientôt disponible')
    expect(html).toContain('>Traitement</legend>')
    expect(html).not.toContain('>Audience</legend>')
    expect(html).not.toContain('>Acheminement</legend>')
    expect(html).not.toContain('>Application</legend>')
    expect(html).not.toContain('>Filtres</legend>')
    expect(html).not.toContain('Action appliquée sans envoi')
    expect(html).not.toContain('Panier d’arrivée')
    expect(html).not.toContain('>Canaux</')
    expect(html).toContain('Traiter sans envoyer')
    expect((html.match(/disabled=""/g) ?? []).length).toBeGreaterThanOrEqual(5)
  })

  test('rend les bornes inclusives et toutes les étapes enregistrées', () => {
    const definition: BulkOperationRecord['definition'] = {
      ...emptyBulkOperationDefinition(),
      amountRange: { from: '50', to: '25000' },
      unpaidMonthsRange: { from: '0.25', to: '24' },
      notifyManager: true,
      delivery: {
        kind: 'fallback' as const,
        steps: [
          { medium: 'rcs' as const, action: 'RCS', body: 'Bonjour', placeholderBindings: {} },
          {
            medium: 'email' as const,
            action: 'Courriel',
            subject: 'Relance',
            body: 'Bonjour',
            placeholderBindings: {}
          }
        ]
      }
    }
    const record: BulkOperationRecord = {
      id: 'bulk-1',
      name: 'Relance',
      description: 'Description',
      definition,
      reportsToKeep: 10,
      edits: [],
      lastRunAt: null
    }
    const html = renderToStaticMarkup(<BulkEditor {...props} record={record} />)

    expect(html).toContain('Fallback 1')
    expect(html).toContain('50 €')
    expect(html).toContain('25 000 €')
    expect(html).toContain('0,25 mois')
    expect(html).toContain('aria-checked="true"')
  })

  test('rend le blank state du RCS enrichi', () => {
    const record: BulkOperationRecord = {
      id: 'bulk-rich',
      name: 'Parcours RCS',
      description: '',
      definition: {
        ...emptyBulkOperationDefinition(),
        delivery: {
          kind: 'rich_rcs',
          action: 'Relancer',
          nodes: [{ id: 'message_1', body: 'Bonjour', richContent: {}, transitions: {} }],
          placeholderBindings: {},
          replyTimeoutHours: 72
        }
      },
      reportsToKeep: 10,
      edits: [],
      lastRunAt: null
    }
    const html = renderToStaticMarkup(<BulkEditor {...props} record={record} />)

    expect(html).toContain('RCS enrichi bientôt disponible')
    expect(html).toContain('La création de parcours conversationnels sera proposée prochainement.')
    expect(html).not.toContain('Contenu RCS enrichi (JSON)')
    expect(html).not.toContain('Ajouter un message')
  })
})

describe('payloads bulk operation', () => {
  test('conserve le contrat complet au save et les deux modes à l’exécution', () => {
    const definition = emptyBulkOperationDefinition()
    const draft = {
      name: '  Relance août  ',
      description: 'Plan',
      definition,
      reportsToKeep: '7'
    }
    const body = { name: 'Relance août', description: 'Plan', definition, reportsToKeep: 7 }
    expect(bulkOperationWriteBody(draft)).toEqual(body)
    expect(bulkOperationCreatePayload('https://example.test', draft)).toEqual({
      url: 'https://example.test',
      ...body
    })
    expect(bulkOperationPatchPayload('https://example.test', 'bulk-1', draft)).toEqual({
      url: 'https://example.test',
      id: 'bulk-1',
      patch: body
    })

    const commandId = '018f47b1-6e34-7cab-a101-123456789abc'
    expect(
      bulkOperationExecutePayload('https://example.test', 'bulk-1', 'send', commandId)
    ).toEqual({
      url: 'https://example.test',
      id: 'bulk-1',
      mode: 'send',
      clientCommandId: commandId
    })
    expect(
      bulkOperationExecutePayload('https://example.test', 'bulk-1', 'apply_without_send', commandId)
        .mode
    ).toBe('apply_without_send')
  })

  test('valide le nombre de rapports conservés', () => {
    expect(reportsToKeepError('10')).toBeNull()
    expect(reportsToKeepError('1')).toBeNull()
    expect(reportsToKeepError('0')).not.toBeNull()
    expect(reportsToKeepError('1.5')).not.toBeNull()
    expect(reportsToKeepError('')).not.toBeNull()
  })

  test('réutilise la commande après erreur ambiguë et en crée une après succès', () => {
    let sequence = 0
    const create = () => `command-${++sequence}`
    const first = nextBulkOperationCommandId(null, create)
    expect(nextBulkOperationCommandId(first, create)).toBe(first)
    expect(sequence).toBe(1)
    expect(nextBulkOperationCommandId(null, create)).toBe('command-2')
  })
})

describe('libellés de résultat', () => {
  test('résume les canaux et explique les étapes sautées', () => {
    const rows = [
      previewRow({ id_locataire: 'A' }),
      previewRow({
        id_locataire: 'B',
        route: { kind: 'fallback', medium: 'sms', stepIndex: 1 }
      }),
      previewRow({
        id_locataire: 'C',
        status: 'no_usable_route',
        route: null
      })
    ]

    expect(previewChannelTotals(rows)).toEqual({ email: 1, sms: 1 })
    expect(formatPreviewChannelTotals(rows)).toBe('Courriel : 1 · SMS : 1')
    expect(previewStepReasonLabel({ code: 'missing_destination' })).toBe('coordonnée absente')
    expect(
      previewStepReasonLabel({ code: 'missing_placeholders', placeholders: ['nom', 'solde'] })
    ).toBe('données manquantes : nom, solde')
  })
})

describe('contenus et liaisons bulk', () => {
  test('charge les colonnes du ledger et signale une réponse indisponible', async () => {
    const getLedger = mock(async () => ({
      data: [{ nom: 'Dupont' }],
      meta: { columns: [{ name: 'nom', type: 'TEXT' }] }
    }))
    expect(await loadPlaceholderColumnItems('https://example.test', getLedger)).toEqual([
      { value: 'date_du_jour', label: 'Date du jour (date_du_jour)' },
      { value: 'nom', label: 'nom' }
    ])
    expect(getLedger).toHaveBeenCalledWith({ url: 'https://example.test', limit: 1 })

    await expect(
      loadPlaceholderColumnItems('https://example.test', async () => null)
    ).rejects.toThrow('Impossible de charger les colonnes disponibles.')
  })

  test('collecte et réconcilie les placeholders inline', () => {
    expect(collectBulkPlaceholders(['Bonjour {{ nom }}', { label: '{{solde}}' }])).toEqual([
      'nom',
      'solde'
    ])
    expect(reconcilePlaceholderBindings(['nom'], { nom: 'nom_client', ancien: 'x' })).toEqual({
      nom: 'nom_client'
    })
  })

  test('rend l’éditeur de commande slash sans liaison manuelle pour le texte', () => {
    const record: BulkOperationRecord = {
      id: 'bulk-bindings',
      name: 'Relance',
      description: '',
      definition: {
        ...emptyBulkOperationDefinition(),
        delivery: {
          kind: 'fallback',
          steps: [
            {
              medium: 'email',
              action: 'Relancer',
              subject: 'Relance {{id_client}}',
              body: 'Bonjour {{nom}}',
              placeholderBindings: { id_client: 'id_client', nom: 'nom' }
            }
          ]
        }
      },
      reportsToKeep: 10,
      edits: [],
      lastRunAt: null
    }
    const html = renderToStaticMarkup(<BulkEditor {...props} record={record} />)

    expect((html.match(/role="combobox"/g) ?? []).length).toBeGreaterThanOrEqual(2)
    expect((html.match(/data-slot="bulk-template-field"/g) ?? []).length).toBe(2)
    expect(html).not.toContain('Liaisons des placeholders')
    expect(html).not.toContain('Indiquez quelle colonne alimente')
    expect(html).not.toContain('placeholder="colonne_source"')
  })

  test('valide le fallback et le graphe RCS sans ancien catalogue', () => {
    expect(bulkDeliveryError(emptyBulkOperationDefinition().delivery)).toBe(
      'Le contenu de chaque message est requis.'
    )
    expect(
      bulkDeliveryError({
        kind: 'rich_rcs',
        action: 'Relancer',
        replyTimeoutHours: 72,
        placeholderBindings: {},
        nodes: [{ id: 'message_1', body: 'Bonjour', richContent: {}, transitions: {} }]
      })
    ).toBeNull()
    expect(
      bulkDeliveryError({
        kind: 'fallback',
        steps: [
          {
            medium: 'courrier',
            action: 'R1',
            filename: 'R1.docx',
            fileBase64: 'UEs=',
            placeholders: [],
            placeholderBindings: {},
            summary: ''
          }
        ]
      })
    ).toBe('Décrivez le contenu du courrier.')
    expect(
      bulkDeliveryError({
        kind: 'fallback',
        steps: [
          {
            medium: 'courrier',
            action: 'R1',
            filename: 'R1.docx',
            fileBase64: 'UEs=',
            placeholders: [],
            placeholderBindings: {},
            summary: 'Relance amiable du solde.'
          }
        ]
      })
    ).toBeNull()
  })

  test('affiche le résumé du courrier après un fichier Word', () => {
    const record: BulkOperationRecord = {
      id: 'bulk-courrier',
      name: 'Relance',
      description: '',
      definition: {
        ...emptyBulkOperationDefinition(),
        delivery: {
          kind: 'fallback',
          steps: [
            {
              medium: 'courrier',
              action: 'R1',
              filename: 'R1.docx',
              fileBase64: 'UEs=',
              placeholders: ['solde'],
              placeholderBindings: { solde: 'solde_locataire' },
              summary: 'Relance amiable du solde.'
            }
          ]
        }
      },
      reportsToKeep: 10,
      edits: [],
      lastRunAt: null
    }
    const html = renderToStaticMarkup(<BulkEditor {...props} record={record} />)

    expect(html).toContain('Résumé du courrier')
    expect(html).toContain('sans s’afficher dans l’historique')
    expect(html).toContain('Relance amiable du solde.')
    expect(html).toContain('{{solde}}')
    expect(html).toContain('data-orientation="horizontal"')
  })

  test('affiche le résumé dès le canal courrier, sans fichier Word', () => {
    const record: BulkOperationRecord = {
      id: 'bulk-courrier-vide',
      name: 'Relance',
      description: '',
      definition: {
        ...emptyBulkOperationDefinition(),
        delivery: {
          kind: 'fallback',
          steps: [
            {
              medium: 'courrier',
              action: 'R1',
              filename: '',
              fileBase64: '',
              placeholders: [],
              placeholderBindings: {},
              summary: ''
            }
          ]
        }
      },
      reportsToKeep: 10,
      edits: [],
      lastRunAt: null
    }
    const html = renderToStaticMarkup(<BulkEditor {...props} record={record} />)

    expect(html).toContain('Modèle Word')
    expect(html).toContain('Résumé du courrier')
    const buttonTag = (label: string) => {
      const index = html.indexOf(`>${label}<`)
      return html.slice(html.lastIndexOf('<', index), index)
    }
    expect(buttonTag('Enregistrer')).not.toContain('disabled=""')
    expect(buttonTag('Traiter sans envoyer')).toContain('disabled=""')
    expect(buttonTag('Appliquer le traitement')).toContain('disabled=""')
  })

  test('affiche les aperçus PDF et RCS renvoyés par le serveur', () => {
    const pdf = renderToStaticMarkup(
      <BulkMessagePreview
        preview={{
          kind: 'pdf',
          medium: 'courrier',
          filename: 'Aperçu.pdf',
          pdfBase64: 'JVBERg==',
          mimeType: 'application/pdf'
        }}
      />
    )
    const rich = renderToStaticMarkup(
      <BulkMessagePreview
        preview={{
          kind: 'rich_rcs',
          medium: 'rcs',
          nodeId: 'message_1',
          body: 'Bonjour',
          richContent: { content: 'Carte' },
          placeholders: {}
        }}
      />
    )

    expect(pdf).toContain('data:application/pdf;base64,JVBERg==')
    expect(pdf).toContain('Aperçu.pdf')
    expect(rich).toContain('Bonjour')
    expect(rich).toContain('&quot;content&quot;')
  })
})
