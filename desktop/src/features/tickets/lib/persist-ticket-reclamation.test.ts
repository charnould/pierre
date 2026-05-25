import { describe, expect, it, mock } from 'bun:test'

import { persistTicketReclamation } from './persist-ticket-reclamation'

describe('persistTicketReclamation', () => {
  it('calls putTicket when url is set', async () => {
    const putTicket = mock(() =>
      Promise.resolve({
        ok: true,
        id_reclamation: 'reclamation-abc',
        id_locataire: 'locataire-xyz'
      })
    )

    ;(globalThis as { window: { api: { putTicket: typeof putTicket } } }).window = {
      api: { putTicket } as unknown as Window['api']
    }

    const ok = await persistTicketReclamation('https://pierre.example', {
      id_reclamation: 'reclamation-abc',
      id_locataire: 'locataire-xyz'
    })

    expect(ok).toBe(true)
    expect(putTicket).toHaveBeenCalledTimes(1)
    expect(putTicket).toHaveBeenCalledWith({
      url: 'https://pierre.example',
      id_reclamation: 'reclamation-abc',
      id_locataire: 'locataire-xyz'
    })
  })

  it('returns false when url is missing', async () => {
    expect(
      await persistTicketReclamation(undefined, {
        id_reclamation: 'reclamation-abc',
        id_locataire: 'locataire-xyz'
      })
    ).toBe(false)
  })
})
