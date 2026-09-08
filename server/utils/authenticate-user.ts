import type { Context, Next } from 'hono'
import { bearerAuth } from 'hono/bearer-auth'
import { getSignedCookie } from 'hono/cookie'

import { COMMUNICATION_TYPES } from '../../shared/activites'
import { get_user } from '../utils/handle-user'
import type { Config, Parsed_User } from './_schema'
import { ChatbotConfigError, loadChatbotConfig } from './chatbot-config'

//
//
//
// Authenticate middleware
//
export const authenticate = async (c: Context, next: Next) => {
  // If the request comes from a cURL/CLI client (authorization-context = 'cli')
  // targeting the /a/knowledge endpoint, enforce Bearer auth.
  // This allows programmatic uploads without using the web interface.
  if (c.req.header('authorization-context') === 'cli' && c.req.path === '/a/knowledge') {
    return await bearerAuth({
      token: Bun.env['AUTH_BEARER']!
    })(c, next)
  }

  // Validate if a signed cookie is present and decrypt it to retrieve user date
  // and check if user (still) exists in `users` table
  let can_access_protected_context = false

  let user: Parsed_User | null = null // TODO modifiy to undefined

  const cookie = await getSignedCookie(c, Bun.env['AUTH_SECRET'] as string, 'pierre-ia')

  if (cookie) {
    let email: string | null = null
    try {
      const cookie_user = JSON.parse(
        await decrypt(cookie, Bun.env['AUTH_SECRET'] as string)
      ) as Partial<Parsed_User>
      if (typeof cookie_user.email === 'string' && cookie_user.email.trim()) {
        email = cookie_user.email
      }
    } catch {
      // Invalid or stale encrypted session: treat it as unauthenticated.
    }
    if (email) {
      const db_user = await get_user(email)
      if (db_user) {
        user = db_user
        can_access_protected_context = true
      }
    }
  }

  const requestedConfig = c.req.query('config')
  let config: Config | null = null
  let configError: ChatbotConfigError | null = null
  if (requestedConfig === undefined) {
    config = await loadChatbotConfig('default')
  } else {
    try {
      config = await loadChatbotConfig(requestedConfig)
    } catch (error) {
      if (error instanceof ChatbotConfigError) configError = error
      else throw error
    }
  }

  // Determine if the requested `context` is protected (i.e., accessible only by
  // authenticated users). The `auth` property in the config determines if
  // authentication is required for the context
  const is_protected = config?.protected ?? false

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
  if (c.req.path === '/c' || c.req.path.startsWith('/c/')) {
    c.set('user', user)

    if (requestedConfig === undefined) {
      return c.redirect(`/c?config=default&data=${data_query}`)
    }

    if (!config || configError) {
      return c.html('<p>Configuration introuvable.</p>', 404)
    }

    if (user !== null && is_protected && !user.config.includes(config.id)) {
      return c.html('<p>Accès refusé.</p>', 403)
    }

    if (c.req.query('data') === undefined || c.req.query('data') === 'undefined') {
      return c.redirect(`/c?config=${config.id}&data=${data_query}`)
    }

    if (is_protected === false) {
      return await next()
    }

    if (is_protected === true && can_access_protected_context === false) {
      const redirection = `c/?config=${config.id}&data=${data_query}`
      return c.redirect(`/a/login?redirection=${encodeURIComponent(redirection)}`)
    }

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
  // Case B2: Desktop request
  // Desktop-only API routes require an authenticated session cookie.
  //
  if (c.req.path.startsWith('/desktop/')) {
    if (user === null) {
      return c.json({ error: { code: 'unauthorized', message: 'Authentication required' } }, 401)
    }
    c.set('user', user)
    return await next()
  }

  //
  //
  // Case B3: Outbound communication (desktop + traitements de masse)
  // Same session cookie as /desktop/. JSON 401 — never a chatbot HTML redirect.
  //
  if (
    c.req.path === '/communications/external' ||
    COMMUNICATION_TYPES.some((type) => c.req.path === `/${type}`)
  ) {
    if (user === null) {
      return c.json({ error: { code: 'unauthorized', message: 'Authentication required' } }, 401)
    }
    c.set('user', user)
    return await next()
  }

  //
  //
  // Case C: Admin request
  // This block handles requests where the path starts with '/a/',
  // indicating that the request is intended for admin routes.
  //
  if (c.req.path === '/a' || c.req.path.startsWith('/a/')) {
    // If the `user` variable is `undefined`,
    // redirect the client to the login page.
    if (user === null) return c.redirect('/a/login')

    // Check if the user is a 'collaborator'
    // Redirect to login if the user tries to access restricted admin pages
    if (user.role === 'collaborator') {
      if (
        c.req.path.startsWith('/a/conversations') ||
        c.req.path.startsWith('/a/statistics') ||
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
        c.req.path.startsWith('/a/statistics') ||
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
// Encrypt a string using AES-256-GCM encryption.
//
// This function generates a random initialization vector (IV) and uses it to
// encrypt the input text with the provided secret key. The resulting encrypted
// string is returned in the format "IV:ciphertextTag" for later decryption.
//
const is_ascii_key = (value: string): boolean =>
  value.length === 32 && [...value].every((character) => character.charCodeAt(0) <= 0x7f)

export const encrypt = async (text: string, secret_key: string): Promise<string> => {
  if (!is_ascii_key(secret_key)) {
    throw new Error('AUTH_SECRET must be 32 ASCII characters')
  }
  const encoder = new TextEncoder()
  const key_bytes = encoder.encode(secret_key)
  const key = await crypto.subtle.importKey('raw', key_bytes, 'AES-GCM', false, ['encrypt'])
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext_tag = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(text))
  )
  return `${iv.toHex()}:${ciphertext_tag.toHex()}`
}

//
//
//
// Decrypt a string encrypted with AES-256-GCM.
//
// This function takes an encrypted string in the format "IV:ciphertextTag" and
// uses the provided secret key to decrypt it. The initialization vector (IV) is
// extracted from the encrypted string, and both the IV and key are used to
// restore the original plaintext.
//
export const decrypt = async (encrypted_text: string, secret_key: string): Promise<string> => {
  const parts = encrypted_text.split(':')
  if (parts.length !== 2 || !parts[0] || !parts[1]) throw new Error('Invalid encrypted value')
  const iv = Uint8Array.fromHex(parts[0])
  const ciphertext_tag = Uint8Array.fromHex(parts[1])
  if (iv.byteLength !== 12 || ciphertext_tag.byteLength < 16) {
    throw new Error('Invalid encrypted value')
  }
  if (!is_ascii_key(secret_key)) {
    throw new Error('AUTH_SECRET must be 32 ASCII characters')
  }
  const key_bytes = new TextEncoder().encode(secret_key)
  const key = await crypto.subtle.importKey('raw', key_bytes, 'AES-GCM', false, ['decrypt'])
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext_tag)
  return new TextDecoder().decode(plaintext)
}
