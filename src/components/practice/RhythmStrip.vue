<script setup lang="ts">
import { computed } from 'vue'
import type { RhythmPattern } from '@/domain/rhythm'

const props = defineProps<{
  pattern: RhythmPattern
  /** 目前響到第幾個音，沒有在響時是 -1 */
  activeIndex: number
  /** 預備拍還剩幾拍 */
  countIn: number
}>()

const description = computed(() => {
  const parts = props.pattern.notes.map((n) => {
    const length = n.weight > 1 ? '長' : '短'
    return n.accent ? `${length}（重音）` : length
  })
  return `節奏型：${parts.join('、')}`
})
</script>

<template>
  <div class="strip" role="img" :aria-label="description">
    <span
      v-for="(note, index) in props.pattern.notes"
      :key="index"
      class="note"
      :class="{
        'note-accent': note.accent,
        'note-start': note.groupStart && index > 0,
        'note-on': index === props.activeIndex,
      }"
      :style="{ flexGrow: note.weight }"
    />
    <p v-if="props.countIn > 0" class="strip-count">
      預備 <span class="figure strip-count-num">{{ props.countIn }}</span>
    </p>
  </div>
</template>

<style scoped>
/*
 * 每個音是一塊，寬度就是它的長度；重音的音比較高、用呢絨紅。
 * 這是整個 App 唯一用力的視覺元素，其他地方都保持安靜。
 */
.strip {
  position: relative;
  display: flex;
  align-items: flex-end;
  gap: 5px;
  height: 5.5rem;
  padding: 0.6rem 0.75rem;
  background: var(--ink);
  border-radius: 4px;
}

.note {
  flex: 1 1 0;
  min-width: 0;
  height: 52%;
  background: color-mix(in srgb, var(--paper) 38%, var(--ink));
  border-radius: 2px;
  transition: background-color 0.18s ease-out;
}

.note-accent {
  height: 100%;
  background: color-mix(in srgb, var(--felt) 70%, var(--ink));
}

.note-start {
  margin-left: 0.6rem;
}

.note-on {
  background: var(--paper);
  transition-duration: 0s;
}

.note-accent.note-on {
  background: #ff5d73;
}

.strip-count {
  position: absolute;
  inset: 0;
  display: grid;
  grid-auto-flow: column;
  place-content: center;
  align-items: baseline;
  gap: 0.5rem;
  background: rgb(28 43 39 / 88%);
  color: var(--paper);
  font-weight: 600;
  border-radius: 4px;
}

.strip-count-num {
  font-size: var(--step-3);
  line-height: 1;
}
</style>
