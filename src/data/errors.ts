/**
 * 把儲存失敗的原因講清楚：只有真的確定是空間不足時才這樣說，
 * 其他情況附上錯誤名稱，並把完整錯誤留在主控台方便追查。
 */
export function describeSaveError(err: unknown, what: string): string {
  console.error(`${what}失敗`, err)
  const names = new Set<string>()
  let current: unknown = err
  while (current instanceof Error && names.size < 5) {
    names.add(current.name)
    current = (current as { inner?: unknown }).inner ?? current.cause
  }
  if (names.has('QuotaExceededError')) {
    return `${what}失敗：裝置的儲存空間不足。請清出空間後再試一次。`
  }
  const detail = [...names].join(' / ') || '未知錯誤'
  return `${what}失敗（${detail}）。請再試一次；如果一直發生，請先到設定匯出備份。`
}
