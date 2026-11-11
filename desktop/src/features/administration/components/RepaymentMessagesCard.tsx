import { CircleCheck, Trash2 } from 'lucide-react'
import { type ReactNode, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'

import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/shared/components/ui/dialog'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet
} from '@/shared/components/ui/field'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
import { toast } from '@/shared/components/ui/toast'

import type { RepaymentMessage } from '../../../../../shared/repayment-messages'
import type { TenantRepaymentRow } from '../../repayment/lib/classify-tenants'
import { resolveRepaymentEmail, resolveRepaymentRcs } from '../../repayment/lib/repayment-messages'

const TEST_NOTICE =
  'Les données envoyées et les placeholders sont fictifs. Le test est enregistré comme une activité technique, sans être rattaché à un dossier locataire. Ses réponses, webhooks et statuts ne sont pas affichés ici.'

const FICTIVE_TENANT = {
  id_locataire: 'LOC-TEST',
  id_client: 'CLI-TEST',
  solde_locataire: 0,
  email_client: 'locataire@exemple.fr',
  telephone_client: '0600000000'
} satisfies TenantRepaymentRow

function resolvedEmail(message: Extract<RepaymentMessage, { kind: 'email' }>) {
  const resolved = resolveRepaymentEmail(message, FICTIVE_TENANT)
  return { action: resolved.action, subject: resolved.subject, body: resolved.body }
}

type Draft = {
  key: string
  text: string
  verified: { text: string; message: RepaymentMessage } | null
  error: string
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
    testing: false
  }
}

export function RepaymentMessageTestDialog({
  open,
  kind,
  value,
  sending,
  onValue,
  onCancel,
  onSend
}: {
  open: boolean
  kind: 'rcs' | 'email'
  value: string
  sending: boolean
  onValue: (value: string) => void
  onCancel: () => void
  onSend: () => void
}) {
  const fieldId = useId()
  const phone = kind === 'rcs'
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel()
      }}
    >
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Tester</DialogTitle>
          <DialogDescription>{TEST_NOTICE}</DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor={fieldId}>{phone ? 'Téléphone' : 'Email'}</FieldLabel>
          <Input
            id={fieldId}
            type={phone ? 'tel' : 'email'}
            value={value}
            onChange={(event) => onValue(event.target.value)}
          />
        </Field>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Annuler
          </Button>
          <Button type="button" disabled={!value.trim() || sending} onClick={onSend}>
            Envoyer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
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
  onTest
}: {
  draft: Draft
  saved: boolean
  onText: (text: string) => void
  onVerify: () => void
  onRemove: () => void
  onTest: (destinataire: string) => Promise<boolean>
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [open, setOpen] = useState(false)
  const [destination, setDestination] = useState('')
  const verified = draft.verified?.text === draft.text ? draft.verified.message : null
  const canTest = verified !== null && !draft.testing
  useLayoutEffect(() => {
    if (ref.current) fit(ref.current)
  }, [draft.text])

  function test() {
    if (!verified || draft.testing) return
    setDestination('')
    setOpen(true)
  }

  async function send() {
    if (!verified || !destination.trim() || draft.testing) return
    const ok = await onTest(destination.trim())
    if (!ok) return
    setDestination('')
    setOpen(false)
  }

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
      <div className="flex min-w-0 flex-nowrap items-center gap-2">
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
        <Button type="button" variant="outline" disabled={!canTest} onClick={test}>
          Tester
        </Button>
        {verified ? (
          <p className="text-muted-foreground min-w-0 flex-1 truncate text-xs leading-4">
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
      {draft.error ? <FieldError errors={[{ message: draft.error }]} /> : null}
      {open && verified ? (
        <RepaymentMessageTestDialog
          open
          kind={verified.kind === 'rcs' ? 'rcs' : 'email'}
          value={destination}
          sending={draft.testing}
          onValue={setDestination}
          onCancel={() => setOpen(false)}
          onSend={() => void send()}
        />
      ) : null}
    </Field>
  )
}

export function RepaymentMessagesCard({
  url,
  stored,
  mark,
  children,
  onDrafts,
  onTouch
}: {
  url: string
  stored: string | null
  mark?: string
  children: ReactNode
  onDrafts: (texts: string[]) => void
  onTouch: () => void
}) {
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [dirty, setDirty] = useState(false)
  const [seen, setSeen] = useState<string | null | undefined>(undefined)
  const storedTexts = readStored(stored)

  if (!dirty && seen !== stored) {
    setSeen(stored)
    setDrafts(storedTexts.map((text) => ({ ...blank(), text })))
  }

  useEffect(() => {
    onDrafts(drafts.map((draft) => draft.text).filter((text) => text.trim()))
  }, [drafts, onDrafts])

  function touch(next: Draft[]) {
    setDirty(true)
    setDrafts(next)
    onTouch()
  }

  function edit(key: string, text: string) {
    touch(
      drafts.map((draft) =>
        draft.key === key ? { ...draft, text, verified: null, error: '' } : draft
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

  async function test(key: string, destinataire: string): Promise<boolean> {
    const current = drafts.find((draft) => draft.key === key)
    const verified = current?.verified
    const message = verified && current.text === verified.text ? verified.message : null
    if (!message) return false
    setDrafts((items) =>
      items.map((draft) => (draft.key === key ? { ...draft, testing: true } : draft))
    )
    const envelope = {
      url,
      idempotencyKey: crypto.randomUUID(),
      contexte: 'repayment' as const,
      ref: `test-${crypto.randomUUID()}`,
      destinataire
    }
    const response =
      message.kind === 'rcs'
        ? await window.api?.sendCommunication?.({
            ...envelope,
            channel: 'rcs',
            contenu: resolveRepaymentRcs(message, FICTIVE_TENANT)
          })
        : await window.api?.sendCommunication?.({
            ...envelope,
            channel: 'email',
            contenu: resolvedEmail(message)
          })
    setDrafts((items) =>
      items.map((draft) => (draft.key === key ? { ...draft, testing: false } : draft))
    )
    if (!response || 'error' in response) {
      toast.add({ title: response?.error.message ?? 'Envoi impossible', type: 'error' })
      return false
    }
    toast.add({ title: 'Message de test envoyé', type: 'success' })
    return true
  }

  return (
    <section aria-labelledby="setup-configuration">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle id="setup-configuration">Configuration</CardTitle>
            {mark ? (
              <CircleCheck aria-label={mark} className="size-4 shrink-0" strokeWidth={1.5} />
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            {children}
            <FieldSet>
              <FieldLegend>Messages</FieldLegend>
              <FieldDescription>
                Un JSON est un RCS. Un Markdown est un courriel : locataire pour Pierre, caf pour le
                client mail. Vérifier contrôle le texte sans l’enregistrer.
              </FieldDescription>
              {drafts.length > 0 ? (
                <FieldGroup variant="rows">
                  {drafts.map((draft, position) => (
                    <MessageZone
                      key={draft.key}
                      draft={draft}
                      saved={storedTexts[position] === draft.text}
                      onText={(text) => edit(draft.key, text)}
                      onVerify={() => void verify(draft.key, draft.text)}
                      onRemove={() => touch(drafts.filter((item) => item.key !== draft.key))}
                      onTest={(destinataire) => test(draft.key, destinataire)}
                    />
                  ))}
                </FieldGroup>
              ) : null}
            </FieldSet>
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
