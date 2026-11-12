/**
 * 複習排程：決定一個樂段下次什麼時候再出現在「今日」。
 * 冷啟動測試（當天第一次直接用目標速度彈原節奏）是最可信的依據，
 * 沒通過就隔天再來；只靠自評的話，間隔最多拉到三天。
 */

export type Rating = 'smooth' | 'stuck' | 'slower'
export type ColdTest = 'pass' | 'fail'

export interface Schedule {
  /** 下次該練的日期，YYYY-MM-DD（本地時間） */
  due: string
  /** 目前的複習間隔，新樂段為 0 */
  intervalDays: number
}

export const MAX_INTERVAL = 30
export const MAX_INTERVAL_WITHOUT_COLD_TEST = 3

export function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number) as [number, number, number]
  return toDateKey(new Date(y, m - 1, d + days))
}

export function daysBetween(fromKey: string, toKey: string): number {
  const parse = (k: string) => {
    const [y, m, d] = k.split('-').map(Number) as [number, number, number]
    return Date.UTC(y, m - 1, d)
  }
  return Math.round((parse(toKey) - parse(fromKey)) / 86_400_000)
}

export function newSchedule(today: string): Schedule {
  return { due: today, intervalDays: 0 }
}

export function isDue(schedule: Schedule, today: string): boolean {
  return schedule.due <= today
}

export function nextInterval(prev: number, rating: Rating, coldTest: ColdTest | null): number {
  if (coldTest === 'fail') return 1
  if (coldTest === 'pass') {
    if (rating === 'smooth') return Math.min(MAX_INTERVAL, Math.max(2, prev * 2))
    return Math.max(1, prev)
  }
  if (rating === 'smooth') return Math.min(MAX_INTERVAL_WITHOUT_COLD_TEST, Math.max(1, prev + 1))
  return 1
}

export function nextSchedule(prev: Schedule, rating: Rating, coldTest: ColdTest | null, today: string): Schedule {
  const intervalDays = nextInterval(prev.intervalDays, rating, coldTest)
  return { due: addDays(today, intervalDays), intervalDays }
}
