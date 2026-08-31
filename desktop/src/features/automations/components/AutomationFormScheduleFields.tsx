import { ChevronDownIcon } from 'lucide-react'
import { useEffect } from 'react'

import { SelectItems } from '@/shared/components/SelectItems'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/shared/components/ui/dropdown-menu'
import { Field, FieldGroup, FieldLabel } from '@/shared/components/ui/field'
import { Input } from '@/shared/components/ui/input'
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/shared/components/ui/select'

import {
  allDailyDays,
  capitalizeDay,
  DAYS_OF_WEEK,
  encodeDailyDays,
  encodeYearlyDay,
  formatDailyDaysLabel,
  MONTHS_OF_YEAR,
  defaultFrequencyDay,
  normalizeFrequencyDay,
  parseDailyDays,
  parseYearlyDay,
  weekdayDailyDays
} from '../lib/automation-form-schedule'

const FREQUENCY_ITEMS = [
  { label: 'Quotidien', value: 'daily' },
  { label: 'Hebdomadaire', value: 'weekly' },
  { label: 'Mensuel', value: 'monthly' },
  { label: 'Annuel', value: 'yearly' }
]

const WEEKDAY_ITEMS = DAYS_OF_WEEK.map((day) => ({ label: capitalizeDay(day), value: day }))

const MONTH_DAY_ITEMS = Array.from({ length: 28 }, (_, i) => String(i + 1)).map((day) => ({
  label: `Le ${day}`,
  value: day
}))

const MONTH_ITEMS = MONTHS_OF_YEAR.map((month) => ({
  label: month.label.charAt(0).toUpperCase() + month.label.slice(1),
  value: month.value
}))

