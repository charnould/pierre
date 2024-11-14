import { expect, it } from 'bun:test'
import { decrypt, encrypt } from '../../../utils/authenticate-user'

it('should cipher/decipher a string', async () => {
  const secret_key = '34b1c47a554c911b7b8701cd152c681c'
  const original_text = 'Hello, world!'

  const encrypted = encrypt(original_text, secret_key)
  const decrypted = decrypt(encrypted, secret_key)

  expect(decrypted as string).toBe(original_text)
})
