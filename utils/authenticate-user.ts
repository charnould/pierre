import crypto from 'node:crypto'
import { randomUUIDv7 } from 'bun'
import type { Context, Next } from 'hono'
import { getSignedCookie } from 'hono/cookie'
import { z } from 'zod'
import { get_user } from '../utils/handle-user'
import type { Config, User } from './_schema'

//
//
//
// Authenticate middleware
//
export const authenticate = async (c: Context, next: Next) => {
  // Check if a valid `config` query is provided in the request
  // If provided, attempt to load the corresponding config from the `assets` folder
  // If the query is invalid or missing, fall back to the `default` config
  let has_valid_config_query = false
  const config: Config = await (async () => {
    if (c.req.query('config') === undefined) {
      has_valid_config_query = false
      return (await import('../assets/pierre-ia.org/config')).default
    }
    try {
      has_valid_config_query = true
      return (await import(`../assets/${c.req.query('config')}/config`)).default
    } catch {
      has_valid_config_query = false
      return (await import('../assets/pierre-ia.org/config')).default
    }
  })()

  // Validate if the `id` parameter in the request is a valid UUID
  // The `uuid()` method checks the format of the `id` parameter
  const has_valid_uuid = z.string().uuid().safeParse(c.req.param('id')).success

  // Retrieve the `context` query parameter from the request, defaulting to 'default' if not specified
  // Validate if the `context_query` exists in the config; if not, fall back to 'default'
  let context_query = c.req.query('context') ?? 'default'
  const has_valid_context_query = Boolean(config.context[context_query])
  if (!has_valid_context_query) context_query = 'default'

  // Determine if the requested `context` is protected (i.e., accessible only by authenticated users)
  // The `auth` property in the config determines if authentication is required for the context
  const is_protected_context = config.context[context_query as string].protected ?? false

  // Validate if a signed cookie is present and decrypt it to retrieve user data
  // Check if user (still) exists in `users` table
  let can_access_protected_context = false
  let user: User | undefined = undefined
  const cookie = await getSignedCookie(c, Bun.env.AUTH_SECRET as string, 'pierre-ia')
  if (cookie) {
    user = JSON.parse(decrypt(cookie, Bun.env.AUTH_SECRET as string)) as User
    const user_exists = get_user(user.email) !== undefined
    if (user_exists) can_access_protected_context = true
    else user = undefined
  }

  //
  //
  // Case A: Chatbot request
  // This block handles requests where the path starts with '/c/',
  // indicating that the request is intended for the chatbot.
  //
  if (c.req.path.startsWith('/c/')) {
    // Case 1: Invalid UUID
    // If the UUID is invalid, generate a new UUID and redirect
    if (has_valid_uuid === false) {
      return c.redirect(`/c/${randomUUIDv7()}?config=${config.id}&context=${context_query}`)
    }

    // Case 2: Invalid config query
    // If the config query is invalid, redirect with a valid UUID
    if (has_valid_config_query === false) {
      return c.redirect(`/c/${randomUUIDv7()}?config=${config.id}&context=${context_query}`)
    }

    // Case 3: Invalid context query
    // If the context query is invalid, redirect with a valid UUID
    if (has_valid_context_query === false) {
      return c.redirect(`/c/${randomUUIDv7()}?config=${config.id}&context=${context_query}`)
    }

    // Case 4: Context not protected
    // If the context is not protected, proceed to the next middleware
    if (is_protected_context === false) {
      return await next()
    }
  }

  // Case 5: No access to protected context
  // If the context is protected but the user does not have access, redirect to the login page
  if (is_protected_context === true && can_access_protected_context === false) {
    const redirection = `c/?config=${config.id}&context=${context_query}`
    return c.redirect(`/a/login?redirection=${encodeURIComponent(redirection)}`)
  }

  // Case 6: Access to protected context granted
  // If the context is protected and the user has access, proceed to the next middleware
  if (is_protected_context === true && can_access_protected_context === true) {
    return await next()
  }

  //
  //
  // Case B: Admin request
  // This block handles requests where the path starts with '/a/',
  // indicating that the request is intended for admin routes.
  //
  if (c.req.path.startsWith('/a')) {
    // If the `user` variable is `undefined`,
    // redirect the client to the login page.
    if (user === undefined) return c.redirect('/a/login')

    // Check if the user is a 'collaborator'
    // Redirect to login if the user tries to access restricted admin pages
    if (user.role === 'collaborator') {
      if (
        c.req.path.startsWith('/a/conversations') ||
        c.req.path.startsWith('/a/performance') ||
        c.req.path.startsWith('/a/users') ||
        c.req.path.startsWith('/a')
      ) {
        return c.redirect('/a/login')
      }
    }

    // Check if the user is a 'contributor'
    // Redirect to the home page if the user tries to access restricted admin pages
    if (user.role === 'contributor') {
      if (
        c.req.path.startsWith('/a/conversations') ||
        c.req.path.startsWith('/a/performance') ||
        c.req.path.startsWith('/a/users')
      ) {
        return c.redirect('/a')
      }
    }

    // If user isn't either a collaborator or a contributor:
    // Set the 'user' in the response headers for further use
    // Proceed to the next middleware or handler
    c.set('user', user)
    return await next()
  }
}

//
//
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
//
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
