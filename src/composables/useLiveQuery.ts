import { liveQuery } from 'dexie'
import { type ShallowRef, type WatchSource, onScopeDispose, shallowRef, watch } from 'vue'

/**
 * 把資料庫查詢變成會自動更新的 ref：資料一變，畫面就跟著變。
 * 查詢用到的響應式值（例如路由參數）要列在 deps，改變時會重新查詢。
 * 還沒查到結果前是 undefined，可以用來區分「載入中」與「沒有資料」。
 */
export function useLiveQuery<T>(
  query: () => Promise<T> | T,
  deps: WatchSource[] = [],
): Readonly<ShallowRef<T | undefined>> {
  const result = shallowRef<T>()
  let unsubscribe: (() => void) | undefined

  function subscribe() {
    unsubscribe?.()
    const subscription = liveQuery(query).subscribe({
      next: (value) => { result.value = value },
      error: (err) => { console.error('查詢失敗', err) },
    })
    unsubscribe = () => subscription.unsubscribe()
  }

  if (deps.length > 0) watch(deps, subscribe, { immediate: true })
  else subscribe()

  onScopeDispose(() => unsubscribe?.())

  return result
}
