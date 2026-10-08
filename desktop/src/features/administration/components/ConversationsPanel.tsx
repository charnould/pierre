import { ArrowLeft, CircleAlert, MessagesSquare } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { GeneratedMarkdown } from '@/shared/components/AgentWorkTrace'
import { DirectoryList, DirectoryRow } from '@/shared/components/DirectoryList'
import { SelectItems, type SelectOption } from '@/shared/components/SelectItems'
import { Bubble, BubbleContent } from '@/shared/components/ui/bubble'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Checkbox } from '@/shared/components/ui/checkbox'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/shared/components/ui/empty'
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel
} from '@/shared/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/shared/components/ui/input-group'
import { Message, MessageContent } from '@/shared/components/ui/message'
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Spinner } from '@/shared/components/ui/spinner'
import { Textarea } from '@/shared/components/ui/textarea'
import { toast } from '@/shared/components/ui/toast'
import { formatInspectorTimelineDateline } from '@/shared/lib/timeline/activity-notification-date'
import {
  type ConversationDetail,
  type ConversationSummary,
  REVIEW_CATEGORIES,
  REVIEW_CATEGORY_LABELS,
  REVIEW_STATUS_LABELS,
  REVIEW_STATUSES,
  type ReviewCategory,
  type ReviewStatus
} from '@/shared/types/admin-insights'

const statuses: SelectOption[] = [
  { value: 'all', label: 'Toutes les revues' },
  { value: 'unreviewed', label: REVIEW_STATUS_LABELS.unreviewed },
  ...REVIEW_STATUSES.map((status) => ({ value: status, label: REVIEW_STATUS_LABELS[status] }))
]
const audiences: SelectOption[] = [
  { value: 'all', label: 'Tous les publics' },
  { value: 'collaborator', label: 'Collaborateurs' },
  { value: 'public', label: 'Public' }
]
const scores: SelectOption[] = [
  { value: 'none', label: 'Sans note' },
  ...[1, 2, 3, 4, 5].map((score) => ({ value: String(score), label: String(score) }))
]

function message(response: { error?: { message: string } } | null) {
  if (!response) return 'Impossible de joindre le serveur.'
  return response.error?.message ?? ''
}

