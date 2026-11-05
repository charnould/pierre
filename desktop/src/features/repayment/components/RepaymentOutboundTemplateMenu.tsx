import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/shared/components/ui/dropdown-menu'
import { repaymentSetup } from '@/shared/lib/instance-customization'

import {
  type RepaymentMessage,
  repaymentMessageKey
} from '../../../../../shared/repayment-messages'
import type { TenantRepaymentRow } from '../lib/classify-tenants'
import {
  type ResolvedRepaymentEmail,
  type ResolvedRepaymentRcs,
  resolveRepaymentEmail,
  resolveRepaymentRcs
} from '../lib/repayment-messages'

interface Props {
  tenant: TenantRepaymentRow
  onSelectRcs: (resolved: ResolvedRepaymentRcs) => void
  onSelectEmail: (resolved: ResolvedRepaymentEmail) => void
  onSelectMailto: (resolved: ResolvedRepaymentEmail) => void
}

function groupsOf(messages: readonly RepaymentMessage[]) {
  const groups: { group: string; messages: RepaymentMessage[] }[] = []
  for (const message of messages) {
    const last = groups.at(-1)
    if (last?.group === message.group) last.messages.push(message)
    else groups.push({ group: message.group, messages: [message] })
  }
  return groups
}

export function RepaymentOutboundTemplateItems({
  tenant,
  onSelectRcs,
  onSelectEmail,
  onSelectMailto
}: Props) {
  const groups = groupsOf(repaymentSetup().messages)
  if (groups.length === 0) return <DropdownMenuItem disabled>Aucun message</DropdownMenuItem>

  return (
    <>
      {groups.map((entry, index) => (
        <div key={entry.group}>
          {index > 0 ? <DropdownMenuSeparator /> : null}
          <DropdownMenuGroup>
            <DropdownMenuLabel>{entry.group}</DropdownMenuLabel>
            {entry.messages.map((message) => (
              <DropdownMenuItem
                key={repaymentMessageKey(message)}
                onClick={() => {
                  if (message.kind === 'rcs') onSelectRcs(resolveRepaymentRcs(message, tenant))
                  else if (message.to === 'caf')
                    onSelectMailto(resolveRepaymentEmail(message, tenant))
                  else onSelectEmail(resolveRepaymentEmail(message, tenant))
                }}
              >
                {message.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </div>
      ))}
    </>
  )
}
