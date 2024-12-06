export const generate_hash = (string: string) => {
  const hasher = new Bun.CryptoHasher('sha256')
  return hasher.update(string).digest('base64url').replace(/-/g, '')
}
