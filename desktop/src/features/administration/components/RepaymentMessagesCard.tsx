import { CircleCheck, Send, Trash2 } from 'lucide-react'
import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { Button } from '@/shared/components/ui/button'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Field, FieldDescription, FieldError, FieldGroup } from '@/shared/components/ui/field'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { toast } from '@/shared/components/ui/toast'

import type { RepaymentMessage } from '../../../../../shared/repayment-messages'
import { followRcsTest } from '../lib/rcs-test'

type Draft = {
  key: string
  text: string
  verified: { text: string; message: RepaymentMessage } | null
  error: string
  phone: string
  testStatus: string
  testing: boolean
}

function readStored(raw: string | null): string[] {
  if (!raw?.trim()) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) return parsed
  } catch {
    return []
  }
  return []
}

function blank(): Draft {
  return {
    key: crypto.randomUUID(),
    text: '',
    verified: null,
    error: '',
    phone: '',
    testStatus: '',
    testing: false
  }
}

function mailtoUrl(message: Extract<RepaymentMessage, { kind: 'email' }>): string {
  const params = [
    `subject=${encodeURIComponent(message.subject)}`,
    `body=${encodeURIComponent(message.body)}`
  ]
  return `mailto:${message.email ?? ''}?${params.join('&')}`
}

function fit(node: HTMLTextAreaElement) {
  node.style.height = 'auto'
  node.style.height = `${node.scrollHeight}px`
}

