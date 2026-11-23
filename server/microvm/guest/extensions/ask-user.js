import { Type } from '@earendil-works/pi-ai'

const ASK_USER_MARKER = 'pierre:ask_user:'

function parseAnswers(value, questions) {
  if (!value) return null

  try {
    const answers = JSON.parse(value)
    if (!Array.isArray(answers) || answers.length !== questions.length) return null

    const parsed = answers.map((answer, index) => {
      if (
        typeof answer !== 'object' ||
        answer === null ||
        typeof answer.question !== 'string' ||
        typeof answer.answer !== 'string' ||
        answer.question !== questions[index]?.question
      ) {
        return null
      }
      return answer
    })

    return parsed.every((answer) => answer !== null) ? parsed : null
  } catch {
    return null
  }
}

export default function askUserExtension(pi) {
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
    async execute(toolCallId, params, signal, _onUpdate, ctx) {
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
