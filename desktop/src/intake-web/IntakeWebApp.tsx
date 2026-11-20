import type { IntakePublicBoot } from '@pierre/shared/intakes'
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  groupIntakeFieldsBySection,
  IntakeNoticeCard,
  IntakePasswordCard,
  IntakeSectionCards
} from '@/shared/components/IntakeFormFields'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { FieldDescription, FieldError, FieldLabel } from '@/shared/components/ui/field'
import { Input } from '@/shared/components/ui/input'

import { IntakeSpeechProvider } from './IntakeSpeechProvider'

export function IntakeWebApp({ boot }: { boot: IntakePublicBoot }) {
  const formRef = useRef<HTMLFormElement | null>(null)
  const [submissionId, setSubmissionId] = useState(boot.initialSubmissionId)
  const [submitting, setSubmitting] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [speechError, setSpeechError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [reference, setReference] = useState<string | null>(null)

  const sections = useMemo(() => groupIntakeFieldsBySection(boot.form.fields), [boot.form.fields])

  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted && typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        setSubmissionId(crypto.randomUUID())
      }
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  const clearFieldError = useCallback((key: string) => {
    setFieldErrors((prev) => {
      if (!(key in prev)) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submitting || !formRef.current) return
    setSubmitting(true)
    setGlobalError(null)
    setSpeechError(null)
    setFieldErrors({})

    try {
      const formData = new FormData(formRef.current)
      formData.set('_id', submissionId)
      const response = await fetch(boot.actionUrl, {
        method: 'POST',
        body: formData
      })
      const payload = (await response.json().catch(() => null)) as {
        data?: { id?: string }
        error?: { code?: string; message?: string; fields?: Record<string, string> }
      } | null

      if (response.ok && payload?.data?.id) {
        setReference(payload.data.id)
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }

      if (response.status === 422 && payload?.error) {
        const nextErrors = payload.error.fields ?? {}
        setFieldErrors(nextErrors)
        if (payload.error.message) setGlobalError(payload.error.message)
        const firstKey = Object.keys(nextErrors)[0]
        if (firstKey) {
          requestAnimationFrame(() => {
            formRef.current
              ?.querySelector<HTMLElement>(`[data-field-key="${CSS.escape(firstKey)}"]`)
              ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          })
        }
        return
      }

      setGlobalError(
        payload?.error?.message || 'L’envoi a échoué. Veuillez réessayer dans un instant.'
      )
    } catch {
      setGlobalError('Erreur réseau. Vos réponses sont conservées, veuillez réessayer.')
    } finally {
      setSubmitting(false)
    }
  }

  const bannerError = globalError ?? speechError

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-8">
      <h1 className="sr-only">{boot.form.title}</h1>

      {reference ? (
        <Card aria-live="polite">
          <CardHeader>
            <CardTitle>Réponse enregistrée</CardTitle>
            <FieldDescription>Merci. Votre réponse a bien été enregistrée.</FieldDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-xs leading-4">
              Référence de dépôt :{' '}
              <code className="text-foreground font-mono text-sm font-medium tabular-nums">
                {reference}
              </code>
            </p>
          </CardContent>
        </Card>
      ) : (
        <IntakeSpeechProvider speechUrl={boot.speechUrl} onError={setSpeechError}>
          <form
            ref={formRef}
            action={boot.actionUrl}
            method="post"
            encType="multipart/form-data"
            noValidate
            onSubmit={handleSubmit}
            className="flex flex-col gap-4"
          >
            <div aria-hidden="true" className="sr-only">
              <FieldLabel htmlFor="intake-website">Site web</FieldLabel>
              <Input
                id="intake-website"
                name="_website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
              />
            </div>

            {bannerError ? (
              <Card size="sm" data-invalid="">
                <CardContent>
                  <FieldError>{bannerError}</FieldError>
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardContent>
                <div className="flex flex-col gap-4">
                  {boot.hasPasswords ? (
                    <IntakePasswordCard
                      layout="stacked"
                      error={fieldErrors._password}
                      onClearError={() => clearFieldError('_password')}
                    />
                  ) : null}

                  <IntakeSectionCards
                    sections={sections}
                    layout="stacked"
                    fieldErrors={fieldErrors}
                    onClearError={clearFieldError}
                  />

                  {boot.form.notice ? <IntakeNoticeCard notice={boot.form.notice} /> : null}
                </div>
              </CardContent>
            </Card>

            <div>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Envoi en cours…' : 'Envoyer'}
              </Button>
            </div>
          </form>
        </IntakeSpeechProvider>
      )}
    </main>
  )
}
