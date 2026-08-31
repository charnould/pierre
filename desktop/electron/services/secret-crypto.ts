import { safeStorage } from 'electron'

import { logMainError } from './logging'
import type { SecretCrypto } from './settings-store'

let warnedUnavailable = false

/**
 * The real OS keychain (Keychain, DPAPI, libsecret/kwallet) behind the store's
 * `SecretCrypto` boundary. Kept in its own module because importing `safeStorage`
 * is only safe from code an Electron runtime loads.
 *
 * `isEncryptionAvailable()` is false before `app.ready` and on Linux desktops
 * with no keyring, so it is checked per call rather than cached at import time.
 */
export const safeStorageCrypto: SecretCrypto = {
  encrypt: (value) => {
    try {
      if (!safeStorage.isEncryptionAvailable()) {
        if (!warnedUnavailable) {
          warnedUnavailable = true
          logMainError('secret-crypto', new Error('OS keychain unavailable; credential not stored'))
        }
        return null
      }
      return safeStorage.encryptString(value).toString('base64')
    } catch (error) {
      logMainError('secret-crypto.encrypt', error)
      return null
    }
  },

  decrypt: (value) => {
    try {
      if (!safeStorage.isEncryptionAvailable()) return null
      return safeStorage.decryptString(Buffer.from(value, 'base64'))
    } catch (error) {
      logMainError('secret-crypto.decrypt', error)
      return null
    }
  }
}
