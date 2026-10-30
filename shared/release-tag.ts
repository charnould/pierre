const RELEASE_TAG = /^(?:carl|cli|server)-(\d+)\.(\d+)\.(\d+)$/

export function releaseParts(tag: string): [number, number, number] | null {
  const match = RELEASE_TAG.exec(tag)
  if (!match) return null
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

export function versionGreater(left: string, right: string): boolean {
  const a = releaseParts(left)
  const b = releaseParts(right)
  if (!a || !b) throw new Error('Version illisible.')
  if (a[0] !== b[0]) return a[0] > b[0]
  if (a[1] !== b[1]) return a[1] > b[1]
  return a[2] > b[2]
}
