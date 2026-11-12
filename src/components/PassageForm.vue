<script setup lang="ts">
import { reactive } from 'vue'
import { clampBpm } from '@/domain/describe'
import { GROUP_SIZES, type GroupSize } from '@/domain/rhythm'

export interface PassageFields {
  title: string
  focus: string
  groupSize: GroupSize
  targetBpm: number
  currentBpm: number
}

const props = defineProps<{
  initial?: Partial<PassageFields>
  submitLabel: string
  busy?: boolean
}>()

const emit = defineEmits<{
  submit: [fields: PassageFields]
  cancel: []
}>()

const form = reactive<PassageFields>({
  title: props.initial?.title ?? '',
  focus: props.initial?.focus ?? '',
  groupSize: props.initial?.groupSize ?? 4,
  targetBpm: props.initial?.targetBpm ?? 60,
  currentBpm: props.initial?.currentBpm ?? 40,
})

function submit() {
  const title = form.title.trim()
  if (!title) return
  const targetBpm = clampBpm(form.targetBpm)
  emit('submit', {
    title,
    focus: form.focus.trim(),
    groupSize: form.groupSize,
    targetBpm,
    currentBpm: Math.min(targetBpm, clampBpm(form.currentBpm)),
  })
}
</script>

<template>
  <form class="stack" @submit.prevent="submit">
    <label class="field">
      <span class="field-label">樂段名稱</span>
      <input v-model="form.title" class="input" required autocomplete="off" placeholder="例如：第 116 小節起 右手">
    </label>
    <label class="field">
      <span class="field-label">主要卡在哪裡</span>
      <input v-model="form.focus" class="input" autocomplete="off" placeholder="例如：轉指不順、換把不準、音不均勻">
      <span class="field-hint">可以不填。下次打開時會提醒你這段要注意什麼。</span>
    </label>
    <div class="field">
      <span class="field-label">幾個音一組</span>
      <div class="segments" role="radiogroup" aria-label="幾個音一組">
        <button
          v-for="n in GROUP_SIZES"
          :key="n"
          type="button"
          class="segment figure"
          role="radio"
          :aria-checked="form.groupSize === n"
          @click="form.groupSize = n"
        >
          {{ n }}
        </button>
      </div>
      <span class="field-hint">一拍裡有幾個音。十六分音符通常是 4，三連音是 3，6/8 拍的十六分音符是 6。之後可以隨時改。</span>
    </div>
    <div class="tempo-fields">
      <label class="field">
        <span class="field-label">目標速度</span>
        <input v-model.number="form.targetBpm" class="input figure" type="number" inputmode="numeric" min="20" max="240" required>
      </label>
      <label class="field">
        <span class="field-label">起始速度</span>
        <input v-model.number="form.currentBpm" class="input figure" type="number" inputmode="numeric" min="20" max="240" required>
      </label>
    </div>
    <span class="field-hint">速度以「一組音為一拍」計算，單位是每分鐘幾拍。</span>
    <div class="row">
      <button type="submit" class="btn btn-primary" :disabled="props.busy">
        {{ props.busy ? '儲存中…' : props.submitLabel }}
      </button>
      <button type="button" class="btn btn-quiet" :disabled="props.busy" @click="emit('cancel')">
        取消
      </button>
    </div>
  </form>
</template>

<style scoped>
.tempo-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--gap);
}
</style>
