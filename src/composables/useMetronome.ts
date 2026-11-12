import { type MaybeRefOrGetter, onScopeDispose, readonly, shallowRef, toValue, watch } from 'vue'
import { Metronome, type MetronomeSettings } from '@/audio/metronome'

export function useMetronome(settings: MaybeRefOrGetter<MetronomeSettings>) {
  const engine = new Metronome(toValue(settings))
  const playing = shallowRef(false)
  /** 目前亮起的是節奏型裡第幾個音，沒有在響時是 -1 */
  const activeIndex = shallowRef(-1)
  /** 預備拍還剩幾拍，0 代表已經開始 */
  const countIn = shallowRef(0)
  const error = shallowRef('')

  engine.onTick = (tick) => {
    if (tick === null) {
      activeIndex.value = -1
      countIn.value = 0
    }
    else if (tick.kind === 'countIn') {
      activeIndex.value = -1
      countIn.value = tick.remaining
    }
    else {
      countIn.value = 0
      activeIndex.value = tick.index
    }
  }

  watch(() => toValue(settings), next => engine.update(next))

  async function start() {
    error.value = ''
    try {
      await engine.start()
      playing.value = true
    }
    catch {
      error.value = '無法啟動聲音。請確認裝置沒有靜音，再按一次播放。'
    }
  }

  function stop() {
    engine.stop()
    playing.value = false
  }

  function toggle() {
    return playing.value ? stop() : start()
  }

  onScopeDispose(() => engine.dispose())

  return {
    playing: readonly(playing),
    activeIndex: readonly(activeIndex),
    countIn: readonly(countIn),
    error: readonly(error),
    start,
    stop,
    toggle,
  }
}
