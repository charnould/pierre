import { afterEach, describe, expect, it, mock } from 'bun:test'

import { act, useState } from 'react'
import { createRoot } from 'react-dom/client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog'
import { clearOrgUsersCache } from '@/shared/lib/org-users-cache'
import type { OrgUser } from '@/shared/types/users'

import { CollaboratorsCombobox, normalizeCollaboratorSelection } from './CollaboratorsCombobox'

const ORG_USERS: OrgUser[] = [
  {
    login: 'owner',
    email: 'owner@example.org',
    displayName: 'Propriétaire',
    hasAvatar: false,
    avatarBytes: 0,
    avatarVersion: 0
  },
  {
    login: 'alice',
    email: 'alice@example.org',
    displayName: 'Alice Martin',
    hasAvatar: false,
    avatarBytes: 0,
    avatarVersion: 0
  },
  {
    login: 'bob',
    email: 'bob@example.org',
    displayName: 'Bob Durand',
    hasAvatar: false,
    avatarBytes: 0,
    avatarVersion: 0
  }
]

function DialogComboboxHarness({ onChange }: { onChange: (values: string[]) => void }) {
  const [value, setValue] = useState<string[]>([])
  return (
    <Dialog open>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier</DialogTitle>
        </DialogHeader>
        <CollaboratorsCombobox
          url="https://pierre.test"
          ownerLogin="owner"
          value={value}
          onValueChange={(next) => {
            setValue(next)
            onChange(next)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}

async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

afterEach(() => {
  clearOrgUsersCache()
  document.body.replaceChildren()
  delete (window as { api?: unknown }).api
})

describe('normalizeCollaboratorSelection', () => {
  const users = [
    { login: 'alice', email: 'alice@example.org' },
    { login: 'bob', email: 'bob@example.org' }
  ]

  it('normalizes legacy logins and emails to canonical lowercase emails without duplicates', () => {
    expect(normalizeCollaboratorSelection(['Bob@Example.org', 'bob', '  alice  '], users)).toEqual([
      'bob@example.org',
      'alice@example.org'
    ])
  })

  it('does not misattribute ambiguous logins across multiple domains', () => {
    const ambiguous = [
      { login: 'alex', email: 'alex@a.org' },
      { login: 'alex', email: 'alex@b.org' }
    ]
    expect(normalizeCollaboratorSelection(['alex', 'alex@b.org'], ambiguous)).toEqual([
      'alex',
      'alex@b.org'
    ])
  })
})

describe('CollaboratorsCombobox inside Dialog', () => {
  it('opens the user list above the dialog layer, excludes the owner, and selects a user', async () => {
    ;(window as { api?: unknown }).api = {
      getUsers: mock(() => Promise.resolve({ data: ORG_USERS }))
    }
    const onChange = mock(() => {})

    const host = document.createElement('div')
    document.body.append(host)
    const root = createRoot(host)

    await act(async () => {
      root.render(<DialogComboboxHarness onChange={onChange} />)
    })
    await flush()

    const input = document.querySelector<HTMLInputElement>('input[aria-label="Collaborateurs"]')
    expect(input).not.toBeNull()

    await act(async () => {
      input?.focus()
      input?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }))
    })
    await flush()

    const popup = document.querySelector<HTMLElement>('[data-slot="combobox-content"]')
    expect(popup).not.toBeNull()
    expect(popup?.parentElement?.className).toContain('z-[70]')

    const items = Array.from(document.querySelectorAll<HTMLElement>('[data-slot="combobox-item"]'))
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('Alice Martin'),
      expect.stringContaining('Bob Durand')
    ])
    expect(popup?.textContent).not.toContain('Propriétaire')

    await act(async () => {
      items[0]?.click()
    })
    await flush()

    expect(onChange).toHaveBeenCalledWith(['alice@example.org'])
    expect(document.querySelector('[data-slot="combobox-chip"]')?.textContent).toContain(
      'Alice Martin'
    )

    await act(async () => root.unmount())
    host.remove()
  })
})
