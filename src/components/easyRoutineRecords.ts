export interface RoutineLogCounts {
  not_started: number
  running: number
  done: number
  panic: number
  other: number
}

export interface EasyRoutineRecord {
  routine_id: string
  name: string
  owner: string
  status: string
  success_count: number
  failure_count: number
  expires_at: number
  updated_at: number
  lease_active: boolean
  retained_logs: number
  latest_panic_at: number
  log_counts: RoutineLogCounts
}

export interface EasyRoutineLog {
  id: string
  routine_id: string
  name: string
  owner: string
  action: string
  status: string
  log: string
  created_at: number
}

export interface RoutineSnapshot<Record> {
  items: Record[]
  fetched_at: number
}

export const routineStatuses = ['panic', 'done', 'not_started', 'running'] as const

export const routineStatusKeys = {
  not_started: 'routineNotStarted',
  running: 'routineRunning',
  done: 'routineDone',
  panic: 'routinePanic'
} as const

export function routineStatusColor(status: string) {
  switch (status) {
    case 'panic': return 'error'
    case 'running': return 'info'
    case 'done': return 'success'
    default: return 'neutral'
  }
}

export function filterRoutines(records: EasyRoutineRecord[], search: string, status: string, hasPanic: boolean): EasyRoutineRecord[] {
  const terms = search.trim().toLowerCase().split(/\s+/).filter(Boolean)
  return records.filter(record => {
    if (status && record.status !== status) return false
    if (hasPanic && record.log_counts.panic === 0) return false
    const text = `${record.name} ${record.routine_id} ${record.owner} ${record.status}`.toLowerCase()
    return terms.every(term => text.includes(term))
  })
}

export function formatRoutineTime(seconds: number, locale: string): string {
  if (!seconds) return '-'
  const date = new Date(seconds * 1000)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'medium' }).format(date)
}