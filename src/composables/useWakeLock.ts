import { onScopeDispose } from 'vue'

/**
 * 練習時讓螢幕保持開啟。平板放在譜架上、雙手在樂器上，螢幕不能自己關掉。
 * 不支援或沒有安全連線時就什麼都不做。
 */
export function useWakeLock() {
  let lock: WakeLockSentinel | null = null
  let wanted = false

  async function acquire() {
    if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return
    try {
      lock = await navigator.wakeLock.request('screen')
    }
    catch {
      lock = null
    }
  }

  // 切到別的 App 再回來時，系統會自動釋放，要重新取得
  function onVisibility() {
    if (wanted && document.visibilityState === 'visible') void acquire()
  }

  function enable() {
    wanted = true
    void acquire()
  }

  function disable() {
    wanted = false
    void lock?.release()
    lock = null
  }

  document.addEventListener('visibilitychange', onVisibility)
  onScopeDispose(() => {
    document.removeEventListener('visibilitychange', onVisibility)
    disable()
  })

  return { enable, disable }
}