function MessageZone({
  draft,
  saved,
  onText,
  onVerify,
  onRemove,
  onPhone,
  onTestEmail,
  onTestRcs,
  onOpen
}: {
  draft: Draft
  saved: boolean
  onText: (text: string) => void
  onVerify: () => void
  onRemove: () => void
  onPhone: (phone: string) => void
  onTestEmail: () => void
  onTestRcs: () => void
  onOpen: (url: string) => void
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const verified = draft.verified?.text === draft.text ? draft.verified.message : null
  useLayoutEffect(() => {
    if (ref.current) fit(ref.current)
  }, [draft.text])

  return (
    <Field data-invalid={draft.error ? true : undefined}>
      <Textarea
        ref={ref}
        mono
        rows={1}
        spellCheck={false}
        placeholder="Coller un JSON ou un Markdown"
        aria-label="Texte du message"
        className="field-sizing-fixed min-h-0 resize-none overflow-hidden"
        value={draft.text}
        onChange={(event) => {
          fit(event.currentTarget)
          onText(event.target.value)
        }}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" onClick={onVerify}>
          Vérifier
        </Button>
        {saved ? (
          <CircleCheck
            aria-label="Message, enregistré"
            className="size-4 shrink-0"
            strokeWidth={1.5}
          />
        ) : null}
        {draft.error ? <FieldError errors={[{ message: draft.error }]} /> : null}
        {verified ? (
          <p className="text-muted-foreground text-xs leading-4">
            {verified.kind === 'rcs' ? 'RCS' : 'Courriel'} · {verified.label}
          </p>
        ) : null}
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Supprimer le message"
          className="ml-auto"
          onClick={onRemove}
        >
          <Trash2 />
        </Button>
      </div>
      {verified?.kind === 'rcs' ? (
        <div className="flex items-center gap-2">
          <Input
            value={draft.phone}
            placeholder="Téléphone"
            aria-label="Téléphone d’essai"
            onChange={(event) => onPhone(event.target.value)}
          />
          <Button
            type="button"
            variant="outline"
            disabled={!draft.phone.trim() || draft.testing}
            onClick={onTestRcs}
          >
            <Send />
            Tester
          </Button>
        </div>
      ) : null}
      {verified?.kind === 'email' && verified.to === 'locataire' ? (
        <Button type="button" variant="outline" disabled={draft.testing} onClick={onTestEmail}>
          Tester
        </Button>
      ) : null}
      {verified?.kind === 'email' && verified.to === 'caf' ? (
        <Button type="button" variant="outline" onClick={() => onOpen(mailtoUrl(verified))}>
          Ouvrir
        </Button>
      ) : null}
      {draft.testStatus ? (
        <p className="text-muted-foreground text-xs leading-4" aria-live="polite">
          {draft.testStatus}
        </p>
      ) : null}
    </Field>
  )
}

export function RepaymentMessagesCard({
  url,
  stored,
  children,
  onDrafts,
  onTouch
}: {
  url: string
  stored: string | null
  children: ReactNode
  onDrafts: (texts: string[]) => void
  onTouch: () => void
}) {
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [dirty, setDirty] = useState(false)
  const [seen, setSeen] = useState<string | null>(null)
  const poll = useRef(0)
  const storedTexts = readStored(stored)

  if (!dirty && seen !== stored) {
    setSeen(stored)
    setDrafts(storedTexts.map((text) => ({ ...blank(), text })))
  }

  useEffect(() => {
    onDrafts(drafts.map((draft) => draft.text))
  }, [drafts, onDrafts])

  function touch(next: Draft[]) {
    setDirty(true)
    setDrafts(next)
    onTouch()
  }

  function edit(key: string, text: string) {
    poll.current += 1
    touch(
      drafts.map((draft) =>
        draft.key === key ? { ...draft, text, verified: null, error: '', testStatus: '' } : draft
      )
    )
  }

  async function verify(key: string, text: string) {
    const response = await window.api?.verifyRepaymentMessage?.({ url, text })
    setDrafts((items) =>
      items.map((draft) => {
        if (draft.key !== key || draft.text !== text) return draft
        return response?.data
          ? { ...draft, verified: { text, message: response.data }, error: '' }
          : {
              ...draft,
              verified: null,
              error: response?.error?.message ?? 'Vérification impossible'
            }
      })
    )
  }

  async function testEmail(key: string, text: string) {
    setDrafts((items) =>
      items.map((draft) => (draft.key === key ? { ...draft, testing: true } : draft))
    )
    const response = await window.api?.testRepaymentEmail?.({ url, text })
    setDrafts((items) =>
      items.map((draft) => (draft.key === key ? { ...draft, testing: false } : draft))
    )
    if (!response?.data) {
      toast.add({ title: response?.error?.message ?? 'Envoi impossible', type: 'error' })
      return
    }
    toast.add({ title: 'Email de test envoyé', type: 'success' })
  }

  async function testRcs(draft: Draft) {
    const message = draft.verified?.text === draft.text ? draft.verified.message : null
    if (message?.kind !== 'rcs' || !draft.phone.trim()) return
    const generation = ++poll.current
    const ref = `rcs-test-${crypto.randomUUID()}`
    setDrafts((items) =>
      items.map((item) =>
        item.key === draft.key ? { ...item, testing: true, testStatus: '' } : item
      )
    )
    const response = await window.api?.sendCommunication?.({
      url,
      idempotencyKey: crypto.randomUUID(),
      channel: 'rcs',
      contexte: 'repayment',
      ref,
      destinataire: draft.phone.trim(),
      contenu: {
        body: message.body,
        sms_fallback: message.sms_fallback,
        choices: message.choices,
        action: message.action
      }
    })
    if (generation !== poll.current) return
    if (!response || 'error' in response) {
      setDrafts((items) =>
        items.map((item) =>
          item.key === draft.key
            ? {
                ...item,
                testing: false,
                testStatus: response?.error.message ?? 'Envoi impossible'
              }
            : item
        )
      )
      return
    }
    await followRcsTest({
      url,
      contexte: 'repayment',
      ref,
      isCurrent: () => generation === poll.current,
      onStatus: (status) => {
        if (generation !== poll.current) return
        setDrafts((items) =>
          items.map((item) => (item.key === draft.key ? { ...item, testStatus: status } : item))
        )
      }
    })
    if (generation !== poll.current) return
    setDrafts((items) =>
      items.map((item) => (item.key === draft.key ? { ...item, testing: false } : item))
    )
  }

  return (
    <section aria-label="Impayés">
      <Card>
        <CardContent>
          <div className="flex flex-col gap-4">
            <FieldDescription>
              Un JSON est un RCS. Un Markdown est un courriel : locataire pour Pierre, caf pour le
              client mail. Vérifier contrôle le texte sans l’enregistrer.
            </FieldDescription>
            <FieldGroup variant="rows">
              {children}
              {drafts.map((draft, position) => (
                <MessageZone
                  key={draft.key}
                  draft={draft}
                  saved={storedTexts[position] === draft.text}
                  onText={(text) => edit(draft.key, text)}
                  onVerify={() => void verify(draft.key, draft.text)}
                  onRemove={() => touch(drafts.filter((item) => item.key !== draft.key))}
                  onPhone={(phone) =>
                    setDrafts((items) =>
                      items.map((item) => (item.key === draft.key ? { ...item, phone } : item))
                    )
                  }
                  onTestEmail={() => void testEmail(draft.key, draft.text)}
                  onTestRcs={() => void testRcs(draft)}
                  onOpen={(target) => void window.api?.openExternal(target)}
                />
              ))}
            </FieldGroup>
            <Button
              type="button"
              variant="outline"
              className="self-start"
              onClick={() => touch([...drafts, blank()])}
            >
              Ajouter
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
