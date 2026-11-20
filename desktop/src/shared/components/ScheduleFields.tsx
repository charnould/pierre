import {
  formatScheduleSummary,
  type IntakeNotificationSchedule,
  isRecurrenceSchedule,
  type Month,
  MONTHS,
  type RecurrenceSchedule,
  switchScheduleFrequency,
  type Weekday,
  WEEKDAYS
} from '@pierre/shared/schedule'

import { SelectItems, type SelectOption } from '@/shared/components/SelectItems'
import { Button } from '@/shared/components/ui/button'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/shared/components/ui/field'
import { Input } from '@/shared/components/ui/input'
import { Select, SelectContent, SelectTrigger, SelectValue } from '@/shared/components/ui/select'

const RECURRENCE_FREQUENCY_ITEMS: SelectOption<RecurrenceSchedule['frequency']>[] = [
  { value: 'hourly', label: 'Toutes les heures' },
  { value: 'daily', label: 'Tous les jours' },
  { value: 'weekly', label: 'Toutes les semaines' },
  { value: 'monthly', label: 'Tous les mois' },
  { value: 'months', label: 'Mois au choix' }
]

const INTAKE_FREQUENCY_ITEMS: SelectOption<IntakeNotificationSchedule['frequency']>[] = [
  { value: 'none', label: 'Aucune notification' },
  { value: 'immediate', label: 'Immédiate à chaque réponse' },
  ...RECURRENCE_FREQUENCY_ITEMS
]

const MINUTE_ITEMS: SelectOption<string>[] = Array.from({ length: 60 }, (_, minute) => ({
  value: String(minute),
  label: `:${String(minute).padStart(2, '0')}`
}))

const MONTH_DAY_ITEMS: SelectOption<string>[] = Array.from({ length: 28 }, (_, index) => {
  const day = String(index + 1)
  return { value: day, label: `Le ${day}` }
})

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/

