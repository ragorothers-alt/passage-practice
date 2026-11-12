<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { intervalText } from '@/domain/describe'
import { type ColdTest, type Rating, nextInterval } from '@/domain/schedule'
import { RATING_NAMES } from '@/domain/types'

const props = defineProps<{
  intervalDays: number
  coldTest: ColdTest | null
  busy: boolean
  error: string
}>()

const emit = defineEmits<{
  save: [result: { rating: Rating, note: string }]
  cancel: []
}>()

const rating = shallowRef<Rating | null>(null)
const note = shallowRef('')

const ratings = Object.entries(RATING_NAMES) as [Rating, string][]

const nextReview = computed(() =>
  rating.value ? intervalText(nextInterval(props.intervalDays, rating.value, props.coldTest)) : '',
)

function save() {
  if (!rating.value) return
  emit('save', { rating: rating.value, note: note.value.trim() })
}
</script>

<template>
  <form class="stack" @submit.prevent="save">
    <div class="field">
      <span class="field-label">這次練完，回到原節奏彈起來如何？</span>
      <div class="segments" role="radiogroup" aria-label="自評">
        <button
          v-for="[value, name] in ratings"
          :key="value"
          type="button"
          class="segment finish-rating"
          role="radio"
          :aria-checked="rating === value"
          @click="rating = value"
        >
          {{ name }}
        </button>
      </div>
      <span v-if="nextReview" class="field-hint" aria-live="polite">
        下次複習：{{ nextReview }}
      </span>
    </div>
    <label class="field">
      <span class="field-label">還沒解決的地方</span>
      <textarea v-model="note" class="input" rows="2" placeholder="可以不填。例如：第二組進第三組會停頓" />
    </label>
    <p v-if="props.error" class="finish-error" role="alert">
      {{ props.error }}
    </p>
    <div class="row">
      <button type="submit" class="btn btn-primary" :disabled="!rating || props.busy">
        {{ props.busy ? '儲存中…' : '儲存紀錄' }}
      </button>
      <button type="button" class="btn btn-quiet" :disabled="props.busy" @click="emit('cancel')">
        繼續練
      </button>
    </div>
  </form>
</template>

<style scoped>
.finish-rating {
  flex: 1;
  min-height: 3.5rem;
}

.finish-error {
  color: var(--felt);
  font-weight: 600;
}
</style>
