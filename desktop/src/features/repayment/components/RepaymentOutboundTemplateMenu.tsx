import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/shared/components/ui/dropdown-menu'

import type { TenantRepaymentRow } from '../lib/classify-tenants'
import {
  listOutboundTemplateGroups,
  resolveOutboundEmail,
  resolveOutboundRcs,
  type OutboundEmailResolved,
  type OutboundRcsResolved,
  type OutboundTemplate
} from '../lib/outbound-email-templates.bundle'

interface Props {
  tenant: TenantRepaymentRow
  onSelectRcs: (resolved: OutboundRcsResolved) => void
  onSelectEmail: (resolved: OutboundEmailResolved) => void
  onSelectMailto: (resolved: OutboundEmailResolved) => void
}

function selectTemplate(
  template: OutboundTemplate,
  tenant: TenantRepaymentRow,
  onSelectRcs: Props['onSelectRcs'],
  onSelectEmail: Props['onSelectEmail'],
  onSelectMailto: Props['onSelectMailto']
) {
  if (template.channel === 'rcs') onSelectRcs(resolveOutboundRcs(template, tenant))
  else if (template.channel === 'mailto') onSelectMailto(resolveOutboundEmail(template, tenant))
  else onSelectEmail(resolveOutboundEmail(template, tenant))
}

export function RepaymentOutboundTemplateItems({
  tenant,
  onSelectRcs,
  onSelectEmail,
  onSelectMailto
}: Props) {
  const groups = listOutboundTemplateGroups()

  if (groups.length === 0) {
    return <DropdownMenuItem disabled>Aucun modèle</DropdownMenuItem>
  }

  return (
    <>
      {groups.map((entry, index) => (
        <div key={entry.group}>
          {index > 0 ? <DropdownMenuSeparator /> : null}
          <DropdownMenuGroup>
            <DropdownMenuLabel>{entry.group}</DropdownMenuLabel>
            {entry.templates.map((template) => (
              <DropdownMenuItem
                key={template.id}
                onClick={() =>
                  selectTemplate(template, tenant, onSelectRcs, onSelectEmail, onSelectMailto)
                }
              >
                {template.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </div>
      ))}
    </>
  )
}
