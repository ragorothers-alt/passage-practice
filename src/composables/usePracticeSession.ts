import { computed, onScopeDispose, shallowRef, watch } from 'vue'
import type { MetronomeSettings } from '@/audio/metronome'
import { repo } from '@/data/repo'
import { type LadderConfig, type LadderState, ladderStep, startLadder } from '@/domain/ladder'
import { type GroupSize, type TempoMode, buildCycle, findPattern } from '@/domain/rhythm'
import { type ColdTest, type Rating, toDateKey } from '@/domain/schedule'
import type { Passage } from '@/domain/types'
import { usePreferences } from './usePreferences'

/**
 * 一次練習的全部狀態：現在用哪個節奏型、多快、階梯走到哪、冷啟動測試的結果。
 * 節奏型與速度一有變動就存回樂段，所以沒有按「結束並記錄」就離開，下次也接得上。
 */
export function usePracticeSession(passage: Passage) {
  const prefs = usePreferences()

  const groupSize = shallowRef<GroupSize>(passage.groupSize)
  const patternId = shallowRef(findPattern(passage.groupSize, passage.patternId).id)
  const tempoMode = shallowRef<TempoMode>(passage.tempoMode)
  const bpm = shallowRef(passage.currentBpm)

  const startedAt = Date.now()
  const bpmStart = passage.currentBpm

  // 冷啟動測試：以前練過、而且今天還沒練，才需要
  const practicedBefore = passage.lastPracticedAt !== null
  const practicedToday = practicedBefore && toDateKey(new Date(passage.lastPracticedAt!)) === toDateKey(new Date())
  const phase = shallowRef<'cold' | 'practice'>(practicedBefore && !practicedToday ? 'cold' : 'practice')
  const coldTest = shallowRef<ColdTest | null>(null)

  function answerColdTest(result: ColdTest | null) {
    coldTest.value = result
    phase.value = 'practice'
  }

  // 冷啟動時固定用目標速度的原節奏，不動到使用者平常的設定
  const pattern = computed(() =>
    findPattern(groupSize.value, phase.value === 'cold' ? 'even' : patternId.value),
  )
  const activeBpm = computed(() => (phase.value === 'cold' ? passage.targetBpm : bpm.value))
  const cycle = computed(() => buildCycle(pattern.value, activeBpm.value, tempoMode.value))

  const metronomeSettings = computed<MetronomeSettings>(() => ({
    pattern: pattern.value,
    bpm: activeBpm.value,
    mode: tempoMode.value,
    rhythmSound: prefs.rhythmSound,
    pulseSound: prefs.pulseSound,
    countInBeats: prefs.countInBeats,
  }))

  // 速度階梯
  const ladderOn = shallowRef(false)
  const ladderStart = shallowRef(bpm.value)
  const ladder = shallowRef<LadderState | null>(null)
  const ladderConfig = computed<LadderConfig>(() => ({
    startBpm: ladderStart.value,
    targetBpm: passage.targetBpm,
    step: prefs.ladderStep,
    cleanReps: prefs.ladderCleanReps,
  }))

  watch(ladderOn, (on) => {
    if (on) {
      ladderStart.value = Math.min(bpm.value, passage.targetBpm)
      bpm.value = ladderStart.value
      ladder.value = startLadder(ladderConfig.value)
    }
    else {
      ladder.value = null
    }
  })

  function reportLadder(result: 'clean' | 'miss') {
    if (!ladder.value) return
    ladder.value = ladderStep(ladder.value, ladderConfig.value, result)
    bpm.value = ladder.value.bpm
  }

  // 階梯進行中手動改速度：從新的速度重新累計
  watch(bpm, (value) => {
    const state = ladder.value
    if (state && state.bpm !== value) {
      ladder.value = { ...state, bpm: value, streak: 0, misses: 0, done: false }
    }
  })

  // 自動存回樂段
  let saveTimer: ReturnType<typeof setTimeout> | undefined
  let dirty = false

  function persist() {
    clearTimeout(saveTimer)
    if (!dirty) return
    dirty = false
    void repo.updatePassage(passage.id, {
      groupSize: groupSize.value,
      patternId: patternId.value,
      tempoMode: tempoMode.value,
      currentBpm: bpm.value,
    })
  }

  watch([groupSize, patternId, tempoMode, bpm], () => {
    dirty = true
    clearTimeout(saveTimer)
    saveTimer = setTimeout(persist, 500)
  })

  onScopeDispose(persist)

  async function finish(rating: Rating, note: string) {
    clearTimeout(saveTimer)
    dirty = false
    await repo.recordSession(passage.id, {
      startedAt,
      durationSec: Math.round((Date.now() - startedAt) / 1000),
      patternId: patternId.value,
      groupSize: groupSize.value,
      tempoMode: tempoMode.value,
      bpmStart,
      bpmEnd: bpm.value,
      rating,
      coldTest: coldTest.value,
      note,
    })
  }

  return {
    groupSize,
    patternId,
    tempoMode,
    bpm,
    phase,
    coldTest,
    answerColdTest,
    pattern,
    cycle,
    metronomeSettings,
    ladderOn,
    ladder,
    ladderConfig,
    reportLadder,
    finish,
  }
}
