import { instanceCustomization } from '@/shared/lib/instance-customization'

import {
  groupOutboundTemplates,
  resolveOutboundEmail,
  resolveOutboundRcs,
  templatesFromRawModules,
  type OutboundTemplate,
  type OutboundTemplateGroup
} from './outbound-email-templates'

function templateGroupOrder(): readonly string[] | undefined {
  const raw = instanceCustomization().repayments?.template_groups
  if (!Array.isArray(raw) || raw.length === 0) return undefined
  const names = raw.filter(
    (entry): entry is string => typeof entry === 'string' && entry.trim().length > 0
  )
  return names.length > 0 ? names : undefined
}

export function listOutboundTemplates(): readonly OutboundTemplate[] {
  const repayments = instanceCustomization().repayments
  if (!repayments) return []
  return templatesFromRawModules(repayments.templates)
}

export function listOutboundTemplateGroups(): readonly OutboundTemplateGroup[] {
  return groupOutboundTemplates(listOutboundTemplates(), templateGroupOrder())
}

export { resolveOutboundEmail, resolveOutboundRcs }

export {
  type OutboundEmailResolved,
  type OutboundRcsResolved,
  type OutboundTemplate,
  type OutboundTemplateGroup
} from './outbound-email-templates'
