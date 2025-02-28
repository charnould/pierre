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

/**
 * Encodes a filename by converting the name part to Base64 and appending the
 * original extension. The Base64 encoding replaces "/" with "_" and "+" with
 * "-" to make it safe for filesystems, and removes trailing "=" padding
 * characters.
 *
 * @param filename - The original filename to encode.
 * @returns The encoded filename with the original extension.
 * @throws Will throw an error if the filename does not have a valid extension.
 *
 * This function is tested in tests/unit/utils/knowledge/generate-hash.test.ts
 */
export const encode_filename = (filename: string): string => {
  try {
    // Get filename extension
    const match = filename.match(/\.(docx|xlsx|md)$/i)
    if (match === null) throw new Error('invalid_uploaded_file_extension')
    const extension = match[0]

    // Remove the file extension
    const filename_without_extension = filename
      .normalize('NFKC')
      .replace(/\.(docx|xlsx|md)$/i, '')
      .trim()

    // Convert the filename to Base64
    const base64 = Buffer.from(filename_without_extension, 'utf-8')
      .toString('base64')
      .replace(/\//g, '_')
      .replace(/\+/g, '-')
      .replace(/=+$/, '')

    // Replace characters that are unsafe in filenames
    // Replace "/" with "_" and "+" with "-" to make it safe for filesystems
    // Remove trailing "=" padding characters
    return base64 + extension
  } catch (error) {
    console.error(error)
    return 'extension_error'
  }
}

/**
 * Decodes a Base64 encoded filename and restores its original extension.
 *
 * This function takes a filename that has been encoded in Base64 and has had
 * its standard Base64 characters replaced with URL-safe characters. It decodes
 * the filename back to its original form and appends the correct file
 * extension.
 *
 * @param filename - The encoded filename with a valid extension (.docx, .xlsx, .md).
 * @returns The decoded original filename with its extension.
 * @throws Will throw an error if the filename does not have a valid extension or if decoding fails.
 *
 *  This function is tested in tests/unit/utils/knowledge/generate-hash.test.ts
 */
export const decode_filename = (filename: string): string => {
  try {
    // Get filename extension
    const match = filename.match(/\.(docx|xlsx|md)$/i)
    if (!match) throw new Error('invalid_uploaded_file_extension')
    const extension = match[0]

    // Remove the file extension
    const filename_without_extension = filename.replace(/\.(docx|xlsx|md)$/i, '')

    // Restore Base64 standard characters
    let base64 = filename_without_extension.replace(/_/g, '/').replace(/-/g, '+')

    // Add padding if needed
    // Base64 length must be a multiple of 4
    while (base64.length % 4 !== 0) {
      base64 += '='
    }

    // Decode the Base64 string to the original filename
    return Buffer.from(base64, 'base64').toString('utf-8').normalize('NFKC') + extension
  } catch (error) {
    console.error(error)
    return 'extension_error'
  }
}
