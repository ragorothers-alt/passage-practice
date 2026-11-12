<script setup lang="ts">
import { reactive } from 'vue'
import type { NewPiece } from '@/data/repo'
import { INSTRUMENT_NAMES, type Instrument } from '@/domain/types'

const props = defineProps<{
  initial?: NewPiece
  submitLabel: string
}>()

const emit = defineEmits<{
  submit: [piece: NewPiece]
  cancel: []
}>()

const form = reactive<NewPiece>({
  title: props.initial?.title ?? '',
  composer: props.initial?.composer ?? '',
  instrument: props.initial?.instrument ?? 'piano',
})

const instruments = Object.entries(INSTRUMENT_NAMES) as [Instrument, string][]

function submit() {
  const title = form.title.trim()
  if (!title) return
  emit('submit', { title, composer: form.composer.trim(), instrument: form.instrument })
}
</script>

<template>
  <form class="stack" @submit.prevent="submit">
    <label class="field">
      <span class="field-label">曲名</span>
      <input v-model="form.title" class="input" required autocomplete="off" placeholder="例如：第三號敘事曲">
    </label>
    <label class="field">
      <span class="field-label">作曲家</span>
      <input v-model="form.composer" class="input" autocomplete="off" placeholder="可以不填">
    </label>
    <div class="field">
      <span class="field-label">樂器</span>
      <div class="segments" role="radiogroup" aria-label="樂器">
        <button
          v-for="[value, name] in instruments"
          :key="value"
          type="button"
          class="segment"
          role="radio"
          :aria-checked="form.instrument === value"
          @click="form.instrument = value"
        >
          {{ name }}
        </button>
      </div>
    </div>
    <div class="row">
      <button type="submit" class="btn btn-primary">
        {{ props.submitLabel }}
      </button>
      <button type="button" class="btn btn-quiet" @click="emit('cancel')">
        取消
      </button>
    </div>
  </form>
</template>
