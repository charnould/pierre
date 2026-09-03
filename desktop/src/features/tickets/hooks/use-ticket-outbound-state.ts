import { useCallback, useState } from 'react'

import type { TicketRow } from '@/shared/types'

import { empty_rcs_compose, type RcsComposeValue } from '../../../../../shared/rcs-message'

function ticketField(ticket: TicketRow | null, ...keys: string[]): string {
  if (!ticket) return ''
  for (const key of keys) {
    if (ticket[key] != null) return String(ticket[key])
  }
  return ''
}

function seedRcsCompose(ticket: TicketRow | null, current?: RcsComposeValue): RcsComposeValue {
  const phone = ticketField(ticket, 'telephone_locataire', 'telephone')
  if (!current) return empty_rcs_compose(phone)
  return {
    ...current,
    destinataire: current.destinataire.trim() ? current.destinataire : phone
  }
}

export function useTicketOutboundState(ticket: TicketRow | null) {
  const [rcsCompose, setRcsCompose] = useState<RcsComposeValue>(() => seedRcsCompose(ticket))
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [letterSubject, setLetterSubject] = useState('')
  const [letterBody, setLetterBody] = useState('')
  const [externalSubject, setExternalSubject] = useState('')
  const [externalBody, setExternalBody] = useState('')
  const [externalConfirmation, setExternalConfirmation] = useState<{
    applicationName: string
    subject: string
    message: string
    destinataire?: string
  } | null>(null)

  const reset = useCallback(() => {
    setRcsCompose(seedRcsCompose(ticket))
    setEmailSubject('')
    setEmailBody('')
    setLetterSubject('')
    setLetterBody('')
    setExternalSubject('')
    setExternalBody('')
    setExternalConfirmation(null)
  }, [ticket])

  const seedRcsFromTicket = useCallback(() => {
    setRcsCompose((current) => seedRcsCompose(ticket, current))
  }, [ticket])

  return {
    destinataireAddress: ticketField(ticket, 'adresse_locataire', 'adresse', 'adresse_reclamation'),
    destinataireEmail: ticketField(ticket, 'email_locataire', 'email'),
    emailBody,
    emailSubject,
    externalBody,
    externalConfirmation,
    externalSubject,
    letterBody,
    letterSubject,
    rcsCompose,
    reset,
    seedRcsFromTicket,
    setEmailBody,
    setEmailSubject,
    setExternalBody,
    setExternalConfirmation,
    setExternalSubject,
    setLetterBody,
    setLetterSubject,
    setRcsCompose
  }
}
