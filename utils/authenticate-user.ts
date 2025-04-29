import crypto from 'node:crypto'
import type { Context, Next } from 'hono'
import { getSignedCookie } from 'hono/cookie'
import { get_user } from '../utils/handle-user'
import type { Config, User } from './_schema'

//
//
//
// Authenticate middleware
//
export const authenticate = async (c: Context, next: Next) => {
  // Check if a valid `config` query is provided in the request. If provided,
  // attempt to load the corresponding config from the `assets` folder. If the
  // query is invalid or missing, fall back to the `default` config
  let has_valid_config_query = false
  const config: Config = await (async () => {
    if (c.req.query('config') === undefined) {
      has_valid_config_query = false
      return (await import('../assets/default/config')).default
    }
    try {
      has_valid_config_query = true
      return (await import(`../assets/${c.req.query('config')}/config`)).default
    } catch {
      has_valid_config_query = false
      return (await import('../assets/default/config')).default
    }
  })()

  // Determine if the requested `context` is protected (i.e., accessible only by
  // authenticated users). The `auth` property in the config determines if
  // authentication is required for the context
  const is_protected = config.protected ?? false

  // Validate if a signed cookie is present and decrypt it to retrieve user date
  // and check if user (still) exists in `users` table
  let can_access_protected_context = false
  let user: User | null = null
  const cookie = await getSignedCookie(c, Bun.env.AUTH_SECRET as string, 'pierre-ia')
  if (cookie) {
    user = JSON.parse(decrypt(cookie, Bun.env.AUTH_SECRET as string)) as User
    const user_exists = get_user(user.email) !== undefined
    if (user_exists) can_access_protected_context = true
    else user = null
  }

  // Retrieve the `data` query parameter from the request,
  // defaulting to '' if not specified.
  // http://localhost:3000/c?config=default
  const data_query =
    c.req.query('data') === 'undefined' || c.req.query('data') === undefined
      ? ''
      : c.req.query('data')

  //
  //
  // Case A: Chatbot request
  // This block handles requests where the path starts with '/c/',
  // indicating that the request is intended for the chatbot.
  //
  if (c.req.path.startsWith('/c')) {
    c.set('user', user)

    // Case 1: Invalid config query
    // If the config query is invalid, redirect
    if (has_valid_config_query === false) {
      return c.redirect(`/c?config=${config.id}&data=${data_query}`)
    }

    // Case 2: Context not protected
    // If the context is not protected, proceed to the next middleware
    if (is_protected === false) {
      return await next()
    }

    // Case 3: No access to protected context
    // If the context is protected but the user does
    // not have access, redirect to the login page
    if (is_protected === true && can_access_protected_context === false) {
      const redirection = `c/?config=${config.id}&data=${data_query}`
      return c.redirect(`/a/login?redirection=${encodeURIComponent(redirection)}`)
    }

    // Case 4: Access to protected context granted
    // If the context is protected and the user has
    // access, proceed to the next middleware
    if (is_protected === true && can_access_protected_context === true) {
      return await next()
    }
  }

  //
  //
  // Case B: AI streaming request
  // This block handles requests where the path starts with '/ai',
  // indicating that the request is intended to be answered by AI.
  // IMPORTANT: Must be above Case `C` to work effectively!
  //
  if (c.req.path.startsWith('/ai')) {
    c.set('user', user)
    return await next()
  }

  //
  //
  // Case C: Admin request
  // This block handles requests where the path starts with '/a/',
  // indicating that the request is intended for admin routes.
  //
  if (c.req.path.startsWith('/a')) {
    // If the `user` variable is `undefined`,
    // redirect the client to the login page.
    if (user === null) return c.redirect('/a/login')

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
    // Redirect to the home page if the user tries
    // to access restricted admin pages
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
// This function takes an encrypted string in the format "IV:encryptedText" and
// uses the provided secret key to decrypt it. The initialization vector (IV) is
// extracted from the encrypted string, and both the IV and key are used to
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
