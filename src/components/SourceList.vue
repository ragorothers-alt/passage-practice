<script setup lang="ts">
import { useTemplateRef } from 'vue'
import type { Source } from '@/domain/types'

const props = defineProps<{
  sources: Source[]
  busy: boolean
  error: string
}>()

const emit = defineEmits<{
  add: [files: File[]]
  crop: [source: Source]
  remove: [source: Source]
}>()

const input = useTemplateRef<HTMLInputElement>('input')

function onPick(event: Event) {
  const el = event.target as HTMLInputElement
  const files = Array.from(el.files ?? [])
  el.value = ''
  if (files.length > 0) emit('add', files)
}
</script>

<template>
  <div class="stack">
    <ul v-if="props.sources.length > 0" class="sources">
      <li v-for="source in props.sources" :key="source.id" class="source sheet">
        <div class="source-text">
          <p class="source-name">
            {{ source.name }}
          </p>
          <p class="soft small">
            {{ source.kind === 'pdf' ? `PDF，共 ${source.pageCount} 頁` : '圖片' }}
          </p>
        </div>
        <div class="row">
          <button class="btn btn-primary" @click="emit('crop', source)">
            框選樂段
          </button>
          <button class="btn btn-danger" @click="emit('remove', source)">
            移除
          </button>
        </div>
      </li>
    </ul>

    <p v-if="props.error" class="source-error" role="alert">
      {{ props.error }}
    </p>

    <div class="row">
      <button class="btn" :disabled="props.busy" @click="input?.click()">
        {{ props.busy ? '讀取中…' : '加入樂譜（PDF 或照片）' }}
      </button>
      <input
        ref="input"
        type="file"
        accept="application/pdf,image/*"
        multiple
        hidden
        @change="onPick"
      >
    </div>
  </div>
</template>

<style scoped>
.sources {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.6rem;
}

.source {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.8rem 1rem;
}

.source-text {
  min-width: 0;
}

.source-name {
  font-weight: 600;
  overflow-wrap: anywhere;
}

.source-error {
  color: var(--felt);
  font-weight: 600;
}
</style>
