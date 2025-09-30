import { expect, test } from 'bun:test'
import { AIContext } from '../../../utils/_schema'

const config = (await import(`../../../assets/default/config`)).default

test('should AIContext parse correctly', async () => {
  expect(
    await AIContext.parseAsync({
      role: 'user',
      conv_id: '22222',
      config: config,
      content: 'bonjour',
      custom_data: { raw: ['Julie', '456.56'] }
    })
  ).toMatchSnapshot()
})