function DailyActivityField({
  id,
  value,
  onValueChange
}: {
  id: string
  value: string[]
  onValueChange: (days: string[]) => void
}) {
  function toggleDay(day: (typeof DAYS_OF_WEEK)[number]) {
    const selected = new Set(value)
    if (selected.has(day)) {
      if (selected.size <= 1) return
      selected.delete(day)
    } else {
      selected.add(day)
    }
    onValueChange(DAYS_OF_WEEK.filter((d) => selected.has(d)))
  }

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            size="sm"
            className="w-48 justify-between"
          />
        }
      >
        <span className="truncate">{formatDailyDaysLabel(encodeDailyDays(value))}</span>
        <ChevronDownIcon className="text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Raccourcis</DropdownMenuLabel>
          <DropdownMenuItem closeOnClick onClick={() => onValueChange(allDailyDays())}>
            Tous les jours
          </DropdownMenuItem>
          <DropdownMenuItem closeOnClick onClick={() => onValueChange(weekdayDailyDays())}>
            Lun–ven. (hors week-end)
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Jours</DropdownMenuLabel>
          {DAYS_OF_WEEK.map((day) => (
            <DropdownMenuCheckboxItem
              key={day}
              checked={value.includes(day)}
              closeOnClick={false}
              onCheckedChange={() => toggleDay(day)}
            >
              {capitalizeDay(day)}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface AutomationFormScheduleFieldsProps {
  frequency: string
  frequencyDay: string | undefined
  frequencyTime: string
  onFrequencyChange: (frequency: string) => void
  onFrequencyDayChange: (day: string) => void
  onFrequencyTimeChange: (time: string) => void
}

export function AutomationFormScheduleFields({
  frequency,
  frequencyDay,
  frequencyTime,
  onFrequencyChange,
  onFrequencyDayChange,
  onFrequencyTimeChange
}: AutomationFormScheduleFieldsProps) {
  const yearlyParts = parseYearlyDay(frequency === 'yearly' ? frequencyDay : undefined)
  const dailyDays = parseDailyDays(frequency === 'daily' ? frequencyDay : undefined)

  useEffect(() => {
    if (frequency !== 'daily') return
    const normalized = encodeDailyDays(parseDailyDays(frequencyDay))
    if (frequencyDay !== normalized) {
      onFrequencyDayChange(normalized)
    }
  }, [frequency, frequencyDay, onFrequencyDayChange])

  function handleFrequencyChange(nextFrequency: string | null) {
    if (!nextFrequency) return
    onFrequencyChange(nextFrequency)
    const nextDay =
      nextFrequency === 'daily' && frequency !== 'daily'
        ? defaultFrequencyDay('daily')
        : (normalizeFrequencyDay(nextFrequency, frequencyDay) ?? defaultFrequencyDay(nextFrequency))
    if (nextDay) onFrequencyDayChange(nextDay)
  }

  return (
    <FieldGroup>
      <Field orientation="horizontal">
        <FieldLabel htmlFor="auto-frequency">Périodicité</FieldLabel>
        <Select items={FREQUENCY_ITEMS} value={frequency} onValueChange={handleFrequencyChange}>
          <SelectTrigger id="auto-frequency" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItems items={FREQUENCY_ITEMS} />
          </SelectContent>
        </Select>
      </Field>

      {frequency === 'daily' ? (
        <Field orientation="horizontal">
          <FieldLabel htmlFor="auto-frequency-daily">Activité</FieldLabel>
          <DailyActivityField
            id="auto-frequency-daily"
            value={dailyDays}
            onValueChange={(days) => onFrequencyDayChange(encodeDailyDays(days))}
          />
        </Field>
      ) : null}

      {frequency === 'weekly' && frequencyDay ? (
        <Field orientation="horizontal">
          <FieldLabel htmlFor="auto-frequency-weekly">Activité</FieldLabel>
          <Select
            items={WEEKDAY_ITEMS}
            value={frequencyDay}
            onValueChange={(day) => day && onFrequencyDayChange(day)}
          >
            <SelectTrigger id="auto-frequency-weekly" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItems items={WEEKDAY_ITEMS} />
            </SelectContent>
          </Select>
        </Field>
      ) : null}

      {frequency === 'monthly' && frequencyDay ? (
        <Field orientation="horizontal">
          <FieldLabel htmlFor="auto-frequency-monthly">Jour</FieldLabel>
          <Select
            items={MONTH_DAY_ITEMS}
            value={frequencyDay}
            onValueChange={(day) => day && onFrequencyDayChange(day)}
          >
            <SelectTrigger id="auto-frequency-monthly" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItems items={MONTH_DAY_ITEMS} />
            </SelectContent>
          </Select>
        </Field>
      ) : null}

      {frequency === 'yearly' ? (
        <Field orientation="horizontal">
          <FieldLabel htmlFor="auto-frequency-yearly-day">Date</FieldLabel>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              items={MONTH_DAY_ITEMS}
              value={yearlyParts.day}
              onValueChange={(day) => {
                if (!day) return
                onFrequencyDayChange(encodeYearlyDay(day, yearlyParts.month))
              }}
            >
              <SelectTrigger id="auto-frequency-yearly-day" className="w-24">
                <SelectValue className="tabular-nums" />
              </SelectTrigger>
              <SelectContent>
                <SelectItems items={MONTH_DAY_ITEMS} />
              </SelectContent>
            </Select>
            <Select
              items={MONTH_ITEMS}
              value={yearlyParts.month}
              onValueChange={(month) => {
                if (!month) return
                onFrequencyDayChange(encodeYearlyDay(yearlyParts.day, month))
              }}
            >
              <SelectTrigger id="auto-frequency-yearly-month" aria-label="Mois" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItems items={MONTH_ITEMS} />
              </SelectContent>
            </Select>
          </div>
        </Field>
      ) : null}

      <Field orientation="horizontal">
        <FieldLabel htmlFor="auto-frequency-time">Vers</FieldLabel>
        <Input
          id="auto-frequency-time"
          aria-label="Heure"
          type="time"
          className="w-48"
          value={frequencyTime}
          onMouseDown={(e) => {
            e.preventDefault()
            e.currentTarget.focus()
          }}
          onChange={(e) => onFrequencyTimeChange(e.target.value)}
        />
      </Field>
    </FieldGroup>
  )
}

export { normalizeFrequencyDay }
