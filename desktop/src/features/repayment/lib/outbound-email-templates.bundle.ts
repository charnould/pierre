import repaymentConfig from '@customization/repayments/config'

import {
  groupOutboundTemplates,
  resolveOutboundEmail,
  resolveOutboundRcs,
  templatesFromRawModules,
  type OutboundTemplate,
  type OutboundTemplateGroup
} from './outbound-email-templates'

const rawModules = import.meta.glob('@customization/repayments/templates/*.md', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>

const ALL_TEMPLATES: readonly OutboundTemplate[] = Object.freeze(
  templatesFromRawModules(rawModules)
)

function templateGroupOrder(): readonly string[] | undefined {
  const raw = (repaymentConfig as { template_groups?: unknown }).template_groups
  if (!Array.isArray(raw) || raw.length === 0) return undefined
  const names = raw.filter(
    (entry): entry is string => typeof entry === 'string' && entry.trim().length > 0
  )
  return names.length > 0 ? names : undefined
}

const TEMPLATE_GROUPS: readonly OutboundTemplateGroup[] = Object.freeze(
  groupOutboundTemplates(ALL_TEMPLATES, templateGroupOrder())
)

export function listOutboundTemplates(): readonly OutboundTemplate[] {
  return ALL_TEMPLATES
}

export function listOutboundTemplateGroups(): readonly OutboundTemplateGroup[] {
  return TEMPLATE_GROUPS
}

export { resolveOutboundEmail, resolveOutboundRcs }

export {
  type OutboundEmailResolved,
  type OutboundRcsResolved,
  type OutboundTemplate,
  type OutboundTemplateGroup
} from './outbound-email-templates'
