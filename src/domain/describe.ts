/** 把內部狀態轉成畫面上的文字 */
import { type GroupSize, type RhythmPattern, findPattern } from './rhythm'
import { daysBetween } from './schedule'

export function patternTitle(pattern: RhythmPattern): string {
  return pattern.family === 'split' ? `重音分組 ${pattern.label}` : pattern.label
}

export function patternTitleOf(groupSize: GroupSize, patternId: string): string {
  return patternTitle(findPattern(groupSize, patternId))
}

export function dueText(due: string, today: string): string {
  const diff = daysBetween(today, due)
  if (diff < 0) return `逾期 ${-diff} 天`
  if (diff === 0) return '今天'
  if (diff === 1) return '明天'
  return `${diff} 天後`
}

export function intervalText(days: number): string {
  return days === 1 ? '明天' : `${days} 天後`
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

export function longDate(date: Date): string {
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日 星期${WEEKDAYS[date.getDay()]}`
}

export function clampBpm(value: number): number {
  if (!Number.isFinite(value)) return 60
  return Math.min(240, Math.max(20, Math.round(value)))
}
