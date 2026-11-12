<script setup lang="ts">
import { onMounted, shallowRef } from 'vue'
import BaseDialog from '@/components/BaseDialog.vue'
import { useMetronome } from '@/composables/useMetronome'
import { usePracticeSession } from '@/composables/usePracticeSession'
import { usePreferences } from '@/composables/usePreferences'
import { useWakeLock } from '@/composables/useWakeLock'
import { describeSaveError } from '@/data/errors'
import { patternTitle } from '@/domain/describe'
import type { ColdTest, Rating } from '@/domain/schedule'
import type { Passage } from '@/domain/types'
import ColdTestCard from './ColdTestCard.vue'
import FinishForm from './FinishForm.vue'
import LadderPanel from './LadderPanel.vue'
import PatternPicker from './PatternPicker.vue'
import RhythmStrip from './RhythmStrip.vue'
import ScoreSheet from './ScoreSheet.vue'
import TempoDial from './TempoDial.vue'

const props = defineProps<{
  passage: Passage
  pieceTitle: string
}>()

const emit = defineEmits<{
  leave: []
}>()

const prefs = usePreferences()
// 這個元件以樂段 id 當 key，換樂段時整個重建，所以可以直接用一開始的資料
const session = usePracticeSession(props.passage)
const {
  groupSize,
  patternId,
  tempoMode,
  bpm,
  phase,
  coldTest,
  pattern,
  cycle,
  ladderOn,
  ladder,
  ladderConfig,
} = session

const metronome = useMetronome(session.metronomeSettings)
const wakeLock = useWakeLock()
onMounted(() => wakeLock.enable())

function answerColdTest(result: ColdTest | null) {
  metronome.stop()
  session.answerColdTest(result)
}

const finishing = shallowRef(false)
const saving = shallowRef(false)
const saveError = shallowRef('')

function openFinish() {
  metronome.stop()
  saveError.value = ''
  finishing.value = true
}

async function save(result: { rating: Rating, note: string }) {
  saving.value = true
  try {
    await session.finish(result.rating, result.note)
    emit('leave')
  }
  catch (err) {
    saveError.value = describeSaveError(err, '儲存紀錄')
    saving.value = false
  }
}

function leave() {
  metronome.stop()
  emit('leave')
}
</script>

<template>
  <div class="desk">
    <header class="desk-bar">
      <button type="button" class="btn btn-quiet desk-back" @click="leave">
        返回
      </button>
      <div class="desk-title">
        <p class="soft small desk-piece">
          {{ props.pieceTitle }}
        </p>
        <h1 class="desk-name">
          {{ props.passage.title }}
        </h1>
      </div>
      <p v-if="props.passage.lastNote || props.passage.focus" class="desk-focus small">
        <span v-if="props.passage.lastNote" class="desk-note">上次留下：{{ props.passage.lastNote }}</span>
        <span v-if="props.passage.focus">注意：{{ props.passage.focus }}</span>
      </p>
      <button type="button" class="btn btn-primary desk-finish" @click="openFinish">
        結束並記錄
      </button>
    </header>

    <div class="desk-body">
      <ScoreSheet class="desk-score" :crops="props.passage.crops" />

      <div class="desk-strip">
        <p class="desk-pattern">
          <span class="desk-pattern-name">{{ patternTitle(pattern) }}</span>
          <span class="soft small">每組 <span class="figure">{{ groupSize }}</span> 個音</span>
        </p>
        <RhythmStrip :pattern="pattern" :active-index="metronome.activeIndex.value" :count-in="metronome.countIn.value" />
      </div>

      <aside class="desk-controls" aria-label="練習控制">
        <ColdTestCard
          v-if="phase === 'cold'"
          :target-bpm="props.passage.targetBpm"
          :playing="metronome.playing.value"
          @toggle="metronome.toggle"
          @result="answerColdTest"
          @skip="answerColdTest(null)"
        />

        <template v-else>
          <div class="desk-transport">
            <button
              type="button"
              class="desk-play"
              :class="{ 'desk-play-on': metronome.playing.value }"
              :aria-label="metronome.playing.value ? '停止' : '開始'"
              @click="metronome.toggle"
            >
              {{ metronome.playing.value ? '停' : '開始' }}
            </button>
            <TempoDial v-model="bpm" :target-bpm="props.passage.targetBpm" :fastest-bpm="cycle.fastestEquivalentBpm" />
          </div>
          <p v-if="metronome.error.value" class="desk-error" role="alert">
            {{ metronome.error.value }}
          </p>

          <div class="desk-sounds small">
            <label class="desk-sound">
              <input v-model="prefs.rhythmSound" type="checkbox" class="desk-checkbox">
              每個音都響
            </label>
            <label class="desk-sound">
              <input v-model="prefs.pulseSound" type="checkbox" class="desk-checkbox">
              另外打拍點
            </label>
          </div>

          <hr class="desk-rule">
          <PatternPicker v-model:group-size="groupSize" v-model:pattern-id="patternId" v-model:tempo-mode="tempoMode" />

          <hr class="desk-rule">
          <LadderPanel v-model:enabled="ladderOn" :config="ladderConfig" :state="ladder" @result="session.reportLadder" />
        </template>
      </aside>
    </div>

    <BaseDialog v-model:open="finishing" title="記錄這次練習">
      <FinishForm
        :interval-days="props.passage.intervalDays"
        :cold-test="coldTest"
        :busy="saving"
        :error="saveError"
        @save="save"
        @cancel="finishing = false"
      />
    </BaseDialog>
  </div>
