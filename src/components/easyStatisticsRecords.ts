import { CalendarDate, parseDate } from '@internationalized/date'
import { getISOWeek, getISOWeekYear, parseISO } from 'date-fns'

export type StatisticsInterval = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR' | 'FOREVER'

export interface StatisticsDimension {
  order_fields: string[]
  group_intervals: StatisticsInterval[]
  clear_after: number
  count: number
}

export interface StatisticsDefinition {
  name: string
  fields: string[]
  dimensions: StatisticsDimension[]
  update_interval: number
}

export interface StatisticsField {
  name: string
  value: string
}

export interface StatisticsRecord {
  name: string
  order_fields: StatisticsField[]
  group_interval: StatisticsInterval
  grouped_time: string
  last_update_time: string
  counter: number
}

export interface StatisticsListSnapshot {
  items: StatisticsDefinition[]
  max_query_buckets: number
  fetched_at: number
}

export interface StatisticsRecordsSnapshot {
  items: StatisticsRecord[]
  fetched_at: number
}

export interface StatisticsBatchCount {
  count: number
  fetched_at: number
}

export interface StatisticsQueryInput {
  name: string
  fields: StatisticsField[]
  group_interval: StatisticsInterval
  start?: string
  end?: string
}

export function filterStatistics(items: StatisticsDefinition[], search: string) {
  const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean)
  return items.filter(item => {
    const text = `${item.name} ${item.fields.join(' ')} ${item.dimensions.flatMap(dimension => dimension.group_intervals).join(' ')}`.toLowerCase()
    return terms.every(term => text.includes(term))
  })
}

export function statisticsBucketDate(interval: StatisticsInterval, value: string) {
  if (!value) return undefined
  try {
    switch (interval) {
      case 'DAY': return parseDate(value)
      case 'MONTH': return parseDate(`${value}-01`)
      case 'YEAR': return parseDate(`${value}-01-01`)
      case 'WEEK': {
        const parsed = parseISO(`${value}-1`)
        if (Number.isNaN(parsed.getTime())) return undefined
        const date = new CalendarDate(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate())
        return currentStatisticsBucket('WEEK', date.toDate('UTC')) === value ? date : undefined
      }
      case 'FOREVER': return undefined
    }
  } catch {
    return undefined
  }
}

export function formatStatisticsBucket(interval: StatisticsInterval, value: string, locale: string) {
  const date = statisticsBucketDate(interval, value)
  if (!date || interval === 'WEEK') return value
  const format: Intl.DateTimeFormatOptions = interval === 'YEAR' ? { year: 'numeric' }
    : interval === 'MONTH' ? { year: 'numeric', month: 'long' } : { dateStyle: 'medium' }
  return new Intl.DateTimeFormat(locale, { ...format, calendar: 'gregory', timeZone: 'UTC' }).format(date.toDate('UTC'))
}

export function currentStatisticsBucket(interval: StatisticsInterval, now = new Date()) {
  const date = now.toISOString()
  switch (interval) {
    case 'DAY': return date.slice(0, 10)
    case 'MONTH': return date.slice(0, 7)
    case 'YEAR': return date.slice(0, 4)
    case 'WEEK': {
      const calendarDate = new Date(now)
      calendarDate.setFullYear(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
      calendarDate.setHours(12, 0, 0, 0)
      return `${String(getISOWeekYear(calendarDate)).padStart(4, '0')}-W${String(getISOWeek(calendarDate)).padStart(2, '0')}`
    }
    case 'FOREVER': return ''
  }
}

export function formatStatisticsDuration(nanoseconds: number, locale: string) {
  const seconds = nanoseconds / 1_000_000_000
  const [divisor, unit] = seconds >= 86_400 ? [86_400, 'day']
    : seconds >= 3_600 ? [3_600, 'hour']
    : seconds >= 60 ? [60, 'minute'] : [1, 'second']
  return new Intl.NumberFormat(locale, { style: 'unit', unit, unitDisplay: 'short', maximumFractionDigits: 2 }).format(seconds / divisor)
}

export function formatStatisticsTime(value: string, locale: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-'
    : new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(date)
}