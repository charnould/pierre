import { motion } from 'motion/react'

import { audienceBadgeVariant, audienceLabel } from '@/features/updates/lib/audience-display'
import { isUpdateEntryUnread } from '@/features/updates/lib/updates-notification'
import type { UpdateEntry } from '@/features/updates/types'
import { Badge } from '@/shared/components/ui/badge'
import { Card } from '@/shared/components/ui/card'
import { cn } from '@/shared/lib/utils'

function formatUpdateEntryDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
}

interface UpdateListItemProps {
  entry: UpdateEntry
  readSlugs: string[]
  isSelected: boolean
  onSelect: (slug: string) => void
}

function UpdateListItem({ entry, readSlugs, isSelected, onSelect }: UpdateListItemProps) {
  const isUnread = isUpdateEntryUnread(readSlugs, entry)

  return (
    <motion.article
      layout="position"
      className={cn(
        'automations-list-row group',
        isSelected && 'automations-list-row--selected z-[1]'
      )}
      initial={false}
      onClick={() => onSelect(entry.slug)}
    >
      {!isSelected ? (
        <div
          aria-hidden
          className="automations-list-item__hover opacity-0 transition-opacity group-hover:opacity-100"
        />
      ) : null}
      {isSelected ? (
        <motion.div
          layoutId="update-selection"
          className="bg-report absolute inset-0"
          transition={{ type: 'spring', stiffness: 520, damping: 42, mass: 0.9 }}
        />
      ) : null}

      <div className="automations-list-row__inner">
        <div className="automations-list-row__head">
          {isUnread ? (
            <span
              aria-hidden
              className="updates-list-unread-dot size-2 shrink-0 rounded-full"
              title="Non lu"
            />
          ) : null}
          <time className="automations-list-item__desc shrink-0" dateTime={entry.date}>
            {formatUpdateEntryDate(entry.date)}
          </time>
          <Badge variant={audienceBadgeVariant(entry.audience)} size="compact" className="shrink-0">
            {audienceLabel(entry.audience)}
          </Badge>
        </div>
        <h3
          className={cn(
            'automations-list-row__title',
            isSelected ? 'text-desk-title' : 'text-desk-label',
            isUnread && 'font-semibold'
          )}
        >
          {entry.title}
        </h3>
      </div>
    </motion.article>
  )
}

interface UpdatesListProps {
  entries: UpdateEntry[]
  readSlugs: string[]
  selectedSlug: string | null
  onSelect: (slug: string) => void
}

export function UpdatesList({ entries, readSlugs, selectedSlug, onSelect }: UpdatesListProps) {
  return (
    <div className="desk-list-panel">
      <Card variant="chrome">
        <div className="automations-list-scroll desk-pane-scroll min-h-0 flex-1">
          {entries.map((entry) => (
            <UpdateListItem
              key={entry.slug}
              entry={entry}
              readSlugs={readSlugs}
              isSelected={selectedSlug === entry.slug}
              onSelect={onSelect}
            />
          ))}
        </div>
      </Card>
    </div>
  )
}
