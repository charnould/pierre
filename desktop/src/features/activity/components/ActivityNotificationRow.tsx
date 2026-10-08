import type { KeyboardEvent, MouseEvent } from 'react'

import {
  activityRowContextLabel,
  activitySenderLabel
} from '@/features/activity/lib/notification-labels'
import type { ActivityNotificationItem } from '@/features/activity/lib/notification-types'
import { MentionText } from '@/shared/components/inspector/mention-text'
import { TimelineActorAvatar } from '@/shared/components/timeline/timeline-actor-avatar'
import { Button } from '@/shared/components/ui/button'
import { useOrgUsersVersion } from '@/shared/hooks/useUserAvatar'
import { formatActivityNotificationDateline } from '@/shared/lib/timeline/activity-notification-date'
import type { ParsedActivityAuthor } from '@/shared/lib/timeline/parse-activity-author'
import { cn } from '@/shared/lib/utils'

interface Props {
  item: ActivityNotificationItem
  routineName?: string
  showContext?: boolean
  onOpen: (item: ActivityNotificationItem) => void
  onMarkUnread: (item: ActivityNotificationItem) => void
}

function actorForItem(item: ActivityNotificationItem, sender: string): ParsedActivityAuthor {
  if (item.type === 'automations') {
    return { kind: 'automation', id: item.ref, label: 'Pierre' }
  }
  if (item.type === 'updates') {
    return { kind: 'system', id: item.ref, label: 'Pierre' }
  }
  return { kind: 'user', id: item.sender, label: sender }
}

export function ActivityNotificationRow({
  item,
  routineName,
  showContext = true,
  onOpen,
  onMarkUnread
}: Props) {
  useOrgUsersVersion()
  const isNotification = item.source !== 'activity'
  const isActivity = item.source === 'activity'
  const isUnread = !item.isRead
  const isOpenable = item.target != null
  const sender = activitySenderLabel(item)
  const context = activityRowContextLabel(item, routineName)
  const title = isActivity ? item.body : showContext ? context : sender
  const preview = (isActivity ? (item.detail ?? '') : item.body).trim()
  const avatar = <TimelineActorAvatar actor={actorForItem(item, sender)} className="size-5" />

  function handleKeyDown(event: KeyboardEvent<HTMLLIElement>) {
    if (!isOpenable || (event.key !== 'Enter' && event.key !== ' ')) return
    event.preventDefault()
    onOpen(item)
  }

  function handleMarkUnread(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    onMarkUnread(item)
  }

  return (
    <li
      role={isOpenable ? 'button' : undefined}
      tabIndex={isOpenable ? 0 : undefined}
      className={cn(
        'group border-border/80 min-w-0 rounded-md border',
        isOpenable &&
          'hover:bg-muted focus-visible:bg-muted focus-visible:ring-ring/20 cursor-pointer focus-visible:ring-2 focus-visible:outline-none'
      )}
      onClick={() => {
        if (isOpenable) onOpen(item)
      }}
      onKeyDown={handleKeyDown}
    >
      <div className="flex min-w-0 items-start gap-2 px-3 py-2">
        <div className="grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2 gap-y-1 text-start">
          {isNotification ? <span className="sr-only">{isUnread ? 'Non lue' : 'Lue'}</span> : null}
          <div className="min-w-0">
            <p
              className={cn(
                'min-w-0 text-sm leading-4 font-medium',
                isNotification && item.isRead ? 'text-muted-foreground' : 'text-foreground',
                isActivity ? 'whitespace-pre-wrap' : 'truncate'
              )}
            >
              {title}
            </p>
            <p className="text-muted-foreground flex min-w-0 items-baseline text-xs leading-4">
              <span className="min-w-0 truncate tabular-nums">
                <time dateTime={item.createdAt}>
                  {formatActivityNotificationDateline(item.createdAt)}
                </time>
                <span className="whitespace-pre"> · </span>
                {sender}
              </span>
              {item.boostEmoji ? (
                <span className="shrink-0 whitespace-pre" aria-label="Boosté">
                  {` ${item.boostEmoji}`}
                </span>
              ) : null}
            </p>
          </div>
          {isNotification && item.isRead ? (
            <span className="ease-pierre-out col-start-2 row-start-1 opacity-0 transition-opacity duration-160 focus-within:opacity-100 [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                aria-label="Marquer comme non lue"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={handleMarkUnread}
              >
                Non lu
              </Button>
            </span>
          ) : null}
          {preview ? (
            <p className="text-muted-foreground col-span-2 line-clamp-2 font-serif text-sm leading-4.75 font-[350]">
              <MentionText compact inline text={preview} mentionVariant="activityRecipient" />
            </p>
          ) : null}
        </div>
        {avatar}
      </div>
    </li>
  )
}
