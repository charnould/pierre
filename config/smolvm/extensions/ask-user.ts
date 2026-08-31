import { Type } from 'typebox'

const ASK_USER_MARKER = 'pierre:ask_user:'

type Question = {
  question: string
  choices: [string, string, string]
}

type Answer = {
  question: string
  answer: string
}

function parseAnswers(value: string | undefined, questions: Question[]): Answer[] | null {
  if (!value) return null

  try {
    const answers = JSON.parse(value) as unknown
    if (!Array.isArray(answers) || answers.length !== questions.length) return null

    const parsed = answers.map((answer, index) => {
      if (
        typeof answer !== 'object' ||
        answer === null ||
        typeof (answer as Record<string, unknown>)['question'] !== 'string' ||
        typeof (answer as Record<string, unknown>)['answer'] !== 'string' ||
        (answer as Record<string, unknown>)['question'] !== questions[index]?.question
      ) {
        return null
      }
      return answer as Answer
    })

    return parsed.every((answer): answer is Answer => answer !== null) ? parsed : null
  } catch {
    return null
  }
}

export default function askUserExtension(pi: {
  registerTool: (tool: Record<string, unknown>) => void
}) {
  pi.registerTool({
    name: 'ask_user',
    label: 'Ask user',
    description:
      'Ask the user clarifying questions when their request is ambiguous. Provide one or more questions, each with exactly 3 short, distinct answer choices. The user can also answer in their own words.',
    executionMode: 'sequential',
    parameters: Type.Object(
      {
        questions: Type.Array(
          Type.Object(
            {
              question: Type.String({ minLength: 1 }),
              choices: Type.Array(Type.String({ minLength: 1, maxLength: 80 }), {
                minItems: 3,
                maxItems: 3
              })
            },
            { additionalProperties: false }
          ),
          { minItems: 1 }
        )
      },
      { additionalProperties: false }
    ),
    async execute(
      toolCallId: string,
      params: { questions: Question[] },
      signal: AbortSignal | undefined,
      _onUpdate: unknown,
      ctx: {
        ui: {
          input: (
            title: string,
            placeholder?: string,
            options?: { signal?: AbortSignal }
          ) => Promise<string | undefined>
        }
      }
    ) {
      const value = await ctx.ui.input(
        `${ASK_USER_MARKER}${JSON.stringify({ toolCallId })}`,
        'JSON answers',
        { signal }
      )
      const answers = parseAnswers(value, params.questions)

      if (!answers) {
        return {
          content: [{ type: 'text', text: 'The user did not provide valid answers.' }],
          details: { answers: [] }
        }
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(answers) }],
        details: { answers }
      }
    }
  })
}
