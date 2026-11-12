/**
 * 速度階梯：在同一個速度連續彈對幾次才往上加，連續失誤就退一階。
 * 由使用者自己按「乾淨」或「有錯」，App 不假裝聽得懂。
 */

export interface LadderConfig {
  startBpm: number
  targetBpm: number
  step: number
  /** 同一速度要連續乾淨幾次才升階 */
  cleanReps: number
}

export interface LadderState {
  bpm: number
  /** 目前速度已連續乾淨幾次 */
  streak: number
  /** 連續失誤次數 */
  misses: number
  /** 已通過的最高速度，還沒通過任何一階時是 null */
  best: number | null
  /** 已在目標速度通過 */
  done: boolean
}

export const MISSES_TO_DROP = 2

export function startLadder(config: LadderConfig): LadderState {
  return { bpm: config.startBpm, streak: 0, misses: 0, best: null, done: false }
}

export function ladderStep(state: LadderState, config: LadderConfig, result: 'clean' | 'miss'): LadderState {
  if (result === 'miss') {
    const misses = state.misses + 1
    if (misses >= MISSES_TO_DROP) {
      return {
        ...state,
        bpm: Math.max(Math.min(config.startBpm, state.bpm), state.bpm - config.step),
        streak: 0,
        misses: 0,
        done: false,
      }
    }
    return { ...state, streak: 0, misses, done: false }
  }

  const streak = state.streak + 1
  if (streak < config.cleanReps) return { ...state, streak, misses: 0 }

  const best = Math.max(state.best ?? 0, state.bpm)
  if (state.bpm >= config.targetBpm) {
    return { bpm: state.bpm, streak: config.cleanReps, misses: 0, best, done: true }
  }
  return {
    bpm: Math.min(config.targetBpm, state.bpm + config.step),
    streak: 0,
    misses: 0,
    best,
    done: false,
  }
}