function ConversationList({
  url,
  onBack,
  onOpen
}: {
  url: string
  onBack: () => void
  onOpen: (convId: string) => void
}) {
  const [q, setQ] = useState('')
  const [reviewStatus, setReviewStatus] = useState('all')
  const [audience, setAudience] = useState('all')
  const [chatbot, setChatbot] = useState('all')
  const [chatbots, setChatbots] = useState<string[]>([])
  const [items, setItems] = useState<ConversationSummary[] | null>(null)
  const [total, setTotal] = useState(0)
  const [error, setError] = useState('')
  const [loadingMore, setLoadingMore] = useState(false)

  const load = useCallback(
    async (offset: number) => {
      const response = await window.api?.getAdminConversations({
        url,
        q,
        reviewStatus:
          reviewStatus === 'all' ? undefined : (reviewStatus as ReviewStatus | 'unreviewed'),
        audience: audience === 'all' ? undefined : (audience as 'public' | 'collaborator'),
        chatbot: chatbot === 'all' ? undefined : chatbot,
        offset
      })
      const failure = message(response && 'error' in response ? response : response ? null : null)
      if (!response || 'error' in response) {
        setError(failure || 'Impossible de joindre le serveur.')
        return null
      }
      setError('')
      setTotal(response.data.total)
      setChatbots(response.data.chatbots)
      return response.data.conversations
    },
    [audience, chatbot, q, reviewStatus, url]
  )

  useEffect(() => {
    let active = true
    const timer = setTimeout(() => {
      void load(0).then((conversations) => {
        if (active && conversations) setItems(conversations)
      })
    }, 250)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [load])

  const chatbotOptions: SelectOption[] = [
    { value: 'all', label: 'Tous les assistants' },
    ...chatbots.map((id) => ({ value: id, label: id }))
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <header className="border-border bg-background flex shrink-0 items-center gap-2 border-b px-4 py-2">
        <Button type="button" variant="outline" size="icon-sm" aria-label="Retour" onClick={onBack}>
          <ArrowLeft />
        </Button>
        <div className="flex min-w-0 flex-1 items-baseline gap-2">
          <CardTitle className="m-0">Conversations</CardTitle>
          <span className="text-muted-foreground text-sm leading-5">·</span>
          <span className="text-muted-foreground text-sm leading-5 tabular-nums">{total}</span>
        </div>
        <InputGroup className="w-56">
          <InputGroupAddon>Recherche</InputGroupAddon>
          <InputGroupInput
            aria-label="Rechercher une conversation"
            value={q}
            onChange={(event) => setQ(event.target.value)}
          />
        </InputGroup>
        <Select
          value={reviewStatus}
          items={statuses}
          onValueChange={(value) => setReviewStatus(String(value))}
        >
          <SelectTrigger size="sm" aria-label="Statut de revue">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItems items={statuses} />
          </SelectContent>
        </Select>
        <Select
          value={audience}
          items={audiences}
          onValueChange={(value) => setAudience(String(value))}
        >
          <SelectTrigger size="sm" aria-label="Public">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItems items={audiences} />
          </SelectContent>
        </Select>
        <Select
          value={chatbot}
          items={chatbotOptions}
          onValueChange={(value) => setChatbot(String(value))}
        >
          <SelectTrigger size="sm" aria-label="Assistant">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItems items={chatbotOptions} />
          </SelectContent>
        </Select>
      </header>
      {error ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CircleAlert />
            </EmptyMedia>
            <EmptyTitle>Conversations indisponibles</EmptyTitle>
            <EmptyDescription>{error}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button
              type="button"
              variant="outline"
              onClick={() => void load(0).then((rows) => rows && setItems(rows))}
            >
              Réessayer
            </Button>
          </EmptyContent>
        </Empty>
      ) : !items ? (
        <div className="flex h-48 items-center justify-center">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MessagesSquare />
            </EmptyMedia>
            <EmptyTitle>Aucune conversation</EmptyTitle>
            <EmptyDescription>
              Aucune conversation ne correspond à cette recherche.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <DirectoryList>
            {items.map((item) => (
              <DirectoryRow key={item.convId} onSelect={() => onOpen(item.convId)}>
                <div className="min-w-0">
                  <div className="truncate text-sm leading-5 font-medium">
                    {item.preview || 'Sans question'}
                  </div>
                  <FieldDescription>{item.userEmail ?? 'Public'}</FieldDescription>
                </div>
                <div className="text-muted-foreground truncate text-start text-xs">
                  {item.configId}
                </div>
                <div className="text-start text-xs tabular-nums">
                  {formatInspectorTimelineDateline(item.updatedAt)}
                </div>
                <div className="text-start text-xs">
                  {REVIEW_STATUS_LABELS[item.reviewStatus ?? 'unreviewed']}
                  {item.reviewScore ? ` · ${item.reviewScore}` : ''}
                </div>
              </DirectoryRow>
            ))}
          </DirectoryList>
          {items.length < total ? (
            <div className="px-4 py-4">
              <Button
                type="button"
                variant="outline"
                disabled={loadingMore}
                onClick={() => {
                  setLoadingMore(true)
                  void load(items.length).then((rows) => {
                    if (rows) setItems((current) => [...(current ?? []), ...rows])
                    setLoadingMore(false)
                  })
                }}
              >
                Afficher la suite
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

function Qualification({
  url,
  conversation,
  onChange
}: {
  url: string
  conversation: ConversationDetail
  onChange: (conversation: ConversationDetail) => void
}) {
  const review = conversation.review
  const [status, setStatus] = useState<ReviewStatus>(review?.status ?? 'reviewed')
  const [score, setScore] = useState(review?.score ? String(review.score) : 'none')
  const [categories, setCategories] = useState<ReviewCategory[]>(review?.categories ?? [])
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState('')
  const statusOptions: SelectOption[] = REVIEW_STATUSES.map((item) => ({
    value: item,
    label: REVIEW_STATUS_LABELS[item]
  }))

  async function save() {
    setSaving(true)
    setSaved('')
    const response = await window.api?.saveAdminConversationReview({
      url,
      convId: conversation.convId,
      expectedUpdatedAt: review?.updatedAt ?? null,
      status,
      score: score === 'none' ? null : Number(score),
      categories,
      comment
    })
    setSaving(false)
    if (!response) {
      toast.add({ title: 'Impossible de joindre le serveur.', type: 'error' })
      return
    }
    if ('error' in response) {
      toast.add({ title: response.error.message, type: 'error' })
      if (response.error.code === 'review_conflict') {
        const fresh = await window.api?.getAdminConversation({ url, convId: conversation.convId })
        if (fresh && !('error' in fresh)) onChange(fresh.data)
      }
      return
    }
    onChange(response.data)
    setSaved('Qualification enregistrée.')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Qualification</CardTitle>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel>Statut</FieldLabel>
              <FieldDescription>
                Revue si l’échange est clos. Action requise s’il faut corriger une connaissance ou
                une consigne. Résolue quand la correction est faite.
              </FieldDescription>
            </FieldContent>
            <Select
              value={status}
              items={statusOptions}
              onValueChange={(value) => setStatus(value as ReviewStatus)}
            >
              <SelectTrigger aria-label="Statut">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItems items={statusOptions} />
              </SelectContent>
            </Select>
          </Field>
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel>Appréciation</FieldLabel>
              <FieldDescription>
                1 pour un échange mal abouti, 5 pour un échange clair et utile. Sans note si vous ne
                le jugez pas.
              </FieldDescription>
            </FieldContent>
            <Select value={score} items={scores} onValueChange={(value) => setScore(String(value))}>
              <SelectTrigger aria-label="Appréciation">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItems items={scores} />
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Catégories</FieldLabel>
            <FieldDescription>
              Ce qui n’allait pas, pour retrouver ensuite les mêmes défauts.
            </FieldDescription>
            <div className="flex flex-col gap-2">
              {REVIEW_CATEGORIES.map((category) => (
                <Field key={category} orientation="horizontal">
                  <Checkbox
                    checked={categories.includes(category)}
                    onCheckedChange={(checked) =>
                      setCategories((current) =>
                        checked === true
                          ? [...current, category]
                          : current.filter((item) => item !== category)
                      )
                    }
                  />
                  <FieldLabel>{REVIEW_CATEGORY_LABELS[category]}</FieldLabel>
                </Field>
              ))}
            </div>
          </Field>
          <Field>
            <FieldLabel htmlFor="conversation-comment">Commentaire</FieldLabel>
            <FieldDescription>
              Suite à donner, lisible par un autre administrateur.
            </FieldDescription>
            <Textarea
              id="conversation-comment"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
          </Field>
          {review && review.comments.length > 0 ? (
            <ul className="flex flex-col gap-4">
              {review.comments.map((entry) => (
                <li key={entry.id}>
                  <div className="text-muted-foreground text-xs tabular-nums">
                    {entry.author} · {formatInspectorTimelineDateline(entry.createdAt)}
                  </div>
                  <p className="text-sm leading-5 whitespace-pre-wrap">{entry.body}</p>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex items-center gap-4">
            <Button type="button" disabled={saving} onClick={() => void save()}>
              Enregistrer
            </Button>
            <p className="text-muted-foreground text-xs leading-4" aria-live="polite">
              {saved}
            </p>
          </div>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}

export function ConversationsPanel({
  url,
  conversationId,
  onBack,
  onOpen
}: {
  url: string
  conversationId: string | null
  onBack: () => void
  onOpen: (convId: string) => void
}) {
  const [conversation, setConversation] = useState<ConversationDetail | null>(null)
  const [error, setError] = useState<{ id: string; message: string } | null>(null)

  useEffect(() => {
    if (!conversationId) return
    let active = true
    void window.api?.getAdminConversation({ url, convId: conversationId }).then((response) => {
      if (!active) return
      if (!response || 'error' in response) {
        setError({
          id: conversationId,
          message: message(response ?? null) || 'Impossible de joindre le serveur.'
        })
        return
      }
      setError(null)
      setConversation(response.data)
    })
    return () => {
      active = false
    }
  }, [conversationId, url])

  if (!conversationId) return <ConversationList url={url} onBack={onBack} onOpen={onOpen} />
  if (error?.id === conversationId) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CircleAlert />
          </EmptyMedia>
          <EmptyTitle>Conversation indisponible</EmptyTitle>
          <EmptyDescription>{error.message}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Retour"
            onClick={onBack}
          >
            <ArrowLeft />
          </Button>
        </EmptyContent>
      </Empty>
    )
  }
  if (!conversation || conversation.convId !== conversationId) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-3">
        <Button type="button" variant="outline" size="icon-sm" aria-label="Retour" onClick={onBack}>
          <ArrowLeft />
        </Button>
        <Spinner />
      </div>
    )
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto px-4 py-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Retour"
            onClick={onBack}
          >
            <ArrowLeft />
          </Button>
          <h1 className="font-serif text-4xl leading-tight font-normal">Conversation</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Contexte</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2 text-sm">
              {(
                [
                  ['Personne', conversation.userEmail ?? 'Public'],
                  ['Assistant', conversation.configId],
                  ['Début', formatInspectorTimelineDateline(conversation.startedAt)],
                  ['Dernière activité', formatInspectorTimelineDateline(conversation.updatedAt)],
                  ['Messages', String(conversation.messages.length)]
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="flex gap-4">
                  <div className="text-muted-foreground w-40">{label}</div>
                  <div className="tabular-nums">{value}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Qualification
          key={`${conversation.convId}:${conversation.review?.updatedAt ?? 'new'}`}
          url={url}
          conversation={conversation}
          onChange={setConversation}
        />
      </div>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 pb-4">
        {conversation.messages.map((entry) =>
          entry.role === 'user' ? (
            <Message key={entry.id} align="end">
              <MessageContent>
                <Bubble variant="muted" align="end">
                  <BubbleContent>{entry.content}</BubbleContent>
                </Bubble>
              </MessageContent>
            </Message>
          ) : (
            <Message key={entry.id} align="start">
              <MessageContent>
                <GeneratedMarkdown className="typeset-reply">{entry.content}</GeneratedMarkdown>
              </MessageContent>
            </Message>
          )
        )}
      </div>
    </div>
  )
}
