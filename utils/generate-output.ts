import { InferenceClient } from '@huggingface/inference'

const client = new InferenceClient(process.env.HUGGINGFACE_TOKEN)

/**
 * Generates text by sending a chat completion request to the specified provider and model.
 *
 * @param messages - The array of message objects to send to the chat completion API.
 * @param max_tokens - The maximum number of tokens to generate in the response.
 * @returns A promise that resolves to the generated text content as a string.
 * @throws Will throw an error if the chat completion request fails.
 */
export const generate_text = async ({
  messages,
  max_tokens
}: {
  messages: any
  max_tokens: number | undefined
}): Promise<string> => {
  try {
    const text = await client.chatCompletion({
      provider: 'cerebras',
      model: 'Qwen/Qwen3-32B',
      messages: messages,
      max_tokens: max_tokens
    })

    return text.choices[0].message.content ?? ''
  } catch (err) {
    console.error(err)
    throw err
  }
}
