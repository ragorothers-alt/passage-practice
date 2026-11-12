<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useObjectUrls } from '@/composables/useObjectUrls'
import { dueText, patternTitleOf } from '@/domain/describe'
import type { Passage } from '@/domain/types'

const props = defineProps<{
  passage: Passage
  /** 顯示在樂段名稱上方的曲名；在曲目頁裡不需要 */
  pieceTitle?: string
  today: string
}>()

const thumbs = useObjectUrls(() => props.passage.crops.slice(0, 1))

const practiced = computed(() => props.passage.lastPracticedAt !== null)
const pattern = computed(() => patternTitleOf(props.passage.groupSize, props.passage.patternId))
const due = computed(() => dueText(props.passage.due, props.today))
const overdue = computed(() => props.passage.due < props.today)
</script>

<template>
  <RouterLink :to="{ name: 'practice', params: { passageId: props.passage.id } }" class="passage sheet">
    <div class="passage-score">
      <img v-if="thumbs[0]" :src="thumbs[0]" alt="" class="passage-img">
      <span v-else class="soft small">沒有譜面圖片</span>
    </div>
    <div class="passage-text">
      <p v-if="props.pieceTitle" class="soft small">
        {{ props.pieceTitle }}
      </p>
      <h3 class="passage-title">
        {{ props.passage.title }}
      </h3>
      <p v-if="props.passage.lastNote" class="small passage-note">
        上次留下：{{ props.passage.lastNote }}
      </p>
      <p v-else-if="props.passage.focus" class="small">
        注意：{{ props.passage.focus }}
      </p>
      <p class="small soft">
        <template v-if="practiced">
          上次練「{{ pattern }}」到
          <span class="figure passage-num">{{ props.passage.currentBpm }}</span>，目標
          <span class="figure passage-num">{{ props.passage.targetBpm }}</span>
        </template>
        <template v-else>
          還沒練過，目標 <span class="figure passage-num">{{ props.passage.targetBpm }}</span>
        </template>
      </p>
    </div>
    <p class="passage-due small" :class="{ 'passage-overdue': overdue }">
      {{ due }}
    </p>
  </RouterLink>
</template>

<style scoped>
.passage {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0.75rem;
  padding: 0.9rem;
  text-decoration: none;
  position: relative;
}

.passage-score {
  height: 5.5rem;
  overflow: hidden;
  display: grid;
  align-items: center;
  background: #fff;
  border-bottom: 1px solid var(--line);
}

.passage-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: left center;
}

.passage-title {
  margin: 0;
  font-size: var(--step-1);
  font-weight: 700;
  line-height: 1.3;
}

.passage-note {
  color: var(--felt-deep);
  font-weight: 600;
}

.passage-num {
  font-size: 1.15em;
  color: var(--ink);
}

.passage-due {
  position: absolute;
  top: 0.9rem;
  right: 0.9rem;
  padding: 0.1em 0.6em;
  background: var(--ink);
  color: var(--paper);
  border-radius: 2px;
  font-weight: 600;
}

.passage-overdue {
  background: var(--felt);
}

@media (min-width: 40rem) {
  .passage {
    grid-template-columns: 16rem minmax(0, 1fr);
    align-items: center;
  }

  .passage-score {
    border-bottom: 0;
    border-right: 1px solid var(--line);
  }
}
</style>
