import { SmilePlus } from 'lucide-react'
import { useState } from 'react'

import { canBoostActivity, currentActivityBoost } from '@/features/activity/lib/activity-boost'
import {
  ACTIVITY_BOOST_EMOJIS,
  ACTIVITY_BOOST_QUICK_EMOJIS,
  type ActivityBoostEmoji
} from '@/features/activity/lib/activity-boosts'
import { mentionsToBoosts } from '@/features/activity/lib/notification-types'
import { Button } from '@/shared/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover'
import { cn } from '@/shared/lib/utils'
import type { Activite } from '@/shared/types/activites'

interface Props {
  activity: Activite
  currentUser: string
  onBoost: (emoji: ActivityBoostEmoji | null) => void | Promise<void>
  disabled?: boolean
}

function uniqueBoostEmojis(boosts: Record<string, string>): string[] {
  return [...new Set(Object.values(boosts).filter(Boolean))]
}

function BoostEmojiButton({
  emoji,
  selected,
  onSelect
}: {
  emoji: ActivityBoostEmoji
  selected: boolean
  onSelect: (emoji: ActivityBoostEmoji) => void
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      className={cn('text-xl leading-none', selected && 'bg-muted')}
      aria-label={`Boost ${emoji}`}
      aria-pressed={selected}
      onClick={() => onSelect(emoji)}
    >
      {emoji}
    </Button>
  )
}

export function ActivityBoostControl({ activity, currentUser, onBoost, disabled }: Props) {
  const [open, setOpen] = useState(false)
  const eligible = canBoostActivity(activity, currentUser)
  const mine = currentActivityBoost(activity.mentions, currentUser)
  const others = uniqueBoostEmojis(mentionsToBoosts(activity.mentions)).filter(
    (emoji) => emoji !== mine
  )

  if (!eligible && others.length === 0 && !mine) return null

  function selectEmoji(emoji: ActivityBoostEmoji) {
    const next = mine === emoji ? null : emoji
    void onBoost(next)
    setOpen(false)
  }

  function clearBoost() {
    void onBoost(null)
    setOpen(false)
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {others.length > 0 ? (
        <p className="pierre-meta leading-4" aria-label="Boosts">
          {others.join(' ')}
        </p>
      ) : null}
      {eligible ? (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            disabled={disabled}
            aria-label={mine ? `Modifier le boost ${mine}` : 'Booster'}
            aria-pressed={Boolean(mine)}
            render={<Button type="button" variant="outline" size="xs" className="w-fit" />}
          >
            {mine ?? <SmilePlus aria-hidden />}
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 gap-2 p-2">
            <div className="flex flex-wrap gap-1">
              {ACTIVITY_BOOST_QUICK_EMOJIS.map((emoji) => (
                <BoostEmojiButton
                  key={`quick-${emoji}`}
                  emoji={emoji}
                  selected={mine === emoji}
                  onSelect={selectEmoji}
                />
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {ACTIVITY_BOOST_EMOJIS.map((emoji) => (
                <BoostEmojiButton
                  key={emoji}
                  emoji={emoji}
                  selected={mine === emoji}
                  onSelect={selectEmoji}
                />
              ))}
            </div>
            {mine ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground justify-start"
                onClick={clearBoost}
              >
                Retirer le boost
              </Button>
            ) : null}
          </PopoverContent>
        </Popover>
      ) : mine ? (
        <p className="pierre-meta leading-4">{mine}</p>
      ) : null}
    </div>
  )
}