</template>

<style scoped>
.desk {
  height: 100dvh;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
}

.desk-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem 1rem;
  padding: 0.5rem 1rem;
  background: var(--paper);
  border-bottom: 1px solid var(--line);
}

.desk-back {
  padding-inline: 0.5em;
}

.desk-title {
  flex: 1 1 10rem;
  min-width: 0;
}

.desk-piece {
  line-height: 1.3;
}

.desk-name {
  font-size: var(--step-1);
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.desk-focus {
  display: grid;
  flex: 0 1 auto;
  max-width: 22rem;
  padding: 0.3rem 0.7rem;
  border-left: 3px solid var(--felt);
  line-height: 1.4;
}

.desk-note {
  font-weight: 600;
}

/* 直放：譜面、節奏條、控制區由上往下，只有控制區與譜面各自捲動 */
.desk-body {
  min-height: 0;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  grid-template-columns: minmax(0, 1fr);
}

.desk-score {
  max-height: 44dvh;
  padding: 0.75rem 0.75rem 0;
}

.desk-strip {
  display: grid;
  gap: 0.35rem;
  padding: 0.75rem;
}

.desk-pattern {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
}

.desk-pattern-name {
  font-size: var(--step-1);
  font-weight: 700;
}

.desk-controls {
  min-height: 0;
  overflow-y: auto;
  display: grid;
  align-content: start;
  gap: 1rem;
  padding: 0.25rem 0.75rem 2rem;
}

.desk-transport {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: start;
  gap: 1rem;
}

.desk-play {
  width: 5.5rem;
  height: 5.5rem;
  border: 0;
  border-radius: 50%;
  background: var(--felt);
  color: #fff;
  font-size: var(--step-1);
  font-weight: 700;
  letter-spacing: 0.05em;
  cursor: pointer;
  touch-action: manipulation;
  box-shadow: 0 6px 0 var(--felt-deep);
}

.desk-play:active,
.desk-play-on {
  transform: translateY(4px);
  box-shadow: 0 2px 0 var(--felt-deep);
}

.desk-play-on {
  background: var(--ink);
  box-shadow: 0 2px 0 #000;
}

.desk-error {
  color: var(--felt);
  font-weight: 600;
}

.desk-sounds {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1.25rem;
}

.desk-sound {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2.5rem;
  cursor: pointer;
}

.desk-checkbox {
  width: 1.4rem;
  height: 1.4rem;
  margin: 0;
  accent-color: var(--ink);
}

.desk-rule {
  width: 100%;
  margin: 0;
  border: 0;
  border-top: 1px solid var(--line);
}

/* 橫放：譜面在左、控制在右，節奏條固定在譜面下方 */
@media (min-width: 60rem) and (orientation: landscape) {
  .desk-body {
    grid-template-columns: minmax(0, 1fr) 24rem;
    grid-template-rows: minmax(0, 1fr) auto;
  }

  .desk-score {
    grid-column: 1;
    grid-row: 1;
    max-height: none;
    padding: 1rem 1rem 0;
  }

  .desk-strip {
    grid-column: 1;
    grid-row: 2;
    padding: 0.75rem 1rem 1rem;
  }

  .desk-controls {
    grid-column: 2;
    grid-row: 1 / span 2;
    padding: 1rem 1rem 2rem;
    background: color-mix(in srgb, var(--paper) 55%, var(--ground));
    border-left: 1px solid var(--line);
  }
}
</style>
