/**
 * Generate a short, deterministic, URL-safe hash from an input string.
 *
 * The function:
 * - Normalizes the input using Unicode NFKC and trims surrounding whitespace.
 * - Computes a SHA-256 digest of the normalized input via Bun.CryptoHasher.
 * - Encodes the digest using base64url, strips any '-' and '_' characters, and
 *   returns the first 20 characters of the result.
 *
 * @param string - The input string to normalize and hash.
 * @returns A 20-character, URL-safe hash string derived from the input.
 *
 * @remarks
 * The output is deterministic for the same normalized input. Truncation to 20
 * characters reduces size but increases the risk of collisions compared to the
 * full SHA-256 digest.
 *
 */
export const hash_filename = (string: string) => {
  const normalized = string.normalize('NFKC').trim()
  const hasher = new Bun.CryptoHasher('sha256')
  return hasher.update(normalized).digest('base64url').replace(/[-_]/g, '').slice(0, 20)
}

/**
 * Computes the SHA-256 checksum of the provided binary data and returns it as a hexadecimal string.
 *
 * @param file - The file contents to hash, provided as an ArrayBuffer.
 * @returns The SHA-256 digest encoded as a lowercase hex string.
 *
 * @remarks
 * - This implementation relies on Bun's `CryptoHasher` API and thus requires running in the Bun runtime.
 * - For very large files, prefer a streaming approach to avoid holding the entire file in memory.
 *
 * @throws Will throw if the hashing operation fails or if the expected crypto API is unavailable.
 *
 */
export const checksum_file = (file: ArrayBuffer) =>
  new Bun.CryptoHasher('sha256').update(file).digest('hex')
