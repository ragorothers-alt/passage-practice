<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import BaseDialog from '@/components/BaseDialog.vue'
import PageCropper from '@/components/PageCropper.vue'
import PassageForm, { type PassageFields } from '@/components/PassageForm.vue'
import { db } from '@/data/db'
import { describeSaveError } from '@/data/errors'
import { type LoadedPages, cropPage, loadPages } from '@/data/pages'
import { repo } from '@/data/repo'
import type { CropRect, PassageOriginPart, Source } from '@/domain/types'

const props = defineProps<{
  pieceId: string
  sourceId: string
}>()

const router = useRouter()

const source = shallowRef<Source | null>(null)
const pages = shallowRef<LoadedPages | null>(null)
const loadError = shallowRef('')
const page = shallowRef(1)

/**
 * 每一頁各自的框，換頁時保留，所以一個樂段可以跨頁。
 * 用 shallowRef 讓裡面維持普通物件：響應式代理物件無法寫進 IndexedDB。
 */
const rectsByPage = shallowRef<Record<number, CropRect[]>>({})

const currentRects = computed({
  get: () => rectsByPage.value[page.value] ?? [],
  set: (next) => { rectsByPage.value = { ...rectsByPage.value, [page.value]: next } },
})

/** 依頁碼、再依由上到下的順序排好，這就是練習時譜面的顯示順序 */
const parts = computed<PassageOriginPart[]>(() =>
  Object.entries(rectsByPage.value)
    .map(([p, rects]) => ({ page: Number(p), rects: [...rects].sort((a, b) => a.y - b.y) }))
    .filter(part => part.rects.length > 0)
    .sort((a, b) => a.page - b.page),
)

const total = computed(() => parts.value.reduce((n, part) => n + part.rects.length, 0))
const summary = computed(() => {
  if (total.value === 0) return '還沒有框'
  const pageNote = parts.value.length > 1 ? `，跨 ${parts.value.length} 頁` : ''
  return `已框 ${total.value} 個範圍${pageNote}`
})

onMounted(async () => {
  try {
    const found = await db.sources.get(props.sourceId)
    if (!found) {
      loadError.value = '找不到這份樂譜，可能已經被移除。'
      return
    }
    source.value = found
    const loaded = await loadPages(found.kind, found.blob)
    pages.value = loaded
    page.value = Math.min(Math.max(1, found.lastPage), loaded.pageCount)
    // 先放一個框，讓第一次使用的人知道要拖什麼
    rectsByPage.value = { [page.value]: [{ x: 0.03, y: 0.06, w: 0.94, h: 0.13 }] }
  }
  catch {
    loadError.value = '無法開啟這份樂譜。檔案可能損壞或有密碼保護，請重新上傳。'
  }
})

onBeforeUnmount(() => pages.value?.close())

function goTo(next: number) {
  const count = pages.value?.pageCount ?? 1
  if (!Number.isFinite(next)) return
  page.value = Math.min(count, Math.max(1, Math.round(next)))
  void repo.setSourcePage(props.sourceId, page.value)
}

function onPageInput(event: Event) {
  goTo(Number((event.target as HTMLInputElement).value))
}

const naming = shallowRef(false)
const saving = shallowRef(false)
const saveError = shallowRef('')

async function save(fields: PassageFields) {
  const loaded = pages.value
  if (!loaded || total.value === 0) return
  saving.value = true
  saveError.value = ''
  try {
    const crops: Blob[] = []
    for (const part of parts.value) {
      crops.push(...await cropPage(loaded, part.page, part.rects))
    }
    const passage = await repo.createPassage({
      pieceId: props.pieceId,
      crops,
      origin: { sourceId: props.sourceId, parts: parts.value },
      ...fields,
    })
    await router.replace({ name: 'practice', params: { passageId: passage.id } })
  }
  catch (err) {
    saveError.value = describeSaveError(err, '建立樂段')
    saving.value = false
  }
}
</script>

<template>
  <div class="crop">
    <header class="crop-bar">
      <RouterLink class="btn btn-quiet crop-back" :to="{ name: 'piece', params: { pieceId: props.pieceId } }">
        返回
      </RouterLink>
      <p class="crop-name">
        {{ source?.name }}
      </p>
      <div v-if="pages && pages.pageCount > 1" class="row crop-pager">
        <button class="btn" :disabled="page <= 1" aria-label="上一頁" @click="goTo(page - 1)">
          上一頁
        </button>
        <label class="crop-page">
          <span class="small">第</span>
          <input
            class="input figure crop-page-input"
            type="number"
            inputmode="numeric"
            min="1"
            :max="pages.pageCount"
            :value="page"
            aria-label="頁碼"
            @change="onPageInput"
          >
          <span class="small">／<span class="figure">{{ pages.pageCount }}</span> 頁</span>
        </label>
        <button class="btn" :disabled="page >= pages.pageCount" aria-label="下一頁" @click="goTo(page + 1)">
          下一頁
        </button>
      </div>
      <div class="row crop-next">
        <span class="small crop-summary">{{ summary }}</span>
        <button class="btn btn-primary" :disabled="total === 0" @click="naming = true">
          用這些範圍建立樂段
        </button>
      </div>
    </header>

    <div v-if="loadError" class="page">
      <div class="empty">
        <p>{{ loadError }}</p>
        <RouterLink class="btn" :to="{ name: 'piece', params: { pieceId: props.pieceId } }">
          回到曲目
        </RouterLink>
      </div>
    </div>
    <PageCropper v-else-if="pages" v-model:rects="currentRects" class="crop-body" :pages="pages" :page="page" />
    <p v-else class="crop-loading soft">
      開啟樂譜中…
    </p>

    <BaseDialog v-model:open="naming" title="建立樂段">
      <p v-if="saveError" class="crop-error" role="alert">
        {{ saveError }}
      </p>
      <PassageForm submit-label="建立並開始練習" :busy="saving" @submit="save" @cancel="naming = false" />
    </BaseDialog>
  </div>
</template>

<style scoped>
.crop {
  height: 100dvh;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
}

.crop-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1rem;
  padding: 0.5rem 1rem;
  background: var(--paper);
  border-bottom: 1px solid var(--line);
}

.crop-back {
  padding-inline: 0.5em;
}

.crop-name {
  flex: 1 1 8rem;
  min-width: 0;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.crop-page {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.crop-page-input {
  width: 4.5rem;
  text-align: center;
}

.crop-next {
  margin-left: auto;
}

.crop-summary {
  color: var(--ink-soft);
}

.crop-body {
  min-height: 0;
}

.crop-loading {
  padding: 2rem;
  text-align: center;
}

.crop-error {
  color: var(--felt);
  font-weight: 600;
}
</style>
