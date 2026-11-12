import { reactive, watch } from 'vue'

/** 跟著裝置走、不屬於任何一首曲子的設定 */
export interface Preferences {
  rhythmSound: boolean
  pulseSound: boolean
  countInBeats: number
  ladderStep: number
  ladderCleanReps: number
}

const KEY = 'passage-practice:preferences'

const defaults: Preferences = {
  rhythmSound: true,
  pulseSound: false,
  countInBeats: 2,
  ladderStep: 4,
  ladderCleanReps: 3,
}

function load(): Preferences {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
  }
  catch {
    return { ...defaults }
  }
}

// 整個 App 共用同一份，放在模組層級
const preferences = reactive(load())

watch(preferences, (value) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(value))
  }
  catch {
    // 儲存空間被封鎖時，設定只在這次開啟期間有效
  }
})

export function usePreferences(): Preferences {
  return preferences
}
