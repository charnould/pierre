import { expect, test } from 'bun:test'

import type { AIContext } from '../../../utils/_schema'
import { modelPrompt } from '../../../utils/stream-chat'

test('prefixes transformed custom data onto the model prompt only', () => {
  const context = {
    content: 'Quel est mon solde ?',
    custom_data: { raw: ['Luc', '-7.12'], transformed: 'Luc a une solde locataire de -7.12 euros' }
  } as AIContext

  expect(modelPrompt(context)).toBe(
    'Luc a une solde locataire de -7.12 euros\n\nQuel est mon solde ?'
  )
  expect(context.content).toBe('Quel est mon solde ?')
})

test('leaves the prompt unchanged when there is no custom data', () => {
  const context = {
    content: 'Bonjour',
    custom_data: { raw: [''], transformed: '' }
  } as AIContext

  expect(modelPrompt(context)).toBe('Bonjour')
})
