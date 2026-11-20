import { Fragment, useMemo } from 'react'

import { OrgUserListItem } from '@/shared/components/OrgUserListItem'
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor
} from '@/shared/components/ui/combobox'
import { UserAvatar } from '@/shared/components/UserAvatar'
import { useOrgUsers } from '@/shared/hooks/useOrgUsers'
import { useUserAvatar } from '@/shared/hooks/useUserAvatar'
import { collaboratorSearchLabel, orgUserListName } from '@/shared/lib/org-user-list-item'
import { formatOrgCollaboratorLabel } from '@/shared/lib/org-users-cache'
import type { OrgUser } from '@/shared/types/users'

type CollaboratorIdentity = Pick<OrgUser, 'login' | 'email'>

function collaboratorValueKey(user: CollaboratorIdentity): string {
  return (user.email || user.login).trim().toLowerCase()
}

function indexCollaborators<T extends CollaboratorIdentity>(users: readonly T[]): Map<string, T> {
  const byKey = new Map<string, T>()
  const loginCounts = new Map<string, number>()
  for (const user of users) {
    const login = user.login.trim().toLowerCase()
    if (login) loginCounts.set(login, (loginCounts.get(login) ?? 0) + 1)
  }
  for (const user of users) {
    if (user.email) byKey.set(user.email.trim().toLowerCase(), user)
    const login = user.login.trim().toLowerCase()
    if (login && loginCounts.get(login) === 1 && !byKey.has(login)) {
      byKey.set(login, user)
    }
  }
  return byKey
}

export function normalizeCollaboratorSelection(
  values: readonly string[],
  users: readonly CollaboratorIdentity[]
): string[] {
  const byKey = indexCollaborators(users)
  const seen = new Set<string>()
  const result: string[] = []
  for (const raw of values) {
    const trimmed = raw.trim()
    if (!trimmed) continue
    const lowered = trimmed.toLowerCase()
    const matched = byKey.get(lowered)
    const resolved = matched ? collaboratorValueKey(matched) : lowered
    if (seen.has(resolved)) continue
    seen.add(resolved)
    result.push(resolved)
  }
  return result
}

function CollaboratorChipAvatar({ login, name }: { login: string; name: string }) {
  const photoUrl = useUserAvatar(login)
  return (
    <UserAvatar photoUrl={photoUrl} name={name} login={login} size="sm" className="size-3.5!" />
  )
}

export function CollaboratorsCombobox({
  url,
  ownerLogin,
  value,
  onValueChange
}: {
  url: string | undefined
  ownerLogin: string
  value: string[]
  onValueChange: (logins: string[]) => void
}) {
  const anchor = useComboboxAnchor()
  const { users: orgUsers } = useOrgUsers(url)
  const normalizedOwner = ownerLogin.trim().toLowerCase()

  const usersByKey = useMemo(() => indexCollaborators(orgUsers), [orgUsers])

  const items = useMemo(
    () =>
      [...orgUsers]
        .filter(
          (user) =>
            user.login.trim().toLowerCase() !== normalizedOwner &&
            user.email.trim().toLowerCase() !== normalizedOwner
        )
        .sort(
          (a, b) => a.login.localeCompare(b.login, 'fr') || a.email.localeCompare(b.email, 'fr')
        )
        .map(collaboratorValueKey),
    [orgUsers, normalizedOwner]
  )

  const normalizedValue = useMemo(
    () => normalizeCollaboratorSelection(value, orgUsers),
    [value, orgUsers]
  )

  return (
    <Combobox
      multiple
      autoHighlight
      items={items}
      value={normalizedValue}
      onValueChange={(next) =>
        onValueChange(normalizeCollaboratorSelection(next as string[], orgUsers))
      }
      itemToStringLabel={(entry) => {
        const user = usersByKey.get(entry.toLowerCase())
        return user ? collaboratorSearchLabel(user) : entry
      }}
    >
      <ComboboxChips ref={anchor} className="w-full">
        <ComboboxValue>
          {(values) => (
            <Fragment>
              {values.map((entry: string) => {
                const user = usersByKey.get(entry.toLowerCase())
                const label = user ? orgUserListName(user) : formatOrgCollaboratorLabel(entry)
                return (
                  <ComboboxChip key={entry}>
                    <CollaboratorChipAvatar login={user?.login ?? entry} name={label} />
                    <span className="truncate">{label}</span>
                  </ComboboxChip>
                )
              })}
              <ComboboxChipsInput
                aria-label="Collaborateurs"
                placeholder={values.length === 0 ? 'Rechercher un collaborateur…' : undefined}
              />
            </Fragment>
          )}
        </ComboboxValue>
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        <ComboboxEmpty>Aucun utilisateur trouvé.</ComboboxEmpty>
        <ComboboxList>
          {(entry) => {
            const user = usersByKey.get(entry.toLowerCase())
            return (
              <ComboboxItem key={entry} value={entry}>
                {user ? (
                  <OrgUserListItem user={user} />
                ) : (
                  <OrgUserListItem name={formatOrgCollaboratorLabel(entry)} login={entry} />
                )}
              </ComboboxItem>
            )
          }}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
