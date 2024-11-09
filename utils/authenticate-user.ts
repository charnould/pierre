import crypto from 'node:crypto'
import type { Context, Next } from 'hono'
import { getSignedCookie } from 'hono/cookie'

export const authenticate = async (c: Context, next: Next) => {
  // Attempt to retrieve a signed cookie for authentication.
  // Redirect to the login page if the cookie is missing or invalid.
  // If present, decrypt and parse the cookie to extract user data,
  // then store the user data in the context for subsequent requests.
  const cookie = await getSignedCookie(c, Bun.env.AUTH_SECRET as string, 'pierre-ia')
  if (!cookie) return c.redirect('/a/login')
  const decrypted = decrypt(cookie, Bun.env.AUTH_SECRET as string)
  const user = JSON.parse(decrypted)
  c.set('user', user)

  // Verify if the user has access to protected pages
  if (user.role === 'collaborator') {
    if (
      c.req.path === '/a/conversations' ||
      c.req.path === '/a/encyclopedia' ||
      c.req.path === '/a/statistics' ||
      c.req.path === '/a/users' ||
      c.req.path === '/a'
    ) {
      return c.redirect('/a/login')
    }
  }

  if (user.role === 'contributor') {
    if (
      c.req.path === '/a/conversations' ||
      c.req.path === '/a/statistics' ||
      c.req.path === '/a/users'
    ) {
      return c.redirect('/a')
    }
  }

  await next()
}

//
// Encrypt a string using AES-256-CBC encryption.
//
// This function generates a random initialization vector (IV) and uses it to
// encrypt the input text with the provided secret key. The resulting encrypted
// string is returned in the format "IV:encryptedText" for later decryption.
//
export const encrypt = (text: string, secret_key: string) => {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(secret_key), iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return `${iv.toString('hex')}:${encrypted}`
}

//
// Decrypt a string encrypted with AES-256-CBC.
//
// This function takes an encrypted string in the format "IV:encryptedText"
// and uses the provided secret key to decrypt it. The initialization vector (IV)
// is extracted from the encrypted string, and both the IV and key are used to
// restore the original plaintext.
//
export const decrypt = (encrypted_text: string, secret_key: string) => {
  const [ivHex, encryptedDataHex] = encrypted_text.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const encrypted_data = Buffer.from(encryptedDataHex, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(secret_key), iv)
  let decrypted = decipher.update(encrypted_data, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}
