import { expect, test } from 'bun:test'
import { AIContext } from '../../../utils/_schema'

test('should AIContext parse correctly', async () => {
  expect(
    await AIContext.parseAsync({
      role: 'user',
      conv_id: '22222',
      config: 'pierre-ia.org',
      content: 'bonjour',
      current_context: 'en_agence',
      custom_data: { raw: ['Julie', '456.56'] }
    })
  ).toMatchSnapshot()
})
