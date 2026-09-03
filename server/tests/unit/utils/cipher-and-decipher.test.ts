import { expect, it } from 'bun:test'

import { decrypt, encrypt } from '../../../utils/authenticate-user'

it('should cipher/decipher a string', async () => {
  const secret_key = '34b1c47a554c911b7b8701cd152c681c'
  const original_text = 'Hello, world!'

  const encrypted = await encrypt(original_text, secret_key)
  const decrypted = await decrypt(encrypted, secret_key)

  expect(decrypted).toBe(original_text)
  expect(encrypted).toMatch(/^[0-9a-f]{24}:[0-9a-f]+$/)
})

it('rejects tampered AES-256-GCM values', async () => {
  const secret_key = '34b1c47a554c911b7b8701cd152c681c'
  const encrypted = await encrypt('Hello, world!', secret_key)
  const tampered = `${encrypted.slice(0, -1)}${encrypted.endsWith('0') ? '1' : '0'}`

  await expect(decrypt(tampered, secret_key)).rejects.toThrow()
})
