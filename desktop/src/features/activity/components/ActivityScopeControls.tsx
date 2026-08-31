import { Users } from 'lucide-react'
import { useMemo } from 'react'

import type { ActivityFeedApi } from '@/features/activity/hooks/useActivityFeed'
import { OrgUserListItem } from '@/shared/components/OrgUserListItem'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger
} from '@/shared/components/ui/popover'
import { useOrgUsers } from '@/shared/hooks/useOrgUsers'
import type { OrgUser } from '@/shared/types/users'

interface Props {
  feed: ActivityFeedApi
  url: string | undefined
  userLogin: string
}

export function activityAuthorKey(email: string): string {
  return `user:${email.trim().toLowerCase()}`
}

export function followedPeopleCount(
  feed: Pick<ActivityFeedApi, 'showOwnActivity' | 'followedActivityAuthors'>,
  userLogin: string
): number {
  const own = activityAuthorKey(userLogin)
  const others = feed.followedActivityAuthors.filter((author) => author !== own).length
  return Number(feed.showOwnActivity) + others
}

function isOwnUser(user: OrgUser, userLogin: string): boolean {
  const login = userLogin.trim().toLowerCase()
  return user.email.trim().toLowerCase() === login || user.login.trim().toLowerCase() === login
}

export function ActivityFollowList({ feed, url, userLogin }: Props) {
  const { users, loading } = useOrgUsers(url)
  const ownAuthor = activityAuthorKey(userLogin)
  const ownUser = useMemo(
    () => users.find((user) => isOwnUser(user, userLogin)),
    [userLogin, users]
  )
  const collaborators = useMemo(
    () =>
      users
        .filter((user) => !isOwnUser(user, userLogin))
        .sort((a, b) => a.displayName.localeCompare(b.displayName, 'fr')),
    [userLogin, users]
  )
  const followed = new Set(feed.followedActivityAuthors)

  return (
    <div className="flex flex-col px-2">
      <label className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded-md px-2 py-2">
        <Checkbox
          checked={feed.showOwnActivity}
          onCheckedChange={(nextChecked) => {
            void feed.setShowOwnActivity(nextChecked === true)
          }}
          aria-label={ownUser ? `Suivre ${ownUser.displayName}` : 'Suivre vos activités'}
        />
        {ownUser ? (
          <OrgUserListItem user={ownUser} className="min-w-0 flex-1" />
        ) : (
          <OrgUserListItem name="Vous" login={userLogin} className="min-w-0 flex-1" />
        )}
      </label>
      {collaborators.map((user) => {
        const author = activityAuthorKey(user.email)
        const checked = followed.has(author)
        return (
          <label
            key={user.login}
            className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded-md px-2 py-2"
          >
            <Checkbox
              checked={checked}
              onCheckedChange={(nextChecked) => {
                const next = new Set(
                  feed.followedActivityAuthors.filter((entry) => entry !== ownAuthor)
                )
                if (nextChecked === true) next.add(author)
                else next.delete(author)
                void feed.setFollowedActivityAuthors([...next].sort())
              }}
              aria-label={`Suivre ${user.displayName}`}
            />
            <OrgUserListItem user={user} className="min-w-0 flex-1" />
          </label>
        )
      })}
      {!loading && collaborators.length === 0 ? (
        <p className="text-muted-foreground px-2 py-2 text-xs">Aucun collaborateur disponible.</p>
      ) : null}
    </div>
  )
}

export function ActivityScopeControls({ feed, url, userLogin }: Props) {
  const count = followedPeopleCount(feed, userLogin)

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button type="button" variant="outline" size="sm">
            <Users aria-hidden />
            {count > 0 ? `Suivre des collaborateurs · ${count}` : 'Suivre des collaborateurs'}
          </Button>
        }
      />
      <PopoverContent align="start" side="top" className="max-h-80 overflow-y-auto">
        <PopoverHeader>
          <PopoverTitle>Qui suivre</PopoverTitle>
        </PopoverHeader>
        <ActivityFollowList feed={feed} url={url} userLogin={userLogin} />
      </PopoverContent>
    </Popover>
  )
}
