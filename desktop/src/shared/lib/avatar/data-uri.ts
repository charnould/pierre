export function bytesToDataUri(bytes: ArrayBuffer | Uint8Array, mime: string): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  let binary = ''
  for (let i = 0; i < view.byteLength; i++) binary += String.fromCharCode(view[i]!)
  return `data:${mime};base64,${btoa(binary)}`
}
