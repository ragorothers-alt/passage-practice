<script setup lang="ts">
import { useObjectUrls } from '@/composables/useObjectUrls'

const props = defineProps<{ crops: Blob[] }>()

const urls = useObjectUrls(() => props.crops)
</script>

<template>
  <div class="score">
    <div v-if="urls.length > 0" class="score-sheet sheet">
      <img v-for="(url, index) in urls" :key="url" :src="url" :alt="`譜面第 ${index + 1} 行`" class="score-img">
    </div>
    <p v-else class="score-empty soft">
      這個樂段沒有譜面圖片，請看紙本樂譜。
    </p>
  </div>
</template>

<style scoped>
.score {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.score-sheet {
  display: grid;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #fff;
}

.score-img {
  width: 100%;
  height: auto;
}

.score-empty {
  padding: 2rem 1rem;
  border: 1.5px dashed var(--line);
  border-radius: var(--radius);
  text-align: center;
}
</style>
