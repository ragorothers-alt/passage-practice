<script setup lang="ts">
import { computed } from 'vue'
import { clampBpm } from '@/domain/describe'

const props = defineProps<{
  targetBpm: number
  /** 最短的音換算回原節奏的速度 */
  fastestBpm: number
  disabled?: boolean
}>()

const bpm = defineModel<number>({ required: true })

const steps = [-5, -1, 1, 5]

function nudge(delta: number) {
  bpm.value = clampBpm(bpm.value + delta)
}

function onInput(event: Event) {
  const el = event.target as HTMLInputElement
  bpm.value = clampBpm(Number(el.value))
  el.value = String(bpm.value)
}

const fastest = computed(() => Math.round(props.fastestBpm))
const showFastest = computed(() => Math.abs(props.fastestBpm - bpm.value) >= 1)
const stepLabel = (delta: number) => (delta > 0 ? `+${delta}` : `−${-delta}`)
</script>

<template>
  <div class="tempo">
    <div class="tempo-main">
      <input
        class="tempo-num figure"
        type="number"
        inputmode="numeric"
        min="20"
        max="240"
        :value="bpm"
        :disabled="props.disabled"
        aria-label="速度，每分鐘幾拍"
        @change="onInput"
      >
      <p class="tempo-meta small">
        <span>每分鐘幾拍</span>
        <span>一組音算一拍</span>
        <span class="tempo-target">目標 <span class="figure tempo-target-num">{{ props.targetBpm }}</span></span>
      </p>
    </div>
    <div class="tempo-steps">
      <button
        v-for="delta in steps"
        :key="delta"
        type="button"
        class="btn tempo-step"
        :disabled="props.disabled"
        :aria-label="delta > 0 ? `加快 ${delta}` : `放慢 ${-delta}`"
        @click="nudge(delta)"
      >
        {{ stepLabel(delta) }}
      </button>
    </div>
    <p v-if="showFastest" class="tempo-fastest small">
      這個節奏型裡最短的音，相當於原節奏的
      <span class="figure tempo-fastest-num">{{ fastest }}</span>
    </p>
  </div>
</template>

<style scoped>
.tempo {
  display: grid;
  gap: 0.6rem;
}

.tempo-main {
  display: flex;
  align-items: center;
  gap: 0.9rem;
}

.tempo-num {
  width: 3.2ch;
  min-width: 7rem;
  padding: 0;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  font-size: 4.25rem;
  line-height: 1;
  text-align: left;
  appearance: textfield;
  -moz-appearance: textfield;
}

.tempo-num::-webkit-inner-spin-button,
.tempo-num::-webkit-outer-spin-button {
  appearance: none;
  margin: 0;
}

.tempo-num:focus {
  outline: 0;
  border-bottom-color: var(--brass);
}

.tempo-meta {
  display: grid;
  color: var(--ink-soft);
  line-height: 1.45;
}

.tempo-target {
  color: var(--brass);
  font-weight: 600;
}

.tempo-target-num {
  font-size: 1.25em;
}

.tempo-steps {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.4rem;
}

.tempo-step {
  padding: 0;
  font-size: var(--step-1);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  background: var(--paper);
  border-color: var(--line);
}

.tempo-fastest {
  padding: 0.5rem 0.7rem;
  border-left: 3px solid var(--brass);
  background: color-mix(in srgb, var(--brass) 12%, transparent);
}

.tempo-fastest-num {
  font-size: 1.3em;
}
</style>