function formatTimeInput(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

type AutomationScheduleFieldsProps = {
  idPrefix: string
  allowImmediate?: false
  value: RecurrenceSchedule
  onChange: (next: RecurrenceSchedule) => void
}

type IntakeScheduleFieldsProps = {
  idPrefix: string
  allowImmediate: true
  value: IntakeNotificationSchedule
  onChange: (next: IntakeNotificationSchedule) => void
}

type ScheduleFieldsProps = AutomationScheduleFieldsProps | IntakeScheduleFieldsProps

export function ScheduleFields(props: ScheduleFieldsProps) {
  const { idPrefix, value } = props
  const frequencyItems = props.allowImmediate ? INTAKE_FREQUENCY_ITEMS : RECURRENCE_FREQUENCY_ITEMS

  function emitRecurrence(next: RecurrenceSchedule) {
    if (props.allowImmediate) {
      props.onChange(next)
    } else {
      props.onChange(next)
    }
  }

  function handleFrequencyChange(next: string | null) {
    if (!next) return
    if (props.allowImmediate) {
      props.onChange(
        switchScheduleFrequency(props.value, next as IntakeNotificationSchedule['frequency'])
      )
    } else {
      props.onChange(switchScheduleFrequency(props.value, next as RecurrenceSchedule['frequency']))
    }
  }

  function toggleWeekday(day: Weekday) {
    if (value.frequency !== 'weekly') return
    const selected = new Set<Weekday>(value.days)
    if (selected.has(day)) {
      if (selected.size <= 1) return
      selected.delete(day)
    } else {
      selected.add(day)
    }
    emitRecurrence({ ...value, days: [...selected].sort((a, b) => a - b) })
  }

  function toggleMonth(month: Month) {
    if (value.frequency !== 'months') return
    const selected = new Set<Month>(value.months)
    if (selected.has(month)) {
      if (selected.size <= 1) return
      selected.delete(month)
    } else {
      selected.add(month)
    }
    emitRecurrence({ ...value, months: [...selected].sort((a, b) => a - b) })
  }

  return (
    <FieldGroup>
      <Field orientation="horizontal">
        <FieldLabel htmlFor={`${idPrefix}-frequency`}>Fréquence</FieldLabel>
        <Select
          items={frequencyItems}
          value={value.frequency}
          onValueChange={handleFrequencyChange}
        >
          <SelectTrigger id={`${idPrefix}-frequency`} className="w-60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItems items={frequencyItems} />
          </SelectContent>
        </Select>
      </Field>

      {value.frequency === 'hourly' ? (
        <Field orientation="horizontal">
          <FieldLabel htmlFor={`${idPrefix}-minute`}>Minute</FieldLabel>
          <Select
            items={MINUTE_ITEMS}
            value={String(value.minute)}
            onValueChange={(next) => {
              if (!next) return
              const minute = Number.parseInt(next, 10)
              if (Number.isInteger(minute) && minute >= 0 && minute <= 59) {
                emitRecurrence({ ...value, minute })
              }
            }}
          >
            <SelectTrigger id={`${idPrefix}-minute`} className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItems items={MINUTE_ITEMS} />
            </SelectContent>
          </Select>
        </Field>
      ) : null}

      {value.frequency === 'weekly' ? (
        <Field orientation="horizontal">
          <FieldLabel>Jours</FieldLabel>
          <div role="group" aria-label="Jours de la semaine" className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map((day) => {
              const selected = value.days.includes(day.value)
              return (
                <Button
                  key={day.value}
                  type="button"
                  size="sm"
                  variant={selected ? 'secondary' : 'outline'}
                  aria-pressed={selected}
                  aria-label={day.label}
                  className="w-full"
                  onClick={() => toggleWeekday(day.value)}
                >
                  {day.shortLabel}
                </Button>
              )
            })}
          </div>
        </Field>
      ) : null}

      {value.frequency === 'months' ? (
        <Field orientation="horizontal">
          <FieldLabel>Mois</FieldLabel>
          <div
            role="group"
            aria-label="Mois de l’année"
            className="grid grid-cols-4 gap-1.5 sm:grid-cols-6"
          >
            {MONTHS.map((month) => {
              const selected = value.months.includes(month.value)
              return (
                <Button
                  key={month.value}
                  type="button"
                  size="sm"
                  variant={selected ? 'secondary' : 'outline'}
                  aria-pressed={selected}
                  aria-label={month.label}
                  className="w-full"
                  onClick={() => toggleMonth(month.value)}
                >
                  {month.shortLabel}
                </Button>
              )
            })}
          </div>
        </Field>
      ) : null}

      {value.frequency === 'monthly' || value.frequency === 'months' ? (
        <Field orientation="horizontal">
          <FieldLabel htmlFor={`${idPrefix}-day`}>Jour</FieldLabel>
          <Select
            items={MONTH_DAY_ITEMS}
            value={String(value.dayOfMonth)}
            onValueChange={(next) => {
              if (!next) return
              const dayOfMonth = Number.parseInt(next, 10)
              if (Number.isInteger(dayOfMonth) && dayOfMonth >= 1 && dayOfMonth <= 28) {
                emitRecurrence({ ...value, dayOfMonth })
              }
            }}
          >
            <SelectTrigger id={`${idPrefix}-day`} className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItems items={MONTH_DAY_ITEMS} />
            </SelectContent>
          </Select>
        </Field>
      ) : null}

      {value.frequency === 'daily' ||
      value.frequency === 'weekly' ||
      value.frequency === 'monthly' ||
      value.frequency === 'months' ? (
        <Field orientation="horizontal">
          <FieldLabel htmlFor={`${idPrefix}-time`}>Heure</FieldLabel>
          <Input
            id={`${idPrefix}-time`}
            aria-label="Heure"
            type="time"
            className="w-48"
            value={formatTimeInput(value.hour, value.minute)}
            onMouseDown={(event) => {
              event.preventDefault()
              event.currentTarget.focus()
            }}
            onChange={(event) => {
              const match = TIME_RE.exec(event.target.value)
              if (!match) return
              emitRecurrence({
                ...value,
                hour: Number(match[1]),
                minute: Number(match[2])
              })
            }}
          />
        </Field>
      ) : null}

      {isRecurrenceSchedule(value) ? (
        <FieldDescription>{formatScheduleSummary(value)}</FieldDescription>
      ) : null}
    </FieldGroup>
  )
}
