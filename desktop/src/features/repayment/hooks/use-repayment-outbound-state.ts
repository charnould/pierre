import { useCallback, useEffect, useRef, useState } from 'react'

import type { OutboundEmailResolved, OutboundRcsResolved } from '../lib/outbound-email-templates'

const EMAIL_CONFIRM_FALLBACK_MS = 2000

export function useRepaymentOutboundState(onEmailOpenError: () => void) {
  const [rcsMessage, setRcsMessage] = useState('')
  const [pendingRcsTemplateId, setPendingRcsTemplateId] = useState<string | null>(null)
  const [pendingMailto, setPendingMailto] = useState<OutboundEmailResolved | null>(null)
  const [emailConfirmOpen, setEmailConfirmOpen] = useState(false)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [pendingEmailTemplateId, setPendingEmailTemplateId] = useState<string | null>(null)
  const [pendingEmailTo, setPendingEmailTo] = useState('')
  const emailBlurSeenRef = useRef(false)
  const emailRequestIdRef = useRef(0)

  const clearPendingMailto = useCallback(() => {
    emailRequestIdRef.current += 1
    setPendingMailto(null)
    setEmailConfirmOpen(false)
    emailBlurSeenRef.current = false
  }, [])

  const clearRcsReview = useCallback(() => {
    setRcsMessage('')
    setPendingRcsTemplateId(null)
  }, [])

  const clearEmailReview = useCallback(() => {
    setEmailSubject('')
    setEmailBody('')
    setPendingEmailTemplateId(null)
    setPendingEmailTo('')
  }, [])

  const reset = useCallback(() => {
    clearPendingMailto()
    clearRcsReview()
    clearEmailReview()
  }, [clearEmailReview, clearPendingMailto, clearRcsReview])

  const selectRcsTemplate = useCallback((resolved: OutboundRcsResolved) => {
    setRcsMessage(resolved.body)
    setPendingRcsTemplateId(resolved.templateId)
  }, [])

  const selectEmailTemplate = useCallback((resolved: OutboundEmailResolved) => {
    setEmailSubject(resolved.subject)
    setEmailBody(resolved.body)
    setPendingEmailTemplateId(resolved.templateId)
    setPendingEmailTo(resolved.toAddress)
  }, [])

  const selectMailtoTemplate = useCallback(
    (resolved: OutboundEmailResolved) => {
      const requestId = ++emailRequestIdRef.current
      emailBlurSeenRef.current = false
      setEmailConfirmOpen(false)
      setPendingMailto(resolved)
      void window.api.openExternal(resolved.mailtoUrl).then(
        (ok) => {
          if (requestId !== emailRequestIdRef.current || ok) return
          onEmailOpenError()
          clearPendingMailto()
        },
        () => {
          if (requestId !== emailRequestIdRef.current) return
          onEmailOpenError()
          clearPendingMailto()
        }
      )
    },
    [clearPendingMailto, onEmailOpenError]
  )

  useEffect(() => {
    if (!pendingMailto || emailConfirmOpen) return

    const onBlur = () => {
      emailBlurSeenRef.current = true
    }
    const onFocus = () => {
      if (emailBlurSeenRef.current) setEmailConfirmOpen(true)
    }
    const fallbackId = window.setTimeout(() => {
      if (!emailBlurSeenRef.current && document.hasFocus()) {
        setEmailConfirmOpen(true)
      }
    }, EMAIL_CONFIRM_FALLBACK_MS)

    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)
    return () => {
      window.clearTimeout(fallbackId)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', onFocus)
    }
  }, [emailConfirmOpen, pendingMailto])

  return {
    clearEmailReview,
    clearPendingMailto,
    clearRcsReview,
    emailBody,
    emailConfirmOpen,
    emailSubject,
    pendingEmailTemplateId,
    pendingEmailTo,
    pendingMailto,
    pendingRcsTemplateId,
    reset,
    selectEmailTemplate,
    selectMailtoTemplate,
    selectRcsTemplate,
    setEmailBody,
    setEmailSubject,
    setRcsMessage,
    rcsMessage
  }
}
