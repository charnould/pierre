const VARIABLE_PATTERN = /\{\{\s*([^{}]+?)\s*\}\}/g
const DENIED_PROTOCOLS = new Set(['file:', 'javascript:', 'data:'])

export type ExternalApplicationTransport = 'browser' | 'external'

export type ExternalApplication = {
  name: string
  transport: ExternalApplicationTransport
  clipboard: boolean
  url: string
  selector?: string
}

export type LaunchTarget = { kind: 'path'; path: string } | { kind: 'url'; href: string }

function cellText(row: Record<string, unknown>, column: string): string {
  const value = row[column]
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim()
  }
  return ''
}

/** Chemin absolu macOS, Windows ou UNC. `C:` n’est pas traité comme un schéma d’URL. */
export function isAbsoluteLaunchPath(value: string): boolean {
  return (
    /^[A-Za-z]:[\\/]/.test(value) ||
    value.startsWith('\\\\') ||
    (value.startsWith('/') && !value.startsWith('//'))
  )
}

/** Sélecteur CSS utilisable par `querySelector` : id, classe, attribut, combinaison. */
export function isCssSelector(selector: string): boolean {
  const value = selector.trim()
  if (!value) return false
  let brackets = 0
  let parens = 0
  for (const char of value) {
    if (char === '[') brackets += 1
    else if (char === ']') brackets -= 1
    else if (char === '(') parens += 1
    else if (char === ')') parens -= 1
    if (brackets < 0 || parens < 0) return false
  }
  return brackets === 0 && parens === 0
}

export function classifyLaunchTarget(value: string): LaunchTarget | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (isAbsoluteLaunchPath(trimmed)) return { kind: 'path', path: trimmed }
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return null
  }
  if (DENIED_PROTOCOLS.has(url.protocol)) return null
  if (!/^[a-z][a-z0-9+.-]*:$/i.test(url.protocol)) return null
  return { kind: 'url', href: url.toString() }
}

function launchProbe(template: string): LaunchTarget | null {
  return classifyLaunchTarget(template.replaceAll(VARIABLE_PATTERN, 'x'))
}

function normalize(value: Record<string, unknown>): ExternalApplication | null {
  const name = typeof value['name'] === 'string' ? value['name'].trim() : ''
  const transport = value['transport']
  const url = typeof value['url'] === 'string' ? value['url'].trim() : ''
  const selector = typeof value['selector'] === 'string' ? value['selector'].trim() : undefined
  if (transport !== 'browser' && transport !== 'external') return null
  if (typeof value['clipboard'] !== 'boolean' || !name || !url) return null
  const application: ExternalApplication = { name, transport, clipboard: value['clipboard'], url }
  if (selector) application.selector = selector
  return application
}

/** Erreurs de structure. `undefined` et `null` sont valides : pas de passerelle. */
export function validateExternalApplication(value: unknown, namespace: string): string[] {
  if (value === undefined || value === null) return []
  if (typeof value !== 'object' || Array.isArray(value)) {
    return [`${namespace}: objet ou null requis`]
  }
  const external = value as Record<string, unknown>
  const errors: string[] = []
  const name = external['name']
  const transport = external['transport']
  const clipboard = external['clipboard']
  const url = external['url']
  const selector = external['selector']
  if (typeof name !== 'string' || !name.trim()) {
    errors.push(`${namespace}.name: string non vide requise`)
  }
  if (transport !== 'browser' && transport !== 'external') {
    errors.push(`${namespace}.transport: « browser » ou « external » requis`)
  }
  if (typeof clipboard !== 'boolean') {
    errors.push(`${namespace}.clipboard: booléen requis`)
  }
  const pattern = typeof url === 'string' ? url.trim() : ''
  if (!pattern) {
    errors.push(`${namespace}.url: string non vide requise`)
  } else if (pattern.includes('{{') || pattern.includes('}}')) {
    const filled = pattern.replaceAll(VARIABLE_PATTERN, 'x')
    if (filled.includes('{{') || filled.includes('}}')) {
      errors.push(`${namespace}.url: variable {{colonne}} incomplète`)
    }
  }
  const wantsSelector = transport === 'browser' && clipboard === true
  if (wantsSelector) {
    if (typeof selector !== 'string' || !isCssSelector(selector)) {
      errors.push(`${namespace}.selector: sélecteur CSS non vide requis`)
    }
  } else if (selector !== undefined) {
    errors.push(`${namespace}.selector: interdit sans injection dans le navigateur`)
  }
  if (pattern && (transport === 'browser' || transport === 'external')) {
    const target = launchProbe(pattern)
    if (transport === 'browser') {
      if (target?.kind !== 'url') {
        errors.push(`${namespace}.url: URL HTTP(S) absolue requise`)
      } else {
        const protocol = new URL(target.href).protocol
        if (protocol !== 'http:' && protocol !== 'https:') {
          errors.push(`${namespace}.url: URL HTTP(S) absolue requise`)
        }
      }
    } else if (!target) {
      errors.push(`${namespace}.url: URL absolue ou chemin absolu requis`)
    }
  }
  return errors
}

export function readExternalApplication(moduleConfig: unknown): ExternalApplication | null {
  if (moduleConfig == null || typeof moduleConfig !== 'object' || Array.isArray(moduleConfig)) {
    return null
  }
  const application = (moduleConfig as Record<string, unknown>)['external_application']
  if (application == null) return null
  if (validateExternalApplication(application, 'external_application').length > 0) return null
  if (typeof application !== 'object' || Array.isArray(application)) return null
  return normalize(application as Record<string, unknown>)
}

/** Substitue `{{colonne}}`. Encode dans une URL, laisse le texte brut dans un chemin. */
export function resolveExternalApplicationTarget(
  application: ExternalApplication,
  row: Record<string, unknown>
): string | null {
  const probe = launchProbe(application.url)
  if (!probe) return null
  let missing = false
  const resolved = application.url.replaceAll(VARIABLE_PATTERN, (_, rawColumn: string) => {
    const text = cellText(row, rawColumn.trim())
    if (!text) missing = true
    return probe.kind === 'url' ? encodeURIComponent(text) : text
  })
  if (missing || resolved.includes('{{') || resolved.includes('}}')) return null
  const target = classifyLaunchTarget(resolved)
  if (!target) return null
  if (application.transport === 'browser') {
    if (target.kind !== 'url') return null
    const protocol = new URL(target.href).protocol
    return protocol === 'http:' || protocol === 'https:' ? target.href : null
  }
  return target.kind === 'path' ? target.path : target.href
}
