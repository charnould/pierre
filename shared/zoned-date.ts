export type ZonedDateParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
  weekday: number
}

const formatters = new Map<string, Intl.DateTimeFormat>()

function formatter(timeZone: string): Intl.DateTimeFormat {
  let value = formatters.get(timeZone)
  if (!value) {
    value = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
    formatters.set(timeZone, value)
  }
  return value
}

export function zonedDateParts(date: Date, timeZone: string): ZonedDateParts {
  const parts = formatter(timeZone).formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value)
  const year = value('year')
  const month = value('month')
  const day = value('day')
  return {
    year,
    month,
    day,
    hour: value('hour'),
    minute: value('minute'),
    second: value('second'),
    weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay()
  }
}
