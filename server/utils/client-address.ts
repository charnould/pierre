export function clientAddress(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const address = forwarded
    ?.split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .at(-1)
  return address || 'local'
}
