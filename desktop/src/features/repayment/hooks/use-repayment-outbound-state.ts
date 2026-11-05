import { useCallback, useEffect, useRef, useState } from 'react'

import { empty_rcs_compose, type RcsComposeValue } from '../../../../../shared/rcs-message'
import type { ResolvedRepaymentEmail, ResolvedRepaymentRcs } from '../lib/repayment-messages'

const EMAIL_CONFIRM_FALLBACK_MS = 2000

const EMPTY_RCS = empty_rcs_compose()

export function useRepaymentOutboundState(onEmailOpenError: () => void) {
  const [rcsCompose, setRcsCompose] = useState<RcsComposeValue>(EMPTY_RCS)
  const [pendingRcsAction, setPendingRcsAction] = useState<string | null>(null)
  const [pendingMailto, setPendingMailto] = useState<ResolvedRepaymentEmail | null>(null)
  const [emailConfirmOpen, setEmailConfirmOpen] = useState(false)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const emailBlurSeenRef = useRef(false)
  const emailRequestIdRef = useRef(0)

  const clearPendingMailto = useCallback(() => {
    emailRequestIdRef.current += 1
    setPendingMailto(null)
    setEmailConfirmOpen(false)
    emailBlurSeenRef.current = false
  }, [])

  const clearRcsReview = useCallback(() => {
    setRcsCompose(EMPTY_RCS)
    setPendingRcsAction(null)
  }, [])

  const clearEmailReview = useCallback(() => {
    setEmailSubject('')
    setEmailBody('')
  }, [])

  const reset = useCallback(() => {
    clearPendingMailto()
    clearRcsReview()
    clearEmailReview()
  }, [clearEmailReview, clearPendingMailto, clearRcsReview])

  const selectRcsTemplate = useCallback((resolved: ResolvedRepaymentRcs, phone: string) => {
    setRcsCompose((current) => ({
      destinataire: current.destinataire.trim() ? current.destinataire : phone,
      body: resolved.body,
      sms_fallback: resolved.sms_fallback,
      choices: resolved.choices
    }))
    setPendingRcsAction(resolved.action)
  }, [])

  const selectEmailTemplate = useCallback((resolved: ResolvedRepaymentEmail) => {
    setEmailSubject(resolved.subject)
    setEmailBody(resolved.body)
  }, [])

  const selectMailtoTemplate = useCallback(
    (resolved: ResolvedRepaymentEmail) => {
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
    pendingMailto,
    pendingRcsAction,
    reset,
    selectEmailTemplate,
    selectMailtoTemplate,
    selectRcsTemplate,
    setEmailBody,
    setEmailSubject,
    setRcsCompose,
    rcsCompose
  }
}
