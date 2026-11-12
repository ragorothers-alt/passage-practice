<script setup lang="ts">
import { computed } from 'vue'
import type { LadderConfig, LadderState } from '@/domain/ladder'

const props = defineProps<{
  config: LadderConfig
  /** 階梯沒開時是 null */
  state: LadderState | null
}>()

const emit = defineEmits<{
  result: [value: 'clean' | 'miss']
}>()

const enabled = defineModel<boolean>('enabled', { required: true })

const dots = computed(() =>
  Array.from({ length: props.config.cleanReps }, (_, i) => i < (props.state?.streak ?? 0)),
)

const status = computed(() => {
  const s = props.state
  if (!s) return ''
  if (s.done) return `已在目標速度 ${props.config.targetBpm} 連續通過。可以結束並記錄，或換一種練法。`
  if (s.misses > 0) return '再錯一次會退一階。放慢一點沒關係。'
  return `連續 ${props.config.cleanReps} 次乾淨就加 ${props.config.step}，直到目標 ${props.config.targetBpm}。`
})
</script>

<template>
  <div class="ladder">
    <label class="ladder-toggle">
      <input v-model="enabled" type="checkbox" class="ladder-checkbox">
      <span class="field-label">速度階梯</span>
    </label>

    <template v-if="props.state">
      <p class="small ladder-status" :class="{ 'ladder-done': props.state.done }" aria-live="polite">
        {{ status }}
      </p>
      <div class="ladder-row">
        <div class="ladder-dots" :aria-label="`已連續乾淨 ${props.state.streak} 次`" role="img">
          <span v-for="(filled, i) in dots" :key="i" class="ladder-dot" :class="{ 'ladder-dot-on': filled }" />
        </div>
        <button type="button" class="btn ladder-clean" @click="emit('result', 'clean')">
          乾淨
        </button>
        <button type="button" class="btn ladder-miss" @click="emit('result', 'miss')">
          有錯
        </button>
      </div>
    </template>
    <p v-else class="small soft">
      每彈完一次自己判斷乾不乾淨，連續乾淨才加速。
    </p>
  </div>
</template>

<style scoped>
.ladder {
  display: grid;
  gap: 0.6rem;
}

.ladder-toggle {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-height: 2.5rem;
  cursor: pointer;
}

.ladder-checkbox {
  width: 1.4rem;
  height: 1.4rem;
  margin: 0;
  accent-color: var(--ink);
}

.ladder-status {
  color: var(--ink-soft);
  line-height: 1.5;
}

.ladder-done {
  color: var(--pine);
  font-weight: 600;
}

.ladder-row {
  display: grid;
  grid-template-columns: auto 1fr 1fr;
  align-items: center;
  gap: 0.5rem;
}

.ladder-dots {
  display: flex;
  gap: 0.35rem;
  padding-right: 0.3rem;
}

.ladder-dot {
  width: 0.85rem;
  height: 0.85rem;
  border: 2px solid var(--pine);
  border-radius: 50%;
}

.ladder-dot-on {
  background: var(--pine);
}

.ladder-clean {
  min-height: 3.5rem;
  border-color: var(--pine);
  background: var(--pine);
  color: #fff;
  font-size: var(--step-1);
}

.ladder-miss {
  min-height: 3.5rem;
  background: var(--paper);
  font-size: var(--step-1);
}
</style>
