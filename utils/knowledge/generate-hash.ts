/**
 * Generates a hash for the given string using the SHA-256 algorithm.
 * The resulting hash is encoded in base64url format, with certain characters
 * removed and truncated to 20 characters.
 *
 * @param string - The input string to be hashed.
 * @returns A 20-character truncated base64url encoded hash of the input string.
 *
 * This function is tested in tests/unit/utils/generate-hash.test.ts
 *
 */
export const generate_hash = (string: string) => {
  const hasher = new Bun.CryptoHasher('sha256')
  return hasher.update(string).digest('base64url').replace(/[-_]/g, '').slice(0, 20)
}
