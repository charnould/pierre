import { useMemo, useRef, useState } from 'react'

import { OrgUserListItem } from '@/shared/components/OrgUserListItem'
import { Button } from '@/shared/components/ui/button'
import { Command, CommandGroup, CommandItem, CommandList } from '@/shared/components/ui/command'
import { Input } from '@/shared/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { filterOrgUsersForPicker } from '@/shared/lib/org-user-list-item'
import type { OrgUser } from '@/shared/types/users'

interface Props {
  value: OrgUser | null
  fallbackLogin?: string
  users: readonly OrgUser[]
  loading?: boolean
  disabled?: boolean
  'aria-label': string
  placeholder?: string
  onChange: (user: OrgUser) => void
}

export function CollaboratorPopoverPicker({
  value,
  fallbackLogin,
  users,
  loading = false,
  disabled,
  'aria-label': ariaLabel,
  placeholder = 'Rechercher un collègue…',
  onChange
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const suggestions = useMemo(() => filterOrgUsersForPicker(users, query.trim()), [query, users])

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery('')
      }}
    >
      <PopoverTrigger
        ref={triggerRef}
        disabled={disabled}
        aria-label={ariaLabel}
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-auto min-h-8 w-full justify-start py-1 font-normal"
          />
        }
      >
        {value ? (
          <OrgUserListItem user={value} />
        ) : fallbackLogin ? (
          <OrgUserListItem login={fallbackLogin} name={fallbackLogin} />
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        initialFocus={false}
        finalFocus={triggerRef}
        className="w-[min(18rem,calc(24rem-2rem))] rounded-md p-0 shadow-sm"
      >
        <div className="p-2 pb-0">
          <Input
            aria-label="Rechercher un collègue"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
            autoFocus
            className="h-8"
          />
        </div>
        <Command shouldFilter={false} className="rounded-none bg-transparent p-0 shadow-none">
          <CommandList className="max-h-56">
            <CommandGroup>
              {loading ? (
                <div className="text-muted-foreground px-2 py-1.5 text-xs leading-4">
                  Chargement…
                </div>
              ) : suggestions.length === 0 ? (
                <div className="text-muted-foreground px-2 py-1.5 text-xs leading-4">
                  Aucun résultat
                </div>
              ) : (
                suggestions.map((user) => (
                  <CommandItem
                    key={user.login}
                    value={user.login}
                    onSelect={() => {
                      onChange(user)
                      setOpen(false)
                      setQuery('')
                    }}
                  >
                    <OrgUserListItem user={user} />
                  </CommandItem>
                ))
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
