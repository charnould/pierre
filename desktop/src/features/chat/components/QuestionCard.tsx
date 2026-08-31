import { useState } from 'react'

import type { PendingQuestionnaire } from '@/features/chat/lib/chat-session-types'
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoices,
  QuestionnaireError,
  QuestionnaireInput,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireProgress,
  QuestionnaireSubmit,
  QuestionnaireTitle
} from '@/shared/components/ui/questionnaire'

export function QuestionCard({
  pending,
  error,
  onAnswer
}: {
  pending: PendingQuestionnaire
  error?: string | null
  onAnswer: (answers: Array<{ question: string; answer: string }>) => Promise<boolean>
}) {
  const [submitting, setSubmitting] = useState(false)

  return (
    <div className="border-border bg-popover text-popover-foreground w-full rounded-2xl border p-4 text-sm shadow-sm">
      <Questionnaire
        key={pending.toolCallId}
        defaultItem="q0"
        items={pending.questions.map((question, index) => ({
          choices: question.choices.map((choice) => ({ value: choice })),
          name: `q${index}`,
          required: true
        }))}
        onSubmit={(event) => {
          event.preventDefault()
          if (submitting) return
          const formData = new FormData(event.currentTarget)
          const answers = pending.questions.map((question, index) => ({
            question: question.question,
            answer: String(formData.get(`q${index}`) ?? '')
          }))
          setSubmitting(true)
          void onAnswer(answers).finally(() => setSubmitting(false))
        }}
      >
        {pending.questions.length > 1 ? <QuestionnaireProgress className="-mb-4" /> : null}
        {pending.questions.map((question, index) => (
          <QuestionnaireItem key={index} name={`q${index}`} required>
            <QuestionnaireTitle>{question.question}</QuestionnaireTitle>
            <QuestionnaireChoices>
              {question.choices.map((choice) => (
                <QuestionnaireChoice key={choice} value={choice}>
                  {choice}
                </QuestionnaireChoice>
              ))}
              <QuestionnaireInput
                aria-label="Autre réponse"
                placeholder="Saisissez une autre réponse…"
                disabled={submitting}
              />
            </QuestionnaireChoices>
            <QuestionnaireError />
          </QuestionnaireItem>
        ))}
        {error ? (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        ) : null}
        <QuestionnaireActions>
          <QuestionnairePrevious disabled={submitting}>Précédent</QuestionnairePrevious>
          <QuestionnaireNext disabled={submitting}>Suivant</QuestionnaireNext>
          <QuestionnaireSubmit disabled={submitting}>
            {submitting ? 'Envoi…' : 'Répondre'}
          </QuestionnaireSubmit>
        </QuestionnaireActions>
      </Questionnaire>
    </div>
  )
}
