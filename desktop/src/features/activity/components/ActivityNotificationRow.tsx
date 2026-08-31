import type { KeyboardEvent, MouseEvent } from 'react'

import {
  activityRowContextLabel,
  activitySenderLabel
} from '@/features/activity/lib/notification-labels'
import type { ActivityNotificationItem } from '@/features/activity/lib/notification-types'
import { RepaymentMentionText } from '@/features/repayment/components/RepaymentMentionText'
import { TimelineActorAvatar } from '@/shared/components/timeline/timeline-actor-avatar'
import { Button } from '@/shared/components/ui/button'
import { useOrgUsersVersion } from '@/shared/hooks/useUserAvatar'
import {
  formatActivityNotificationDateline,
  formatActivityNotificationTime
} from '@/shared/lib/timeline/activity-notification-date'
import type { ParsedActivityAuthor } from '@/shared/lib/timeline/parse-activity-author'
import { cn } from '@/shared/lib/utils'

interface Props {
  item: ActivityNotificationItem
  routineName?: string
  showContext?: boolean
  timeline?: boolean
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
  timeline = false,
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
  const meta = isActivity
    ? [item.moduleLabel, item.ref].filter(Boolean).join(' · ')
    : timeline
      ? item.moduleLabel
      : showContext
        ? sender
        : item.moduleLabel

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
        'group relative min-w-0',
        !timeline && 'border-b border-border/60',
        isOpenable &&
          'hover:bg-muted focus-visible:bg-muted cursor-pointer focus-visible:ring-1 focus-visible:ring-ring/40 focus-visible:outline-none'
      )}
      onClick={() => {
        if (isOpenable) onOpen(item)
      }}
      onKeyDown={handleKeyDown}
    >
      <div
        className={cn(
          'min-w-0 items-start gap-4 px-4 py-2',
          timeline ? 'grid grid-cols-[3.5rem_2.5rem_minmax(0,1fr)]' : 'flex'
        )}
      >
        {timeline ? (
          <time
            className="text-muted-foreground pt-1 text-start text-xs leading-4 tabular-nums"
            dateTime={item.createdAt}
          >
            {formatActivityNotificationTime(item.createdAt)}
          </time>
        ) : null}
        <TimelineActorAvatar
          actor={actorForItem(item, sender)}
          className={timeline ? 'relative z-10' : undefined}
        />
        <div className="min-w-0 flex-1 text-start">
          {isNotification ? <span className="sr-only">{isUnread ? 'Non lue' : 'Lue'}</span> : null}
          <p
            className={
              isActivity
                ? 'text-foreground min-w-0 text-sm leading-5 font-medium whitespace-pre-wrap'
                : 'text-foreground min-w-0 truncate text-sm leading-5 font-medium'
            }
          >
            {title}
          </p>
          {preview ? (
            <p className="text-foreground mt-1 text-xs leading-4 whitespace-pre-wrap">
              <RepaymentMentionText
                compact
                inline
                text={preview}
                mentionVariant="activityRecipient"
              />
            </p>
          ) : null}
          <p className="text-muted-foreground mt-1 flex min-w-0 items-baseline text-xs leading-4">
            {timeline ? null : (
              <>
                <time className="shrink-0 whitespace-nowrap tabular-nums" dateTime={item.createdAt}>
                  {formatActivityNotificationDateline(item.createdAt)}
                </time>
                <span className="shrink-0 whitespace-pre"> · </span>
              </>
            )}
            <span className="min-w-0 truncate">{meta}</span>
            {item.boostEmoji ? (
              <span className="shrink-0 whitespace-pre" aria-label="Boosté">
                {` ${item.boostEmoji}`}
              </span>
            ) : null}
          </p>
        </div>
      </div>

      {isNotification && item.isRead ? (
        <div
          aria-hidden
          data-read-veil
          className="activity-read-veil bg-background/70 pointer-events-none absolute inset-0"
        />
      ) : null}

      {isNotification && item.isRead ? (
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="absolute top-2 right-4 z-10 opacity-0 transition-opacity duration-160 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:opacity-100 focus-visible:opacity-100"
          aria-label="Marquer comme non lue"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={handleMarkUnread}
        >
          Non lu
        </Button>
      ) : null}
    </li>
  )
}
